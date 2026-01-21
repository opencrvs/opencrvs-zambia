import {
  MOSIP_API_USERINFO_URL,
  OPENID_PROVIDER_CLIENT_ID,
  ESIGNET_REDIRECT_URL
} from '@countryconfig/constants'
import { logger } from '@countryconfig/logger'
import {
  FieldConditional,
  and,
  FieldConfigInput,
  field,
  ConditionalType,
  FieldType,
  not,
  never,
  or,
  FieldReference,
  window
} from '@opencrvs/toolkit/events'
import addYears from 'date-fns/addYears'
import isAfter from 'date-fns/isAfter'

const CHILD_MAX_AGE_YEARS_FOR_MOSIP = 10

const BIRTH_REGISTRATION_MOSIP_CONSTRAINTS = [
  {
    fieldId: 'child.dob',
    expectedValues: 'any',
    rejectReason: 'Child date of birth not provided',
    validator: (value: any) => {
      const mosipEligibilityExpiryDate = addYears(
        new Date(value),
        CHILD_MAX_AGE_YEARS_FOR_MOSIP
      )
      return !isAfter(Date.now(), mosipEligibilityExpiryDate)
    },
    validatorFailureReason: `Child is older than ${CHILD_MAX_AGE_YEARS_FOR_MOSIP} years, cannot forward to MOSIP`
  },
  {
    fieldId: 'mother.verified',
    expectedValues: ['verified', 'authenticated'],
    rejectReason: 'Mother identity not verified or authenticated'
  },
  {
    fieldId: 'father.verified',
    expectedValues: ['verified', 'authenticated'],
    rejectReason: 'Father identity not verified or authenticated'
  }
]

const DEATH_REGISTRATION_MOSIP_CONSTRAINTS = [
  {
    fieldId: 'spouse.verified',
    expectedValues: ['verified', 'authenticated'],
    rejectReason: 'Spouse identity not verified or authenticated',
    validator: (value: any, declaration?: Record<string, any>) => {
      if (declaration?.['informant.relation'] === 'SPOUSE') {
        return ['verified', 'authenticated'].includes(value)
      }
      return true // Skip this constraint if not spouse
    }
  },
  {
    fieldId: 'informant.verified',
    expectedValues: ['verified', 'authenticated'],
    rejectReason: 'Informant identity not verified or authenticated',
    validator: (value: any, declaration?: Record<string, any>) => {
      if (declaration?.['informant.relation'] !== 'SPOUSE') {
        return ['verified', 'authenticated'].includes(value)
      }
      return true // Skip this constraint if spouse
    }
  }
]

const validateConstraints = (
  declaration: Record<string, any>,
  constraints: Array<{
    fieldId: string
    expectedValues: string | string[]
    rejectReason: string
    // eslint-disable-next-line no-unused-vars
    validator?: (value: any, declaration?: Record<string, any>) => boolean
    validatorFailureReason?: string
  }>
): { valid: boolean; reason?: string } => {
  for (const constraint of constraints) {
    const value = declaration[constraint.fieldId]

    if (constraint.validator) {
      if (!constraint.validator(value, declaration)) {
        const reason =
          constraint.validatorFailureReason || constraint.rejectReason
        logger.info(reason)
        return { valid: false, reason }
      }
      continue
    }

    if (constraint.expectedValues === 'any') {
      if (value === undefined) {
        logger.info(constraint.rejectReason)
        return { valid: false, reason: constraint.rejectReason }
      }
    } else {
      const expectedValues = Array.isArray(constraint.expectedValues)
        ? constraint.expectedValues
        : [constraint.expectedValues]

      if (!expectedValues.includes(value)) {
        logger.info(constraint.rejectReason)
        return { valid: false, reason: constraint.rejectReason }
      }
    }
  }

  return { valid: true }
}

const upsertConditional = (
  conditionals: FieldConditional[],
  newConditional: FieldConditional
): FieldConditional[] => {
  const existingIndex = conditionals.findIndex(
    (c) => c.type === newConditional.type
  )

  if (existingIndex !== -1) {
    return conditionals.map((c, i) =>
      i === existingIndex
        ? {
            ...c,
            conditional: and(c.conditional, newConditional.conditional)
          }
        : c
    )
  }

  return [...conditionals, newConditional]
}

export const connectToMOSIPIdReader = (
  { parent, ...fieldInput }: FieldConfigInput & { parent?: FieldReference },
  {
    valuePath,
    disableIf,
    hideIf
  }: {
    valuePath: string
    disableIf?: string[]
    hideIf?: string[]
  }
): FieldConfigInput => {
  const page = fieldInput.id.split('.')[0]

  return connectToMOSIPVerificationStatus(
    {
      parent: [
        field(`${page}.id-reader`),
        field(`${page}.verify-nid-http-fetch`),
        ...(parent ? [parent] : [])
      ],
      ...fieldInput,
      value: [
        field(`${page}.verify-nid-http-fetch`).get(valuePath),
        field(`${page}.id-reader`).get(valuePath)
      ]
    },
    { hideIf, disableIf }
  )
}

export const getMOSIPIntegrationFields = (
  page: string,
  { existingConditionals }: { existingConditionals: FieldConditional[] }
): FieldConfigInput[] => {
  const existingShowConditional = existingConditionals.find(
    (c) => c.type === ConditionalType.SHOW
  )
  return [
    /*
     * @opencrvs/mosip: MOSIP / E-Signet
     */
    {
      id: `${page}.verified`,
      type: FieldType.VERIFICATION_STATUS,
      parent: [
        field(`${page}.verify-nid-http-fetch`),
        field(`${page}.id-reader`)
      ],
      label: {
        id: `${page}.verified.status`,
        defaultMessage: 'Verification status',
        description: 'The title for the status field label'
      },
      configuration: {
        status: {
          id: 'verified.status.text',
          defaultMessage:
            '{value, select, authenticated {ID Authenticated} verified {ID Verified} failed {Unverified ID} pending {Pending verification} other {Invalid value}}',
          description:
            'Status text shown on the pill on both form declaration and review page'
        },
        description: {
          id: 'verified.status.description',
          defaultMessage:
            "{value, select, authenticated {This identity has been successfully authenticated with the Farajaland’s National ID System. To make edits, please remove the authentication first.} verified {This identity data has been successfully verified with the Farajaland’s National ID System. Please note that their identity has not been authenticated using the individual's biometrics. To make edits, please remove the verification first.} pending {Identity pending verification with Farajaland’s National ID system} failed {The identity data does not match an entry in Farajaland’s National ID System} other {Invalid value}}",
          description: 'Description text of the status'
        }
      },
      conditionals: existingConditionals,
      value: [
        field(`${page}.verify-nid-http-fetch`).get('data.verificationStatus'),
        field(`${page}.id-reader`).get('data.verificationStatus')
      ]
    },

    /*
     * @opencrvs/mosip: MOSIP / E-Signet
     */
    {
      id: `${page}.query-params`,
      type: FieldType.QUERY_PARAM_READER,
      conditionals: [
        {
          type: ConditionalType.DISPLAY_ON_REVIEW,
          conditional: never()
        }
      ],
      label: {
        id: 'form.query-params.label',
        defaultMessage: 'Query param reader',
        description:
          'This is the label for the query param reader field - usually this is hidden'
      },
      configuration: {
        pickParams: ['code', 'state']
      }
    },

    /*
     * @opencrvs/mosip: MOSIP / E-Signet
     */
    {
      id: `${page}.verify-nid-http-fetch`,
      type: FieldType.HTTP,
      conditionals: [
        {
          type: ConditionalType.DISPLAY_ON_REVIEW,
          conditional: never()
        }
      ],
      label: {
        defaultMessage: 'Fetch applicant information',
        description: 'Fetch applicant information',
        id: 'applicant.http-fetch.label'
      },
      configuration: {
        trigger: field(`${page}.query-params`),
        url: MOSIP_API_USERINFO_URL,
        timeout: 5000,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          clientId: OPENID_PROVIDER_CLIENT_ID,
          redirectUri: window().location.get('href')
        },
        params: {
          code: field(`${page}.query-params`).get('data.code'),
          state: field(`${page}.query-params`).get('data.state')
        },
        errorValue: {
          verificationStatus: 'failed'
        }
      }
    },

    /*
     * @opencrvs/mosip: MOSIP / E-Signet
     */
    {
      id: `${page}.fetch-loader`,
      type: FieldType.LOADER,
      parent: field(`${page}.verify-nid-http-fetch`),
      conditionals: [
        {
          type: ConditionalType.SHOW,
          conditional: not(
            field(`${page}.verify-nid-http-fetch`).get('loading').isFalsy()
          )
        },
        {
          type: ConditionalType.DISPLAY_ON_REVIEW,
          conditional: never()
        }
      ],
      label: {
        id: 'form.fetch-loader.label',
        defaultMessage: "Fetching the person's data from E-Signet",
        description:
          'This is the label for the fetch individual information loader'
      },
      configuration: {
        text: {
          id: 'form.fetch-loader.label',
          defaultMessage: "Fetching the person's data from E-Signet",
          description:
            'This is the label for the fetch individual information loader'
        }
      }
    },

    /*
     * @opencrvs/mosip: MOSIP / E-Signet
     */
    {
      id: `${page}.id-reader`,
      type: FieldType.ID_READER,
      required: false,
      label: {
        defaultMessage: 'QR Code',
        description: 'This is the label for the field',
        id: `event.birth.action.declare.form.section.${page}.field.qr.label`
      },
      conditionals: [
        {
          type: ConditionalType.SHOW,
          conditional: existingShowConditional?.conditional
            ? and(
                existingShowConditional?.conditional,
                not(
                  or(
                    field(`${page}.verified`).isEqualTo('pending'),
                    field(`${page}.verified`).isEqualTo('verified'),
                    field(`${page}.verified`).isEqualTo('authenticated'),
                    field(`${page}.verified`).isEqualTo('failed')
                  )
                )
              )
            : not(
                or(
                  field(`${page}.verified`).isEqualTo('pending'),
                  field(`${page}.verified`).isEqualTo('verified'),
                  field(`${page}.verified`).isEqualTo('authenticated'),
                  field(`${page}.verified`).isEqualTo('failed')
                )
              )
        },
        {
          type: ConditionalType.DISPLAY_ON_REVIEW,
          conditional: never()
        }
      ],
      methods: [
        {
          type: FieldType.QR_READER,
          label: {
            id: `event.birth.action.declare.form.section.${page}.field.qr.label`,
            defaultMessage: 'Scan QR code',
            description: 'This is the label for the field'
          },
          id: `${page}.id-reader`
        },
        {
          id: `${page}.verify`,
          type: FieldType.LINK_BUTTON,
          label: {
            id: 'verify.label',
            defaultMessage: 'Authenticate',
            description: 'The title for the E-Signet verification button'
          },
          configuration: {
            icon: 'Globe',
            url: `${ESIGNET_REDIRECT_URL}?client_id=${OPENID_PROVIDER_CLIENT_ID}&response_type=code&scope=openid%20profile&acr_values=mosip:idp:acr:static-code&claims=name,family_name,given_name,middle_name,birthdate,address&state=fetch-on-mount`,
            text: {
              id: 'verify.label',
              defaultMessage: 'e-Signet',
              description: 'The title for the E-Signet verification button'
            }
          }
        }
      ]
    }
  ]
}

export const connectToMOSIPVerificationStatus = (
  fieldInput: FieldConfigInput,
  {
    hideIf,
    disableIf
  }: {
    hideIf?: string[]
    disableIf?: string[]
  }
): FieldConfigInput => {
  const page = fieldInput.id.split('.')[0]
  let updatedConditionals = fieldInput.conditionals || []

  if (Array.isArray(hideIf) && hideIf.length > 0) {
    const hideConditional = {
      type: ConditionalType.SHOW,
      conditional: not(
        hideIf.reduce(
          (acc, status) => or(acc, field(`${page}.verified`).isEqualTo(status)),
          never()
        )
      )
    }
    updatedConditionals = upsertConditional(
      updatedConditionals,
      hideConditional
    )
  }

  if (Array.isArray(disableIf) && disableIf.length > 0) {
    const disableConditional = {
      type: ConditionalType.ENABLE,
      conditional: not(
        disableIf.reduce(
          (acc, status) => or(acc, field(`${page}.verified`).isEqualTo(status)),
          never()
        )
      )
    }
    updatedConditionals = upsertConditional(
      updatedConditionals,
      disableConditional
    )
  }

  return {
    ...fieldInput,
    conditionals: updatedConditionals
  }
}

/**
 * Determines whether the birth registration should be forwarded to MOSIP.
 * @param declaration The declaration object containing event data.
 * @returns Object with valid boolean and optional reject reason.
 */
export function shouldForwardBirthRegistrationToMosip(
  declaration: Record<string, any>
): { valid: boolean; reason?: string } {
  logger.info('Evaluating whether to forward birth registration to MOSIP...')

  // Validate all constraints including age eligibility
  return validateConstraints(declaration, BIRTH_REGISTRATION_MOSIP_CONSTRAINTS)
}

/**
 * Determines whether the death registration should be forwarded to MOSIP.
 * @param declaration The declaration object containing event data.
 * @returns Object with valid boolean and optional reject reason.
 */
export function shouldForwardDeathRegistrationToMosip(
  declaration: Record<string, any>
): { valid: boolean; reason?: string } {
  logger.info('Evaluating whether to forward death registration to MOSIP...')

  // Validate all constraints
  return validateConstraints(declaration, DEATH_REGISTRATION_MOSIP_CONSTRAINTS)
}
