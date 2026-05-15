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
import { uppercaseFirstLetter } from '@countryconfig/utils'
import { getCustomFieldMapping } from '@countryconfig/utils/mapping/field-mapping-utils'
import { camelCase } from 'lodash'
import { MessageDescriptor } from 'react-intl'
import { getNationalIDValidators } from './default-validation-conditionals'
import { formMessageDescriptors } from './messages'
import { Conditional, SerializedFormField } from '../types/types'
import { genderOptions } from './select-options'

export function getReasonForLateRegistration(
  event: string
): SerializedFormField {
  const fieldName: string = 'reasonForLateRegistration'
  const fieldId: string =
    event === 'birth'
      ? `birth.child.child-view-group.${fieldName}`
      : `death.deathEvent.death-event-details.${fieldName}`
  const label: MessageDescriptor =
    event === 'birth'
      ? {
          id: 'form.customField.label.reasonForLateRegistrationBirth',
          description:
            'A form field that asks the reason for a late registration.',
          defaultMessage: 'Reason for delayed registration'
        }
      : {
          id: 'form.customField.label.reasonForLateRegistrationDeath',
          description:
            'A form field that asks the reason for a late registration.',
          defaultMessage: 'Reason for late registration'
        }
  const expression: string =
    event === 'birth'
      ? 'const pattern = /^\\d{4}-\\d{1,2}-\\d{1,2}$/; const today = new Date(); const eventDatePlusLateRegistrationTarget = new Date(values.childBirthDate); const lateRegistrationTarget = offlineCountryConfig && offlineCountryConfig.config.BIRTH.LATE_REGISTRATION_TARGET; eventDatePlusLateRegistrationTarget.setDate(eventDatePlusLateRegistrationTarget.getDate() + lateRegistrationTarget); !pattern.test(values.childBirthDate) || today < eventDatePlusLateRegistrationTarget;'
      : 'const pattern = /^\\d{4}-\\d{1,2}-\\d{1,2}$/; const today = new Date(); const eventDatePlusLateRegistrationTarget = new Date(values.deathDate); const lateRegistrationTarget = offlineCountryConfig && offlineCountryConfig.config.DEATH.REGISTRATION_TARGET; eventDatePlusLateRegistrationTarget.setDate(eventDatePlusLateRegistrationTarget.getDate() + lateRegistrationTarget); !pattern.test(values.deathDate) || today < eventDatePlusLateRegistrationTarget;'

  return {
    name: fieldName,
    customQuestionMappingId: fieldId,
    custom: true,
    required: true,
    type: 'TEXT',
    label,
    initialValue: '',
    validator: [],
    mapping: getCustomFieldMapping(fieldId),
    conditionals: [
      {
        action: 'hide',
        expression
      }
    ], // EDIT CONDITIONALS AS YOU SEE FIT
    maxLength: 250
  }
}

type ArrayElement<ArrayType> = ArrayType extends readonly (infer ElementType)[]
  ? ElementType
  : never

const idTypeOptions = [
  {
    value: 'NATIONAL_ID' as const,
    label: {
      defaultMessage: 'National ID',
      description: 'Option for form field: Type of ID',
      id: 'form.field.label.iDTypeNationalID'
    }
  },
  {
    value: 'PASSPORT' as const,
    label: {
      defaultMessage: 'Passport',
      description: 'Option for form field: Type of ID',
      id: 'form.field.label.iDTypePassport'
    }
  },
  {
    value: 'BIRTH_REGISTRATION_NUMBER' as const,
    label: {
      defaultMessage: 'Birth Registration Number',
      description: 'Option for form field: Type of ID',
      id: 'form.field.label.iDTypeBRN'
    }
  },
  {
    value: 'NONE' as const,
    label: {
      defaultMessage: 'None',
      description: 'Option for form field: Type of ID',
      id: 'form.field.label.iDTypeNone'
    }
  }
]

type IDType = ArrayElement<typeof idTypeOptions>['value']

export function getIDType(
  event: string,
  sectionId: string,
  conditionals: Conditional[] = [],
  required: boolean
): SerializedFormField {
  const fieldName: string = `${sectionId}IdType`
  const fieldId: string = `${event}.${sectionId}.${sectionId}-view-group.${fieldName}`
  return {
    name: fieldName,
    customQuestionMappingId: fieldId,
    custom: true,
    required,
    type: 'SELECT_WITH_OPTIONS',
    label: {
      id: 'form.field.label.iDType',
      description: 'A form field that asks for the type of ID.',
      defaultMessage: 'Type of ID'
    },
    initialValue: {
      dependsOn: ['idReader', 'verified'],
      expression:
        '!!$form?.idReader?.nid || $form?.verified === "verified" || $form?.verified === "authenticated" ? "NATIONAL_ID" : ""'
    },
    validator: [],
    mapping: getCustomFieldMapping(fieldId),
    placeholder: formMessageDescriptors.formSelectPlaceholder,
    conditionals,
    options: idTypeOptions
  }
}

function getValidators(configCase: string, idValue: IDType) {
  if (idValue === 'NATIONAL_ID') {
    return getNationalIDValidators(configCase)
  }
  return []
}

function initialValuesForIDType(idType: IDType) {
  if (idType === 'NATIONAL_ID') {
    // return getInitialValueFromIDReader('nid')
    return ''
  } else {
    return ''
  }
}

export function getIDNumber(
  sectionId: string,
  idValue: IDType,
  conditionals: Conditional[] = [],
  required: boolean
): SerializedFormField {
  const fieldName: string = `${sectionId}${uppercaseFirstLetter(
    camelCase(idValue)
  )}`
  const validators = getValidators(sectionId, idValue)

  return {
    name: fieldName,
    required,
    type: 'TEXT',
    custom: true,
    label: {
      id: 'form.field.label.iD',
      description: 'A form field that asks for the id number.',
      defaultMessage: 'ID number'
    },
    initialValue: initialValuesForIDType(idValue),
    validator: validators,
    mapping: {
      template: {
        fieldName: fieldName,
        operation: 'identityToFieldTransformer',
        parameters: ['id', idValue]
      },
      mutation: {
        operation: 'fieldToIdentityTransformer',
        parameters: ['id', idValue]
      },
      query: {
        operation: 'identityToFieldTransformer',
        parameters: ['id', idValue]
      }
    },
    conditionals: [
      {
        action: 'hide',
        expression: `(values.${sectionId}IdType!=="${idValue}") || (values.${sectionId}IdType==="NONE")`
      }
    ].concat(conditionals),
    maxLength: 250
  }
}

export function getIDNumberFields(
  section: string,
  conditionals: Conditional[] = [],
  required: boolean
) {
  return idTypeOptions
    .filter((opt) => opt.value !== 'NONE')
    .map((opt) => getIDNumber(section, opt.value, conditionals, required))
}
