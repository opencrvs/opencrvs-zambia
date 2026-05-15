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
import { capitalize } from 'lodash'

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
    await mosipInteropClient.register({
      trackingId: event.trackingId,
      requestFields: {
        birthCertificateNumber: registrationNumber,
        IDSchemaVersion: 3.101,
        fullName:
          '[ {\n  "language" : "eng",\n  "value" : "' +
          [childName?.firstname, childName?.middlename, childName?.surname]
            .filter(Boolean)
            .join(' ') +
          '"\n}]',

        dateOfBirth: declaration['child.dob']?.toString().replaceAll('-', '/'),
        gender:
          '[ {\n  "language" : "eng",\n  "value" : "' +
          capitalize(declaration['child.gender'] as string) +
          '"\n}]',
        addressLine1:
          '[ {\n  "language" : "eng",\n  "value" : "Placeholder"\n}]',
        addressLine2:
          '[ {\n  "language" : "eng",\n  "value" : "Placeholder"\n}]',
        addressLine3:
          '[ {\n  "language" : "eng",\n  "value" : "Placeholder"\n}]',
        region: '[ {\n  "language" : "eng",\n  "value" : "Placeholder"\n}]',
        province: '[ {\n  "language" : "eng",\n  "value" : "Placeholder"\n}]',
        city: '[ {\n  "language" : "eng",\n  "value" : "Placeholder"\n}]',
        zone: '[ {\n  "language" : "eng",\n  "value" : "Placeholder"\n}]',
        postalCode: 'NA',
        phone: '7790075085',
        email: 'pyry@opencrvs.org',
        proofOfIdentity:
          '{\n  "format" : "none",\n  "type" : "proofOfIdentity",\n  "value" : "placeholder",\n  "refNumber" : null\n}',
        individualBiometrics:
          '{\n  "format" : "none",\n  "version" : 0,\n  "value" : "placeholder"\n}',
        preferredLang: 'eng'
      },
      notification: {
        recipientEmail: 'pyry@opencrvs.org',
        recipientFullName: 'Pyry Rouvila',
        recipientPhone: '7790075085'
      },
      metaInfo: {
        metaData:
          '[{\n  "label" : "registrationType",\n  "value" : "NEW"\n}, {\n  "label" : "machineId",\n  "value" : "20042"\n}, {\n  "label" : "centerId",\n  "value" : "10001"\n}]',
        registrationId: '10001100620007420250522121835',
        operationsData:
          '[ {\n  "label" : "officerId",\n  "value" : "crvs1"\n}, {\n  "label" : "officerBiometricFileName",\n  "value" : null\n}, {\n  "label" : "supervisorId",\n  "value" : null\n}, {\n  "label" : "supervisorBiometricFileName",\n  "value" : null\n}, {\n  "label" : "supervisorPassword",\n  "value" : "false"\n}, {\n  "label" : "officerPassword",\n  "value" : "true"\n}, {\n  "label" : "supervisorPIN",\n  "value" : null\n}, {\n  "label" : "officerPIN",\n  "value" : null\n}, {\n  "label" : "supervisorOTPAuthentication",\n  "value" : "false"\n}, {\n  "label" : "officerOTPAuthentication",\n  "value" : "false"\n} ]',
        capturedRegisteredDevices: '[]',
        creationDate: '20250225110733'
      },
      audit: {
        uuid: 'c75s4521-87d6-6a4x-balw-2432e2355440',
        createdAt: '2025-02-25T13:22:49.214Z',
        eventId: 'REG-EVT-066',
        eventName: 'PACKET_CREATION_SUCCESS',
        eventType: 'USER',
        hostName: 'DESKTOP-JL4BAEV',
        hostIp: 'localhost',
        applicationId: 'REG',
        applicationName: 'REGISTRATION',
        sessionUserId: 'crvs',
        sessionUserName: 'crvs',
        id: '10001100620007420250522121835',
        idType: 'REGISTRATION_ID',
        createdBy: 'crvs',
        moduleName: 'Packet Handler',
        moduleId: 'REG-MOD-117',
        description: 'Packet Succesfully Created',
        actionTimeStamp: '2025-02-25T07:52:49.214Z'
      },
      schemaJson: `{"$schema":"http://json-schema.org/draft-07/schema#","description":"MOSIP Sample identity","additionalProperties":false,"title":"MOSIP identity","type":"object","definitions":{"simpleType":{"uniqueItems":true,"additionalItems":false,"type":"array","items":{"additionalProperties":false,"type":"object","required":["language","value"],"properties":{"language":{"type":"string"},"value":{"type":"string"}}}},"documentType":{"additionalProperties":false,"type":"object","properties":{"format":{"type":"string"},"type":{"type":"string"},"value":{"type":"string"},"refNumber":{"type":["string","null"]}}},"biometricsType":{"additionalProperties":false,"type":"object","properties":{"format":{"type":"string"},"version":{"type":"number","minimum":0},"value":{"type":"string"}}}},"properties":{"identity":{"additionalProperties":false,"type":"object","required":["IDSchemaVersion","fullName","dateOfBirth","gender","addressLine1","addressLine2","addressLine3","region","province","city","zone","postalCode","phone","email","proofOfIdentity","individualBiometrics"],"properties":{"proofOfAddress":{"bioAttributes":[],"fieldCategory":"pvt","format":"none","fieldType":"default","$ref":"#/definitions/documentType"},"gender":{"bioAttributes":[],"fieldCategory":"pvt","format":"","fieldType":"default","$ref":"#/definitions/simpleType"},"city":{"bioAttributes":[],"validators":[{"validator":"^(?=.{0,50}$).*","arguments":[],"type":"regex"}],"fieldCategory":"pvt","format":"none","fieldType":"default","$ref":"#/definitions/simpleType"},"postalCode":{"bioAttributes":[],"validators":[{"validator":"^[(?i)A-Z0-9]{5}$|^NA$","arguments":[],"type":"regex"}],"fieldCategory":"pvt","format":"none","type":"string","fieldType":"default"},"proofOfException-1":{"bioAttributes":[],"fieldCategory":"evidence","format":"none","fieldType":"default","$ref":"#/definitions/documentType"},"referenceIdentityNumber":{"bioAttributes":[],"validators":[{"validator":"^([0-9]{10,30})$","arguments":[],"type":"regex"}],"fieldCategory":"pvt","format":"kyc","type":"string","fieldType":"default"},"individualBiometrics":{"bioAttributes":["leftEye","rightEye","rightIndex","rightLittle","rightRing","rightMiddle","leftIndex","leftLittle","leftRing","leftMiddle","leftThumb","rightThumb","face"],"fieldCategory":"pvt","format":"none","fieldType":"default","$ref":"#/definitions/biometricsType"},"province":{"bioAttributes":[],"validators":[{"validator":"^(?=.{0,50}$).*","arguments":[],"type":"regex"}],"fieldCategory":"pvt","format":"none","fieldType":"default","$ref":"#/definitions/simpleType"},"zone":{"bioAttributes":[],"fieldCategory":"pvt","format":"none","fieldType":"default","$ref":"#/definitions/simpleType"},"proofOfDateOfBirth":{"bioAttributes":[],"fieldCategory":"pvt","format":"none","fieldType":"default","$ref":"#/definitions/documentType"},"addressLine1":{"bioAttributes":[],"validators":[{"validator":"^(?=.{0,50}$).*","arguments":[],"type":"regex"}],"fieldCategory":"pvt","format":"none","fieldType":"default","$ref":"#/definitions/simpleType"},"addressLine2":{"bioAttributes":[],"validators":[{"validator":"^(?=.{3,50}$).*","arguments":[],"type":"regex"}],"fieldCategory":"pvt","format":"none","fieldType":"default","$ref":"#/definitions/simpleType"},"residenceStatus":{"bioAttributes":[],"fieldCategory":"kyc","format":"none","fieldType":"default","$ref":"#/definitions/simpleType"},"addressLine3":{"bioAttributes":[],"validators":[{"validator":"^(?=.{3,50}$).*","arguments":[],"type":"regex"}],"fieldCategory":"pvt","format":"none","fieldType":"default","$ref":"#/definitions/simpleType"},"email":{"bioAttributes":[],"validators":[{"validator":"^[A-Za-z0-9_\\-]+(\\.[A-Za-z0-9_]+)*@[A-Za-z0-9_-]+(\\.[A-Za-z0-9_]+)*(\\.[a-zA-Z]{2,})$","arguments":[],"type":"regex"}],"fieldCategory":"pvt","format":"none","type":"string","fieldType":"default"},"introducerRID":{"bioAttributes":[],"fieldCategory":"evidence","format":"none","type":"string","fieldType":"default"},"introducerBiometrics":{"bioAttributes":["leftEye","rightEye","rightIndex","rightLittle","rightRing","rightMiddle","leftIndex","leftLittle","leftRing","leftMiddle","leftThumb","rightThumb","face"],"fieldCategory":"pvt","format":"none","fieldType":"default","$ref":"#/definitions/biometricsType"},"fullName":{"bioAttributes":[],"validators":[{"validator":"^(?=.{3,50}$).*","arguments":[],"type":"regex"}],"fieldCategory":"pvt","format":"none","fieldType":"default","$ref":"#/definitions/simpleType"},"dateOfBirth":{"bioAttributes":[],"validators":[{"validator":"^(1869|18[7-9][0-9]|19[0-9][0-9]|20[0-9][0-9])/([0][1-9]|1[0-2])/([0][1-9]|[1-2][0-9]|3[01])$","arguments":[],"type":"regex"}],"fieldCategory":"pvt","format":"none","type":"string","fieldType":"default"},"individualAuthBiometrics":{"bioAttributes":["leftEye","rightEye","rightIndex","rightLittle","rightRing","rightMiddle","leftIndex","leftLittle","leftRing","leftMiddle","leftThumb","rightThumb","face"],"fieldCategory":"pvt","format":"none","fieldType":"default","$ref":"#/definitions/biometricsType"},"introducerUIN":{"bioAttributes":[],"fieldCategory":"evidence","format":"none","type":"string","fieldType":"default"},"proofOfIdentity":{"bioAttributes":[],"fieldCategory":"pvt","format":"none","fieldType":"default","$ref":"#/definitions/documentType"},"IDSchemaVersion":{"bioAttributes":[],"fieldCategory":"none","format":"none","type":"number","fieldType":"default","minimum":0},"proofOfException":{"bioAttributes":[],"fieldCategory":"evidence","format":"none","fieldType":"default","$ref":"#/definitions/documentType"},"phone":{"bioAttributes":[],"validators":[{"validator":"^[+]*([0-9]{1})([0-9]{9})$","arguments":[],"type":"regex"}],"fieldCategory":"pvt","format":"none","type":"string","fieldType":"default"},"introducerName":{"bioAttributes":[],"fieldCategory":"evidence","format":"none","fieldType":"default","$ref":"#/definitions/simpleType"},"proofOfRelationship":{"bioAttributes":[],"fieldCategory":"pvt","format":"none","fieldType":"default","$ref":"#/definitions/documentType"},"UIN":{"bioAttributes":[],"fieldCategory":"none","format":"none","type":"string","fieldType":"default"},"preferredLang":{"bioAttributes":[],"fieldCategory":"pvt","format":"none","type":"string","fieldType":"dynamic"},"region":{"bioAttributes":[],"validators":[{"validator":"^(?=.{0,50}$).*","arguments":[],"type":"regex"}],"fieldCategory":"pvt","format":"none","fieldType":"default","$ref":"#/definitions/simpleType"}}}}}`
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
