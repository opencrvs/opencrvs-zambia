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
require('app-module-path').addPath(require('path').join(__dirname))
require('dotenv').config()

import StreamArray from 'stream-json/streamers/StreamArray'
import path from 'path'
import * as Hapi from '@hapi/hapi'
import * as Pino from 'hapi-pino'
import * as JWT from 'hapi-auth-jwt2'
import * as inert from '@hapi/inert'
import * as Sentry from 'hapi-sentry'
import fetch from 'node-fetch'
import {
  CLIENT_APP_URL,
  DOMAIN,
  LOGIN_URL,
  SENTRY_DSN,
  COUNTRY_CONFIG_HOST,
  COUNTRY_CONFIG_PORT,
  CHECK_INVALID_TOKEN,
  AUTH_URL,
  DEFAULT_TIMEOUT,
  GATEWAY_URL
} from '@countryconfig/constants'
import {
  contentHandler,
  countryLogoHandler
} from '@countryconfig/api/content/handler'
import decode from 'jwt-decode'
import { join } from 'path'
import { logger } from '@countryconfig/logger'
import { emailHandler, emailSchema } from './api/notification/handler'
import { ErrorContext } from 'hapi-auth-jwt2'
import { mapGeojsonHandler } from '@countryconfig/api/dashboards/handler'
import { formHandler } from '@countryconfig/form'
import { locationsHandler } from './data-seeding/locations/handler'
import { certificateHandler } from './api/certificates/handler'
import { rolesHandler } from './data-seeding/roles/handler'
import { usersHandler } from './data-seeding/employees/handler'
import { applicationConfigHandler } from './api/application/handler'
import { validatorsHandler } from './form/common/custom-validation-conditionals/validators-handler'
import { conditionalsHandler } from './form/common/custom-validation-conditionals/conditionals-handler'
import { COUNTRY_WIDE_CRUDE_DEATH_RATE } from './api/application/application-config'
import { handlebarsHandler } from './form/common/certificate/handlebars/handler'
import { trackingIDHandler } from './api/tracking-id/handler'
import { dashboardQueriesHandler } from './api/dashboards/handler'
import { fontsHandler } from './api/fonts/handler'
import { recordNotificationHandler } from './api/record-notification/handler'
import {
  getCustomEventsHandler,
  onAnyActionHandler,
  onBirthActionHandler,
  onDeathActionHandler
} from '@countryconfig/api/custom-event/handler'
import {
  ActionDocument,
  ActionStatus,
  ActionType,
  EventDocument
} from '@opencrvs/toolkit/events'
import { Event } from './form/types/types'
import {
  onMosipBirthRegisterHandler,
  onMosipDeathRegisterHandler
} from './api/registration'
import { workqueueconfigHandler } from './api/workqueue/handler'
import getUserNotificationRoutes from './config/routes/userNotificationRoutes'
import {
  importEvent,
  importEvents,
  importLocations,
  syncLocationLevels,
  syncLocationStatistics
} from './analytics/analytics'
import { getClient } from './analytics/postgres'
import { env } from './environment'
import { createClient } from '@opencrvs/toolkit/api'

export interface ITokenPayload {
  sub: string
  exp: string
  algorithm: string
  scope: string[]
}

export default function getPlugins() {
  const plugins: any[] = [inert, JWT]

  if (process.env.NODE_ENV === 'production') {
    plugins.push({
      plugin: Pino,
      options: {
        prettyPrint: false,
        logPayload: false,
        instance: logger
      }
    })
  }

  if (SENTRY_DSN) {
    plugins.push({
      plugin: Sentry,
      options: {
        client: {
          environment: process.env.NODE_ENV,
          dsn: SENTRY_DSN
        },
        catchLogErrors: true
      }
    })
  }

  return plugins
}

const getTokenPayload = (token: string): ITokenPayload => {
  let decoded: ITokenPayload
  try {
    decoded = decode(token)
  } catch (err) {
    throw new Error(
      `getTokenPayload: Error occurred during token decode : ${err}`
    )
  }
  return decoded
}

export function hasScope(token: string, scope: string) {
  const tokenPayload = getTokenPayload(token)
  return (tokenPayload.scope && tokenPayload.scope.indexOf(scope) > -1) || false
}

export const verifyToken = async (token: string, authUrl: string) => {
  const res = await fetch(`${authUrl}/verifyToken`, {
    method: 'POST',
    body: JSON.stringify({ token }),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  })

  const body = await res.json()

  if (body.valid === true) {
    return true
  }

  return false
}

const validateFunc = async (
  payload: any,
  request: Hapi.Request,
  checkInvalidToken: boolean,
  authUrl: string
) => {
  let valid
  if (checkInvalidToken) {
    valid = await verifyToken(
      request.headers.authorization.replace('Bearer ', ''),
      authUrl
    )
  }

  if (valid === true || !checkInvalidToken) {
    return {
      isValid: true,
      credentials: payload
    }
  }

  return {
    isValid: false
  }
}

async function getPublicKey(): Promise<string> {
  try {
    const response = await fetch(`${AUTH_URL}/.well-known`)
    return response.text()
  } catch (error) {
    logger.error(
      `Failed to fetch public key from Core. Make sure Core is running, and you are able to connect to ${AUTH_URL}/.well-known.`
    )
    if (process.env.NODE_ENV === 'production') {
      throw error
    }
    await new Promise((resolve) => setTimeout(resolve, 3000))
    return getPublicKey()
  }
}

export async function createServer() {
  let whitelist: string[] = [DOMAIN]
  if (DOMAIN[0] !== '*') {
    whitelist = [LOGIN_URL, CLIENT_APP_URL]
  }
  logger.info(`Whitelist: ${JSON.stringify(whitelist)}`)
  const server = new Hapi.Server({
    host: COUNTRY_CONFIG_HOST,
    port: COUNTRY_CONFIG_PORT,
    routes: {
      cors: { origin: whitelist },
      payload: { maxBytes: 52428800, timeout: DEFAULT_TIMEOUT }
    }
  })

  await server.register(getPlugins())

  let publicKey = await getPublicKey()
  let publicKeyUpdatedAt = Date.now()

  server.auth.strategy('jwt', 'jwt', {
    key: () => ({ key: publicKey }),
    errorFunc: (errorContext: ErrorContext) => {
      /*
       * If an incoming request fails with a 401 Unauthorized, we need to check if the
       * public key we have is still valid. If it is not, we fetch a new one.
       * This is done only once every minute to avoid invalid tokens spamming the server.
       */

      const moreThanAMinuteFromLatestUpdate =
        publicKeyUpdatedAt < Date.now() - 60000
      if (
        errorContext.errorType === 'unauthorized' &&
        moreThanAMinuteFromLatestUpdate
      ) {
        logger.info(
          'Request failed, fetching a new public key. This might either be a client with an outdated token or the server public key being outdated. Trying to update the server public key...'
        )
        getPublicKey()
          .then((newPublicKey) => {
            logger.info('Key fetched, updating')
            publicKeyUpdatedAt = Date.now()
            publicKey = newPublicKey
          })
          .catch((err) => {
            logger.error('Fetching a new public key failed', err)
          })
      }
      return errorContext
    },
    verifyOptions: {
      algorithms: ['RS256'],
      issuer: 'opencrvs:auth-service',
      audience: 'opencrvs:countryconfig-user'
    },
    validate: (payload: any, request: Hapi.Request) =>
      validateFunc(payload, request, CHECK_INVALID_TOKEN, AUTH_URL)
  })

  server.auth.default('jwt')

  server.route({
    method: 'GET',
    path: '/certificates/{id}',
    handler: certificateHandler,
    options: {
      tags: ['api', 'certificates'],
      description: 'Returns only one certificate metadata'
    }
  })

  server.route({
    method: 'GET',
    path: '/certificates',
    handler: certificateHandler,
    options: {
      tags: ['api', 'certificates'],
      description: 'Returns certificate metadata'
    }
  })

  // add ping route by default for health check
  server.route({
    method: 'GET',
    path: '/ping',
    // eslint-disable-next-line no-unused-vars
    handler: (request: any, h: any) => {
      // Perform any health checks and return true or false for success prop
      return {
        success: true
      }
    },
    options: {
      auth: false,
      tags: ['api'],
      description: 'Health check endpoint'
    }
  })

  server.route({
    method: 'GET',
    path: '/fonts/{filename}',
    handler: fontsHandler,
    options: {
      auth: false,
      tags: ['api'],
      description: 'Serves available fonts'
    }
  })

  server.route({
    method: 'GET',
    path: '/client-config.js',
    handler: async (request, h) => {
      const file =
        process.env.NODE_ENV === 'production'
          ? '/client-config.prod.js'
          : '/client-config.js'

      return h.file(join(__dirname, file))
    },
    options: {
      auth: false,
      tags: ['api'],
      description: 'Serves client configuration as a static file'
    }
  })

  server.route({
    method: 'GET',
    path: '/login-config.js',
    handler: (request, h) => {
      const file =
        process.env.NODE_ENV === 'production'
          ? '/login-config.prod.js'
          : '/login-config.js'
      return h.file(join(__dirname, file))
    },
    options: {
      auth: false,
      tags: ['api'],
      description: 'Serves login client configuration as a static file'
    }
  })

  server.route({
    method: 'GET',
    path: '/handlebars.js',
    handler: handlebarsHandler,
    options: {
      auth: false,
      tags: ['api'],
      description:
        'Serves custom handlebar helper functions as JS to be used in certificates'
    }
  })

  server.route({
    method: 'GET',
    path: '/validators.js',
    handler: validatorsHandler,
    options: {
      auth: false,
      tags: ['api'],
      description: 'Serves validation functions as JS'
    }
  })

  server.route({
    method: 'GET',
    path: '/conditionals.js',
    handler: conditionalsHandler,
    options: {
      auth: false,
      tags: ['api'],
      description: 'Serves conditionals as JS'
    }
  })

  server.route({
    method: 'GET',
    path: '/content/{application}',
    handler: contentHandler,
    options: {
      auth: false,
      tags: ['api'],
      description: 'Serves language content'
    }
  })

  server.route({
    method: 'GET',
    path: '/dashboards/queries.json',
    handler: dashboardQueriesHandler,
    options: {
      tags: ['api'],
      auth: false,
      description: 'Serves dashboard view refresher queries'
    }
  })

  server.route({
    method: 'GET',
    path: '/forms',
    handler: formHandler,
    options: {
      tags: ['api'],
      description: 'Serves form configuration'
    }
  })

  server.route({
    method: 'GET',
    path: '/content/map.geojson',
    handler: mapGeojsonHandler,
    options: {
      auth: false,
      tags: ['api'],
      description: 'Serves map geojson'
    }
  })

  server.route({
    method: 'GET',
    path: '/content/country-logo',
    handler: countryLogoHandler,
    options: {
      auth: false,
      tags: ['api'],
      description: 'Serves country logo'
    }
  })
  server.route({
    method: 'GET',
    path: '/crude-death-rate',
    handler: () => ({
      crudeDeathRate: COUNTRY_WIDE_CRUDE_DEATH_RATE
    }),
    options: {
      tags: ['api'],
      description: 'Serves country wise crude death rate'
    }
  })

  server.route({
    method: 'POST',
    path: '/email',
    handler: emailHandler,
    options: {
      /*
       * In deployed environments, the email path is blocked by Traefik.
       * See docker-compose.deploy.yml for more details.
       */
      auth: false,
      tags: ['api'],
      validate: {
        payload: emailSchema
      },
      description: 'Handles sending email using a predefined template file'
    }
  })

  server.route({
    method: 'GET',
    path: '/application-config',
    handler: applicationConfigHandler,
    options: {
      auth: false,
      tags: ['api', 'application-config'],
      description: 'Returns default application configuration'
    }
  })

  server.route({
    method: 'GET',
    path: '/workqueue',
    handler: workqueueconfigHandler,
    options: {
      auth: false,
      tags: ['api', 'workqueue'],
      description: 'Returns workqueue configurations'
    }
  })

  server.route({
    method: 'GET',
    path: '/locations',
    handler: locationsHandler,
    options: {
      auth: false,
      tags: ['api', 'locations'],
      description: 'Returns the locations metadata'
    }
  })

  server.route({
    method: 'GET',
    path: '/roles',
    handler: rolesHandler,
    options: {
      auth: false,
      tags: ['api', 'user-roles'],
      description: 'Returns user roles metadata'
    }
  })

  server.route({
    method: 'GET',
    path: '/users',
    handler: usersHandler,
    options: {
      tags: ['api', 'users'],
      description: 'Returns users metadata'
    }
  })

  server.route({
    method: 'POST',
    path: '/tracking-id',
    handler: trackingIDHandler,
    options: {
      tags: ['api'],
      description: 'Provides a tracking id'
    }
  })

  server.route({
    method: 'GET',
    path: '/static/{param*}',
    handler: {
      directory: {
        path: path.join(__dirname, 'client-static'),
        redirectToSlash: true,
        index: false
      }
    },
    options: {
      auth: false,
      tags: ['api', 'static'],
      description: 'Server static files for client'
    }
  })

  server.route({
    method: 'GET',
    path: '/record-notification',
    handler: recordNotificationHandler,
    options: {
      tags: ['api'],
      description: 'Checks for enabled notification for record'
    }
  })

  server.route({
    method: 'POST',
    path: '/reindex',
    options: {
      /*
       * In deployed environments, the reindex path is blocked by Traefik.
       * See docker-compose.deploy.yml for more details.
       */
      auth: false,
      payload: {
        output: 'stream',
        parse: false
      }
    },
    handler: async (req, h) => {
      if (!env.ANALYTICS_DATABASE_URL) {
        // kill client upload immediately
        if (!req.raw.req.destroyed) {
          req.raw.req.destroy()
        }

        logger.warn(
          'Skipping reindex, no ANALYTICS_DATABASE_URL environment variable set.'
        )
        return h.response().code(200)
      }

      const stream = req.raw.req.pipe(StreamArray.withParser())
      const BATCH_SIZE = 1000
      const queue: EventDocument[] = []
      const client = getClient()

      try {
        await client.transaction().execute(async (trx) => {
          for await (const { value } of stream) {
            queue.push(value)

            if (queue.length >= BATCH_SIZE) {
              const batch = queue.splice(0, queue.length)
              await importEvents(batch, trx)
            }
          }

          if (queue.length > 0) {
            await importEvents(queue, trx)
          }

          // Import locations
          const url = new URL('events', GATEWAY_URL).toString()
          const client = createClient(url, req.headers.authorization)
          const locations = await client.locations.list.query()
          await importLocations(locations)
        })

        logger.info('Reindexed all events into analytics.')

        return h.response().code(200)
      } catch (e) {
        // stop consuming the stream if something failed on import
        if (!stream.destroyed) stream.destroy(e)

        logger.error(e)

        return h.response({ error: 'Unexpected error' }).code(500)
      }
    }
  })

  server.route({
    method: 'GET',
    path: '/events',
    handler: getCustomEventsHandler,
    options: {
      auth: false,
      tags: ['api', 'events'],
      description: 'Serves custom events'
    }
  })

  server.route({
    method: 'POST',
    path: '/trigger/events/{event}/actions/{action}',
    handler: onAnyActionHandler,
    options: {
      tags: ['api', 'events'],
      description: 'Receives notifications on event actions'
    }
  })

  server.route({
    method: 'POST',
    path: '/trigger/events/birth/actions/{action}',
    handler: onBirthActionHandler,
    options: {
      tags: ['api', 'events'],
      description: 'Receives notifications on event actions'
    }
  })

  server.route({
    method: 'POST',
    path: '/trigger/events/death/actions/{action}',
    handler: onDeathActionHandler,
    options: {
      tags: ['api', 'events'],
      description: 'Receives notifications on event actions'
    }
  })

  server.route({
    method: 'POST',
    path: `/trigger/events/${Event.Birth}/actions/${ActionType.REGISTER}`,
    handler: onMosipBirthRegisterHandler,
    options: {
      tags: ['api', 'events'],
      description: 'Receives notifications on event actions'
    }
  })

  server.route({
    method: 'POST',
    path: `/trigger/events/${Event.Death}/actions/${ActionType.REGISTER}`,
    handler: onMosipDeathRegisterHandler,
    options: {
      tags: ['api', 'events'],
      description: 'Receives notifications on event actions'
    }
  })

  server.route(getUserNotificationRoutes())

  server.ext({
    type: 'onRequest',
    method(request: Hapi.Request & { sentryScope?: any }, h) {
      request.sentryScope?.setExtra('payload', request.payload)
      return h.continue
    }
  })

  server.ext('onPostHandler', async (request, h) => {
    const response = request.response as Hapi.ResponseObject
    const parsedPath = /^\/trigger\/events\/[^/]+\/actions\/([^/]+)$/.exec(
      request.route.path
    )

    const actionType = parsedPath?.[1] as ActionType | null
    const wasRequestForActionConfirmation =
      actionType && request.method === 'post'
    const wasActionAcceptedImmediately = response.statusCode === 200

    if (wasRequestForActionConfirmation && wasActionAcceptedImmediately) {
      const event = request.payload as EventDocument

      const eventWithOptimisticallyApprovedLastAction = {
        ...event,
        actions: event.actions.map((action, index) =>
          index === event.actions.length - 1
            ? {
                ...action,
                status: ActionStatus.Accepted,
                ...(actionType === ActionType.REGISTER
                  ? {
                      registrationNumber: (
                        response.source as { registrationNumber: string }
                      ).registrationNumber
                    }
                  : {})
              }
            : action
        ) as ActionDocument[]
      }

      const client = getClient()
      try {
        await client.transaction().execute(async (trx) => {
          await importEvent(eventWithOptimisticallyApprovedLastAction, trx)
        })
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error)
        throw error
      }
    }
    return h.continue
  })

  async function stop() {
    await server.stop()
    server.log('info', 'server stopped')
  }

  async function start() {
    await server.start()
    await syncLocationLevels()
    await syncLocationStatistics()

    const logMsg = `Server successfully started on ${COUNTRY_CONFIG_HOST}:${COUNTRY_CONFIG_PORT}`
    logger.info(logMsg)
    server.log('info', logMsg)
  }

  return { server, start, stop }
}

if (require.main === module) {
  createServer().then((server) => server.start())
}
