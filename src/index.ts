/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * OpenCRVS is also distributed under the terms of the Civil Registration
 * & Healthcare Disclaimer located at http://opencrvs.org/license.
 *
 * Copyright (C) The OpenCRVS Authors. OpenCRVS and the OpenCRVS
 * graphic logo are (registered/a) trademark(s) of Plan International.
 */
// tslint:disable no-var-requires
require('app-module-path').addPath(require('path').join(__dirname, '../'))

// tslint:enable no-var-requires
import fetch from 'node-fetch'
import * as Hapi from '@hapi/hapi'
import { readFileSync } from 'fs'
import getPlugins from '@resources/config/plugins'
import * as usrMgntDB from '@resources/database'
import {
  RESOURCES_HOST,
  RESOURCES_PORT,
  CERT_PUBLIC_KEY_PATH,
  CHECK_INVALID_TOKEN,
  AUTH_URL,
  COUNTRY_WIDE_CRUDE_DEATH_RATE
} from '@resources/constants'
import { locationsHandler as zmbLocationsHandler } from '@resources/zmb/features/administrative/handler'
import { facilitiesHandler as zmbFacilitiesHandler } from '@resources/zmb/features/facilities/handler'
import { definitionsHandler as zmbDefinitionsHandler } from '@resources/zmb/features/definitions/handler'
import { assetHandler as zmbAssetHandler } from '@resources/zmb/features/assets/handler'
import {
  generatorHandler as zmbGeneratorHandler,
  requestSchema as zmbGeneratorRequestSchema,
  responseSchema as zmbGeneratorResponseSchema
} from '@resources/zmb/features/generate/handler'
import { zmbValidateRegistrationHandler } from '@resources/zmb/features/validate/handler'

import { join } from 'path'

const publicCert = readFileSync(CERT_PUBLIC_KEY_PATH)

export const verifyToken = async (token: string, authUrl: string) => {
  const res = await fetch(`${authUrl}/verifyToken`, {
    method: 'POST',
    body: JSON.stringify({ token }),
    headers: {
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
  checkInvalidToken: string,
  authUrl: string
) => {
  let valid
  if (checkInvalidToken === 'true') {
    valid = await verifyToken(
      request.headers.authorization.replace('Bearer ', ''),
      authUrl
    )
  }

  if (valid === true || checkInvalidToken !== 'true') {
    return {
      isValid: true,
      credentials: payload
    }
  }

  return {
    isValid: false
  }
}

export async function createServer() {
  const server = new Hapi.Server({
    host: RESOURCES_HOST,
    port: RESOURCES_PORT,
    routes: {
      cors: { origin: ['*'] }
    }
  })

  await server.register(getPlugins())

  server.auth.strategy('jwt', 'jwt', {
    key: publicCert,
    verifyOptions: {
      algorithms: ['RS256'],
      issuer: 'opencrvs:auth-service',
      audience: 'opencrvs:resources-user'
    },
    validate: (payload: any, request: Hapi.Request) =>
      validateFunc(payload, request, CHECK_INVALID_TOKEN, AUTH_URL)
  })

  server.auth.default('jwt')

  // add ping route by default for health check

  server.route({
    method: 'GET',
    path: '/ping',
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
    path: '/client-config.js',
    handler: (request, h) => {
      const file =
        process.env.NODE_ENV === 'production'
          ? './zmb/config/client-config.prod.js'
          : './zmb/config/client-config.js'
      // @ts-ignore
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
          ? './zmb/config/login-config.prod.js'
          : './zmb/config/login-config.js'
      // @ts-ignore
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
    path: '/locations',
    handler: zmbLocationsHandler,
    options: {
      tags: ['api'],
      description: 'Returns Zambia locations.json'
    }
  })

  server.route({
    method: 'GET',
    path: '/facilities',
    handler: zmbFacilitiesHandler,
    options: {
      tags: ['api'],
      description: 'Returns Zambia facilities.json'
    }
  })

  server.route({
    method: 'GET',
    path: '/assets/{file}',
    handler: zmbAssetHandler,
    options: {
      tags: ['api'],
      description: 'Serves country specific assets, unprotected'
    }
  })

  server.route({
    method: 'GET',
    path: '/definitions/{application}',
    handler: zmbDefinitionsHandler,
    options: {
      tags: ['api'],
      description:
        'Serves definitional metadata like form definitions, language files and pdf templates'
    }
  })

  server.route({
    method: 'POST',
    path: '/validate/registration',
    handler: zmbValidateRegistrationHandler,
    options: {
      tags: ['api'],
      description:
        'Validates a registration and if successful returns a BRN for that record'
    }
  })

  server.route({
    method: 'POST',
    path: '/generate/{type}',
    handler: zmbGeneratorHandler,
    options: {
      tags: ['api'],
      validate: {
        payload: zmbGeneratorRequestSchema
      },
      response: {
        schema: zmbGeneratorResponseSchema
      },
      description:
        'Generates registration numbers based on country specific implementation logic'
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
    method: 'GET',
    path: '/pilotLocations',
    handler: () => ({}),
    options: {
      tags: ['api'],
      description: 'Serves current pilot location list'
    }
  })

  server.ext({
    type: 'onRequest',
    method(request: Hapi.Request & { sentryScope: any }, h) {
      request.sentryScope.setExtra('payload', request.payload)
      return h.continue
    }
  })

  async function stop() {
    await server.stop()
    await usrMgntDB.disconnect()
    server.log('info', 'server stopped')
  }

  async function start() {
    await server.start()
    await usrMgntDB.connect()
    server.log('info', `server started on ${RESOURCES_HOST}:${RESOURCES_PORT}`)
  }

  return { server, start, stop }
}

if (require.main === module) {
  createServer().then(server => server.start())
}
