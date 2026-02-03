/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * OpenCRVS is also distributed under the terms of the Civil Registration
 * & Healthcare Disclaimer located at http://opencrvs.org/license.
 *
 * Copyright (C) The OpenCRVS Authors located at https://github.com/opencrvs/opencrvs-core/blob/master/AUTHORS.
 */
import * as Hapi from '@hapi/hapi'
import { generateRegistrationNumber } from './registrationNumber'
import { createClient } from '@opencrvs/toolkit/api'
import {
  ActionInput,
  deepMerge,
  aggregateActionDeclarations,
  EventDocument,
  getPendingAction,
  NameFieldValue
} from '@opencrvs/toolkit/events'
import { GATEWAY_URL, MOSIP_INTEROP_URL } from '@countryconfig/constants'
import { v4 as uuidv4 } from 'uuid'
import { sendInformantNotification } from '../notification/informantNotification'
import { createMosipInteropClient } from '@opencrvs/mosip/api'
import { logger } from '@countryconfig/logger'
import {
  shouldForwardBirthRegistrationToMosip,
  shouldForwardDeathRegistrationToMosip
} from '@countryconfig/form/v2/mosip'

export interface ActionConfirmationRequest extends Hapi.Request {
  payload: EventDocument
}

/* eslint-disable no-unused-vars */

/**
 * Handler for event registration confirmation.
 *
 * This function is called when an event registration is initiated and demonstrates
 * how to implement an action confirmation handler for the REGISTER action type.
 *
 * Action confirmation handlers support three response patterns:
 *
 * - HTTP 200: Immediately accept the action. For registration actions, the response
 *   must include a registrationNumber in the payload: { registrationNumber: "..." }
 *
 * - HTTP 400: Immediately reject the action. The action will be marked as rejected.
 *
 * - HTTP 202: Defer the decision (asynchronous flow). The action enters a 'Requested' state
 *   until it is later explicitly accepted or rejected. When using this approach, you must
 *   store the token, actionId, eventId and action payload to use with the accept/reject API calls later.
 *
 * For registration actions specifically, when accepting asynchronously, you must provide
 * a registration number as shown in the acceptRequestedRegistration example below.
 *
 * @param {ActionConfirmationRequest} request - The request object.
 * @param {Hapi.ResponseToolkit} h - The response toolkit.
 * @returns {Hapi.Response} The response object. Should return HTTP 200, 202 or 400. With HTTP 200, the payload should contain the generated registration number.
 */
export async function onRegisterHandler(
  request: ActionConfirmationRequest,
  h: Hapi.ResponseToolkit
) {
  const token = request.auth.artifacts.token as string
  const event = request.payload
  const eventId = event.id
  const action = getPendingAction(event.actions)

  // OPTION 1: Immediate acceptance (HTTP 200)
  // Return HTTP 200 with a registration number to immediately accept the registration action.
  // This is the default implementation that automatically generates and assigns a registration number.

  const registrationNumber = generateRegistrationNumber()

  await sendInformantNotification({ event, token, registrationNumber })

  return h.response({ registrationNumber }).code(200)

  // OPTION 2: Immediate rejection (HTTP 400)
  // To reject the registration immediately, uncomment the following:
  //
  // return h.response({ reason: 'Rejection reason here' }).code(400)

  // OPTION 3: Deferred decision (HTTP 202)
  // To implement an asynchronous workflow where the decision is made later:
  // 1. Store the token, eventId, actionId, and action details in your system
  // 2. Return HTTP 202 to place the action in 'Requested' state
  // 3. Later call client.event.actions.register.accept.mutate() or client.event.actions.register.reject.mutate()
  //
  // Below is example of how to defer the confirmation, accepting it after a 10 second delay
  // To defer the confirmation, uncomment the following:
  //
  // setTimeout(() => {
  //   acceptRequestedRegistration(token, eventId, actionId, action)
  // }, 10000)
  // return h.response().code(202)
}

/**
 * Example function for asynchronously accepting a registration action.
 *
 * This should only be used when an action is in 'Requested' state (after returning HTTP 202
 * for the initial confirmation request). This function demonstrates how to accept a registration
 * that was previously placed in a pending state.
 *
 * For registration actions specifically, you must provide a registration number when accepting.
 * See the Action Confirmation documentation for more details on asynchronous confirmation flows.
 */
async function acceptRequestedRegistration(
  token: string,
  eventId: string,
  actionId: string,
  action: ActionInput
) {
  const url = new URL('events', GATEWAY_URL).toString()
  const client = createClient(url, `Bearer ${token}`)

  const event = await client.event.actions.register.accept.mutate({
    ...action,
    transactionId: uuidv4(),
    eventId,
    actionId,
    registrationNumber: generateRegistrationNumber()
  })

  return event
}

/**
 * Example function for asynchronously rejecting a registration action.
 *
 * This should only be used when an action is in 'Requested' state (after returning HTTP 202
 * for the initial confirmation request). This function demonstrates how to reject a registration
 * that was previously placed in a pending state.
 */
async function rejectRequestedRegistration(
  token: string,
  eventId: string,
  actionId: string
) {
  const url = new URL('events', GATEWAY_URL).toString()
  const client = createClient(url, `Bearer ${token}`)
  const event = await client.event.actions.register.reject.mutate({
    transactionId: uuidv4(),
    eventId,
    actionId
  })

  return event
}

async function requestRejection(
  token: string,
  eventId: string,
  actionId: string,
  reason?: string
) {
  const url = new URL('events', GATEWAY_URL).toString()
  const client = createClient(url, `Bearer ${token}`)
  const event = await client.event.actions.reject.request.mutate({
    transactionId: uuidv4(),
    eventId,
    actionId,
    content: { reason }
  })

  return event
}

function handleDeferredRejection(
  token: string,
  eventId: string,
  actionId: string,
  reason?: string
) {
  process.nextTick(async () => {
    await rejectRequestedRegistration(token, eventId, actionId)
    await requestRejection(token, eventId, actionId, reason)
  })
}

export async function onMosipBirthRegisterHandler(
  request: ActionConfirmationRequest,
  h: Hapi.ResponseToolkit
) {
  const token = request.auth.artifacts.token as string
  const event = request.payload
  const declaration = aggregateActionDeclarations(event)

  const registrationNumber = generateRegistrationNumber()
  const pendingAction = getPendingAction(event.actions)

  const { valid, reason } = shouldForwardBirthRegistrationToMosip(declaration)

  // TBD: Should we let user know if they should wait for MOSIP registration to complete or send notification here?
  // await sendInformantNotification({ event, token, registrationNumber })

  if (!valid) {
    handleDeferredRejection(token, event.id, pendingAction.id, reason)
    return h.response().code(202)
  }

  try {
    logger.info(
      'Passed country specified custom logic check for id creation. Forwarding to MOSIP...'
    )

    const declaration = deepMerge(
      aggregateActionDeclarations(event),
      pendingAction.declaration
    )

    const mosipInteropClient = createMosipInteropClient(
      MOSIP_INTEROP_URL,
      `Bearer ${token}`
    )

    const childName = declaration['child.name'] as NameFieldValue | undefined
    mosipInteropClient.register({
      trackingId: event.trackingId,
      requestFields: {
        birthCertificateNumber: registrationNumber,
        fullName: [
          childName?.firstname,
          childName?.middlename,
          childName?.surname
        ]
          .filter(Boolean)
          .join(' '),
        dateOfBirth: declaration['child.dob'],
        gender: declaration['child.gender']
      },
      notification: {
        recipientEmail: declaration['informant.email'] as string,
        recipientFullName: '@TODO',
        recipientPhone: '@TODO'
      },
      metaInfo: {},
      audit: {}
    })

    return h.response().code(202)
  } catch (error) {
    logger.error(error)
    handleDeferredRejection(
      token,
      event.id,
      pendingAction.id,
      'Unexpected error in OpenCRVS-MOSIP interoperability layer'
    )
    return h.response().code(202)
  }
}

export async function onMosipDeathRegisterHandler(
  request: ActionConfirmationRequest,
  h: Hapi.ResponseToolkit
) {
  const token = request.auth.artifacts.token as string
  const event = request.payload
  const declaration = aggregateActionDeclarations(event)

  const registrationNumber = generateRegistrationNumber()

  const { valid, reason } = shouldForwardDeathRegistrationToMosip(declaration)
  const pendingAction = getPendingAction(event.actions)

  // TBD: Should we let user know if they should wait for MOSIP registration to complete or send notification here?
  // await sendInformantNotification({ event, token, registrationNumber })

  if (!valid) {
    handleDeferredRejection(token, event.id, pendingAction.id, reason)
    return h.response().code(202)
  }

  try {
    logger.info(
      'Passed country specified custom logic check for id creation. Forwarding to MOSIP...'
    )

    const declaration = deepMerge(
      aggregateActionDeclarations(event),
      pendingAction.declaration
    )

    const mosipInteropClient = createMosipInteropClient(
      MOSIP_INTEROP_URL,
      `Bearer ${token}`
    )

    const deceasedName = declaration['deceased.name'] as
      | NameFieldValue
      | undefined

    mosipInteropClient.register({
      trackingId: event.trackingId,
      requestFields: {
        deathCertificateNumber: registrationNumber,
        fullName: [
          deceasedName?.firstname,
          deceasedName?.middlename,
          deceasedName?.surname
        ]
          .filter(Boolean)
          .join(' '),
        dateOfBirth: declaration['deceased.dob'],
        gender: declaration['deceased.gender'],
        nationalIdNumber: declaration['deceased.nid']
      },
      notification: {
        recipientEmail: declaration['informant.email'] as string,
        recipientFullName: '@TODO',
        recipientPhone: '@TODO'
      },
      metaInfo: {},
      audit: {}
    })

    return h.response().code(202)
  } catch (error) {
    logger.error(error)
    handleDeferredRejection(
      token,
      event.id,
      pendingAction.id,
      'Unexpected error in OpenCRVS-MOSIP interoperability layer'
    )
    return h.response().code(202)
  }
}
