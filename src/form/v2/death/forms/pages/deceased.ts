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

import {
  defineFormPage,
  TranslationConfig,
  ConditionalType,
  and,
  FieldType,
  AddressType,
  PageTypes,
  field,
  user
} from '@opencrvs/toolkit/events'
import { not, never } from '@opencrvs/toolkit/conditionals'

import { createSelectOptions, emptyMessage } from '@countryconfig/form/v2/utils'
import {
  farajalandNameConfig,
  invalidNameValidator,
  nationalIdValidator
} from '@countryconfig/form/v2/birth/validators'
import {
  IdType,
  idTypeOptions,
  maritalStatusOptions
} from '@countryconfig/form/v2/person'
import {
  defaultStreetAddressConfiguration,
  getNestedFieldValidators
} from '@countryconfig/form/street-address-configuration'
import {
  connectToMOSIPIdReader,
  connectToMOSIPVerificationStatus,
  getMOSIPIntegrationFields
} from '@countryconfig/form/v2/mosip'

const GenderTypes = {
  MALE: 'male',
  FEMALE: 'female',
  UNKNOWN: 'unknown'
} as const

const genderMessageDescriptors = {
  MALE: {
    defaultMessage: 'Male',
    description: 'Label for option male',
    id: 'form.field.label.sexMale'
  },
  FEMALE: {
    defaultMessage: 'Female',
    description: 'Label for option female',
    id: 'form.field.label.sexFemale'
  },
  UNKNOWN: {
    defaultMessage: 'Unknown',
    description: 'Label for option unknown',
    id: 'form.field.label.sexUnknown'
  }
} satisfies Record<keyof typeof GenderTypes, TranslationConfig>

const genderOptions = createSelectOptions(GenderTypes, genderMessageDescriptors)

export const deceased = defineFormPage({
  id: 'deceased',
  type: PageTypes.enum.FORM,
  title: {
    defaultMessage: "Deceased's details",
    description: 'Form section title for Deceased',
    id: 'form.death.deceased.title'
  },
  fields: [
    ...getMOSIPIntegrationFields('deceased', {
      existingConditionals: []
    }),
    connectToMOSIPIdReader(
      {
        id: 'deceased.name',
        type: FieldType.NAME,
        configuration: farajalandNameConfig,
        required: true,
        hideLabel: true,
        label: {
          defaultMessage: "Deceased's name",
          description: 'This is the label for the field',
          id: 'event.death.action.declare.form.section.deceased.field.name.label'
        },
        validation: [invalidNameValidator('deceased.name')]
      },
      {
        valuePath: 'data.name',
        disableIf: ['pending', 'verified', 'authenticated']
      }
    ),
    connectToMOSIPIdReader(
      {
        id: 'deceased.gender',
        type: FieldType.SELECT,
        required: true,
        label: {
          defaultMessage: 'Sex',
          description: 'This is the label for the field',
          id: 'event.death.action.declare.form.section.deceased.field.gender.label'
        },
        options: genderOptions
      },
      {
        valuePath: 'data.gender',
        disableIf: ['pending', 'verified', 'authenticated']
      }
    ),
    connectToMOSIPIdReader(
      {
        id: 'deceased.dob',
        type: FieldType.DATE,
        required: true,
        validation: [
          {
            message: {
              defaultMessage: 'Must be a valid Birthdate',
              description: 'This is the error message for invalid date',
              id: 'event.death.action.declare.form.section.deceased.field.dob.error'
            },
            validator: field('deceased.dob').isBefore().now()
          },
          {
            message: {
              defaultMessage: 'Date of birth must be before the date of death',
              description:
                'This is the error message for date of birth later than date of death',
              id: 'event.death.action.declare.form.section.deceased.field.dob.error.laterThanDeath'
            },
            validator: field('deceased.dob')
              .isBefore()
              .date(field('eventDetails.date'))
          }
        ],
        label: {
          defaultMessage: 'Date of birth',
          description: 'This is the label for the field',
          id: 'event.death.action.declare.form.section.deceased.field.dob.label'
        },
        conditionals: [
          {
            type: ConditionalType.SHOW,
            conditional: not(field(`deceased.dobUnknown`).isEqualTo(true))
          }
        ]
      },
      {
        valuePath: 'data.birthDate',
        disableIf: ['pending', 'verified', 'authenticated']
      }
    ),
    connectToMOSIPIdReader(
      {
        id: `deceased.dobUnknown`,
        type: FieldType.CHECKBOX,
        label: {
          defaultMessage: 'Exact date of birth unknown',
          description: 'This is the label for the field',
          id: `v2.event.death.action.declare.form.section.deceased.field.age.checkbox.label`
        },
        conditionals: [
          {
            type: ConditionalType.DISPLAY_ON_REVIEW,
            conditional: never()
          }
        ]
      },
      {
        valuePath: 'data.dobUnknown',
        disableIf: ['pending', 'verified', 'authenticated']
      }
    ),
    connectToMOSIPVerificationStatus(
      {
        id: `deceased.age`,
        type: FieldType.AGE,
        required: true,
        label: {
          defaultMessage: `Age of deceased (at the time of event)`,
          description: 'This is the label for the field',
          id: 'event.death.action.declare.form.section.deceased.field.age.label'
        },
        configuration: {
          asOfDate: field('eventDetails.date'),
          postfix: {
            defaultMessage: 'years',
            description: 'This is the postfix for age field',
            id: `v2.event.death.action.declare.form.section.deceased.field.age.postfix`
          }
        },
        conditionals: [
          {
            type: ConditionalType.SHOW,
            conditional: field(`deceased.dobUnknown`).isEqualTo(true)
          }
        ],
        validation: [
          {
            validator: field('deceased.age').asAge().isBetween(0, 120),
            message: {
              defaultMessage: 'Age must be between 0 and 120',
              description: 'Error message for invalid age',
              id: 'event.death.action.declare.form.section.deceased.field.age.error'
            }
          }
        ]
      },
      { disableIf: ['pending', 'verified', 'authenticated'] }
    ),
    {
      id: `deceased.nationality`,
      type: FieldType.COUNTRY,
      required: true,
      label: {
        defaultMessage: 'Nationality',
        description: 'This is the label for the field',
        id: `v2.event.death.action.declare.form.section.person.field.nationality.label`
      },
      defaultValue: 'FAR'
    },
    connectToMOSIPIdReader(
      {
        id: `deceased.idType`,
        type: FieldType.SELECT,
        required: true,
        label: {
          defaultMessage: 'Type of ID',
          description: 'This is the label for the field',
          id: `v2.event.death.action.declare.form.section.person.field.idType.label`
        },
        options: idTypeOptions
      },
      {
        valuePath: 'data.idType',
        hideIf: ['authenticated'],
        disableIf: ['pending', 'verified']
      }
    ),
    connectToMOSIPIdReader(
      {
        id: 'deceased.nid',
        type: FieldType.ID,
        required: true,
        label: {
          defaultMessage: 'ID Number',
          description: 'This is the label for the field',
          id: `v2.event.death.action.declare.form.section.person.field.nid.label`
        },
        conditionals: [
          {
            type: ConditionalType.SHOW,
            conditional: field('deceased.idType').isEqualTo(IdType.NATIONAL_ID)
          }
        ],
        validation: [
          nationalIdValidator('deceased.nid'),
          {
            message: {
              defaultMessage: 'National id must be unique',
              description: 'This is the error message for non-unique ID Number',
              id: 'event.death.action.declare.form.nid.unique'
            },
            validator: and(
              not(field('deceased.nid').isEqualTo(field('informant.nid')))
            )
          }
        ]
      },
      {
        valuePath: 'data.nid',
        hideIf: ['authenticated'],
        disableIf: ['pending', 'verified']
      }
    ),
    connectToMOSIPIdReader(
      {
        id: `deceased.passport`,
        type: FieldType.TEXT,
        required: true,
        label: {
          defaultMessage: 'ID Number',
          description: 'This is the label for the field',
          id: `v2.event.death.action.declare.form.section.person.field.passport.label`
        },
        conditionals: [
          {
            type: ConditionalType.SHOW,
            conditional: field(`deceased.idType`).isEqualTo(IdType.PASSPORT)
          }
        ]
      },
      {
        valuePath: 'data.passport',
        hideIf: ['authenticated'],
        disableIf: ['pending', 'verified']
      }
    ),
    connectToMOSIPIdReader(
      {
        id: `deceased.brn`,
        type: FieldType.TEXT,
        required: true,
        label: {
          defaultMessage: 'ID Number',
          description: 'This is the label for the field',
          id: `v2.event.death.action.declare.form.section.person.field.brn.label`
        },
        conditionals: [
          {
            type: ConditionalType.SHOW,
            conditional: field('deceased.idType').isEqualTo(
              IdType.BIRTH_REGISTRATION_NUMBER
            )
          }
        ]
      },
      {
        valuePath: 'data.brn',
        hideIf: ['authenticated'],
        disableIf: ['pending', 'verified']
      }
    ),
    {
      id: 'deceased.maritalStatus',
      type: FieldType.SELECT,
      required: false,
      label: {
        defaultMessage: 'Marital Status',
        description: 'This is the label for the field',
        id: `v2.event.death.action.declare.form.section.deceased.field.maritalStatus.label`
      },
      options: maritalStatusOptions
    },
    {
      id: `deceased.numberOfDependants`,
      type: FieldType.NUMBER,
      required: false,
      label: {
        defaultMessage: 'No. of dependants',
        description: 'This is the label for the field',
        id: 'event.death.action.declare.form.section.deceased.field.numberOfDependants.label'
      },
      configuration: {
        min: 0
      }
    },
    {
      id: `deceased.addressDivider`,
      type: FieldType.DIVIDER,
      label: emptyMessage
    },
    {
      id: `deceased.addressHelper`,
      type: FieldType.PARAGRAPH,
      label: {
        defaultMessage: 'Usual place of residence',
        description: 'This is the label for the field',
        id: `v2.event.death.action.declare.form.section.deceased.field.addressHelper.label`
      },
      configuration: { styles: { fontVariant: 'h3' } }
    },
    {
      id: `deceased.address`,
      type: FieldType.ADDRESS,
      required: true,
      hideLabel: true,
      secured: true,
      label: {
        defaultMessage: 'Usual place of residence',
        description: 'This is the label for the field',
        id: 'event.death.action.declare.form.section.deceased.field.address.label'
      },
      validation: [
        {
          message: {
            defaultMessage: 'Invalid input',
            description: 'Error message when generic field is invalid',
            id: 'error.invalidInput'
          },
          validator: field('deceased.address').isValidAdministrativeLeafLevel()
        },
        ...getNestedFieldValidators(
          'deceased.address',
          defaultStreetAddressConfiguration
        )
      ],
      defaultValue: {
        country: 'FAR',
        addressType: AddressType.DOMESTIC,
        administrativeArea: user('primaryOfficeId').locationLevel('district')
      },
      configuration: {
        streetAddressForm: defaultStreetAddressConfiguration
      }
    }
  ]
})
