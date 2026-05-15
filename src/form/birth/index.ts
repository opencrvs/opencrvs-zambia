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

import { Event, ISerializedForm } from '../types/types'
import { formMessageDescriptors } from '../common/messages'
import { informantType } from './required-fields'
import {
  getBirthDate,
  getGender,
  getFamilyNameField,
  getFirstNameField,
  getNationality,
  otherInformantType,
  getDetailsExist,
  // getMiddleNameField,
  getReasonNotExisting
} from '../common/common-required-fields'
import {
  exactDateOfBirthUnknown,
  getAgeOfIndividualInYears,
  getMaritalStatus,
  registrationEmail,
  registrationPhone,
  getEducation,
  getOccupation,
  divider
} from '../common/common-optional-fields'
import {
  attendantAtBirth,
  birthType,
  multipleBirth,
  weightAtBirth
} from './optional-fields'
import {
  childNameInEnglish,
  fatherNameInEnglish,
  informantNameInEnglish,
  motherNameInEnglish
} from '../common/preview-groups'
import {
  isValidChildBirthDate,
  hideIfInformantMotherOrFather,
  mothersDetailsExistConditionals,
  mothersBirthDateConditionals,
  parentsBirthDateValidators,
  detailsExist,
  motherFirstNameConditionals,
  motherFamilyNameConditionals,
  fathersDetailsExistConditionals,
  fathersBirthDateConditionals,
  fatherFirstNameConditionals,
  fatherFamilyNameConditionals,
  informantNotMotherOrFather,
  detailsExistConditional,
  ageOfIndividualValidators,
  ageOfParentsConditionals,
  disableIfVerifiedOrAuthenticated,
  exactDateOfBirthUnknownConditionals,
  typeOfIDVerificationConditionals
} from '../common/default-validation-conditionals'
import {
  informantFirstNameConditionals,
  informantFamilyNameConditionals,
  informantBirthDateConditionals,
  exactDateOfBirthUnknownConditional
} from '../common/default-validation-conditionals'
import {
  documentsSection,
  registrationSection,
  previewSection,
  reviewSection
} from './required-sections'
import { certificateHandlebars } from './certificate-handlebars'
import { getSectionMapping } from '@countryconfig/utils/mapping/section/birth/mapping-utils'
import { getCommonSectionMapping } from '@countryconfig/utils/mapping/field-mapping-utils'
import {
  getReasonForLateRegistration,
  getIDType,
  getIDNumberFields
} from '../common/common-custom-fields'

// import { createCustomFieldExample } from '../custom-fields'

// ======================= FORM CONFIGURATION =======================

// A REGISTRATION FORM IS MADE UP OF PAGES OR "SECTIONS"

// A "SECTION" CAN BE SPLIT OVER MULTIPLE SUB-PAGES USING "GROUPS"

// GROUPS CONTAIN A FIELDS ARRAY AND EACH FIELD IS RENDERED BY A FORM FIELD FUNCTION

// MOVE FORM FIELD FUNCTIONS UP AND DOWN TO CHANGE THE VERTICAL ORDER OF FIELDS

// IN EACH GROUP, REQUIRED FIELDS MUST BE INCLUDED AS-IS FOR OPENCRVS TO FUNCTION

// OPTIONAL FIELDS CAN BE COMMENTED OUT OR REMOVED IF NOT REQUIRED

// DUPLICATE & FOLLOW THE INSTRUCTIONS IN THE createCustomFieldExample FUNCTION WHEN REQUIRED FOR ADDING NEW CUSTOM FIELDS

export const birthForm: ISerializedForm = {
  sections: [
    registrationSection, // REQUIRED HIDDEN SECTION CONTAINING IDENTIFIERS
    {
      id: 'information',
      viewType: 'form',
      name: {
        defaultMessage: 'Information',
        description: 'Form section name for Information',
        id: 'form.section.information.name'
      },
      groups: [
        {
          id: 'information-group',
          title: {
            defaultMessage:
              'Introduce the birth registration process to the informant',
            description: 'Event information title for the birth',
            id: 'register.eventInfo.birth.title'
          },
          conditionals: [
            {
              action: 'hide',
              expression: 'window.config.HIDE_BIRTH_EVENT_REGISTER_INFORMATION'
            }
          ],
          fields: [
            {
              name: 'list',
              type: 'BULLET_LIST',
              items: [
                {
                  defaultMessage:
                    'I am going to help you make a declaration of birth.',
                  description: 'Form information for birth',
                  id: 'form.section.information.birth.bullet1'
                },
                {
                  defaultMessage:
                    'As the legal Informant it is important that all the information provided by you is accurate.',
                  description: 'Form information for birth',
                  id: 'form.section.information.birth.bullet2'
                },
                {
                  defaultMessage:
                    'Once the declaration is processed you will receive an SMS to tell you when to visit the office to collect the certificate - Take your ID with you.',
                  description: 'Form information for birth',
                  id: 'form.section.information.birth.bullet3'
                },
                {
                  defaultMessage:
                    'Make sure you collect the certificate. A birth certificate is critical for this child, especially to make their life easy later on. It will help to access health services, school examinations and government benefits.',
                  description: 'Form information for birth',
                  id: 'form.section.information.birth.bullet4'
                }
              ],
              // this is to set the title of the page
              label: {
                id: 'register.eventInfo.birth.title'
              },
              initialValue: '',
              validator: []
            }
          ]
        }
      ]
    },
    {
      id: 'child',
      viewType: 'form',
      name: formMessageDescriptors.childTab,
      title: formMessageDescriptors.childTitle,
      mapping: getSectionMapping('child'), // These mappings support configurable identifiers in the event-registration API
      groups: [
        {
          id: 'child-view-group',
          fields: [
            // COMMENT IN AND DUPLICATE AS REQUIRED IN ORDER TO CREATE A CUSTOM FIELD: createCustomFieldExample(),
            // createCustomFieldExample(),
            getFirstNameField(
              'childNameInEnglish',
              [],
              certificateHandlebars.childFirstName
            ), // Required field.  Names in Latin characters must be provided for international passport
            /*getMiddleNameField(
              'childNameInEnglish',
              [],
              certificateHandlebars.childMiddleName
            ),*/
            getFamilyNameField(
              'childNameInEnglish',
              [],
              certificateHandlebars.childFamilyName
            ), // Required field.  Names in Latin characters must be provided for international passport
            getGender(certificateHandlebars.childGender), // Required field.
            getBirthDate(
              'childBirthDate',
              [],
              isValidChildBirthDate,
              certificateHandlebars.eventDate
            ), // Required field.
            getReasonForLateRegistration('birth'),
            // PLACE OF BIRTH FIELDS WILL RENDER HERE
            divider('place-of-birth-seperator'),
            attendantAtBirth,
            birthType,
            weightAtBirth
          ],
          previewGroups: [childNameInEnglish] // Preview groups are used to structure data nicely in Review Page UI
        }
      ]
    },
    {
      id: 'informant',
      viewType: 'form',
      name: {
        defaultMessage: 'Informant',
        description: 'Form section name for Informant',
        id: 'form.section.informant.name'
      },
      title: formMessageDescriptors.birthInformantTitle,
      groups: [
        {
          id: 'informant-view-group',
          fields: [
            informantType, // Required field.
            otherInformantType(Event.Birth), // Required field.
            // ...idReaderFields(
            //   'birth',
            //   'informant',
            //   qrCodeConfig,
            //   esignetConfig,
            //   getCustomFieldMapping(
            //     `birth.informant.informant-view-group.verified`
            //   ),
            //   informantFirstNameConditionals.concat(
            //     hideIfInformantMotherOrFather
            //   )
            // ),
            getFirstNameField(
              'informantNameInEnglish',
              informantFirstNameConditionals.concat(
                hideIfInformantMotherOrFather,
                disableIfVerifiedOrAuthenticated
              ),
              certificateHandlebars.informantFirstName
              // getInitialValueFromIDReader('firstName')
            ), // Required field. In Farajaland, we have built the option to integrate with MOSIP. So we have different conditionals for each name to check MOSIP responses.  You could always refactor firstNamesEng for a basic setup
            getFamilyNameField(
              'informantNameInEnglish',
              informantFamilyNameConditionals.concat(
                hideIfInformantMotherOrFather,
                disableIfVerifiedOrAuthenticated
              ),
              certificateHandlebars.informantFamilyName
              // getInitialValueFromIDReader('familyName')
            ), // Required field.
            getBirthDate(
              'informantBirthDate',
              informantBirthDateConditionals.concat(
                hideIfInformantMotherOrFather,
                disableIfVerifiedOrAuthenticated
              ),
              [
                {
                  operation: 'dateFormatIsCorrect',
                  parameters: []
                },
                {
                  operation: 'dateInPast',
                  parameters: []
                },
                {
                  operation: 'isAgeInYearsBetween',
                  parameters: [16, 100]
                }
              ],
              certificateHandlebars.informantBirthDate
              // getInitialValueFromIDReader('birthDate')
            ), // Required field.
            exactDateOfBirthUnknown(
              hideIfInformantMotherOrFather.concat(
                exactDateOfBirthUnknownConditionals
              )
            ),
            getAgeOfIndividualInYears(
              formMessageDescriptors.ageOfInformant,
              exactDateOfBirthUnknownConditional.concat(
                hideIfInformantMotherOrFather,
                exactDateOfBirthUnknownConditionals
              ),
              ageOfIndividualValidators,
              certificateHandlebars.ageOfInformantInYears
            ),
            getNationality(
              certificateHandlebars.informantNationality,
              hideIfInformantMotherOrFather.concat(
                disableIfVerifiedOrAuthenticated
              )
            ), // Required field.
            getIDType(
              'birth',
              'informant',
              hideIfInformantMotherOrFather.concat(
                typeOfIDVerificationConditionals
              ),
              true
            ),
            ...getIDNumberFields(
              'informant',
              hideIfInformantMotherOrFather.concat(
                typeOfIDVerificationConditionals
              ),
              true
            ),
            // ADDRESS FIELDS WILL RENDER HERE
            divider('informant-address-seperator', [
              {
                action: 'hide',
                expression: informantNotMotherOrFather
              }
            ]),
            registrationPhone, // If you wish to enable automated SMS notifications to informants, include this
            registrationEmail // If you wish to enable automated Email notifications to informants, include this
          ],
          previewGroups: [informantNameInEnglish]
        }
      ],
      mapping: getCommonSectionMapping('informant')
    },
    {
      id: 'mother',
      viewType: 'form',
      name: formMessageDescriptors.motherName,
      title: formMessageDescriptors.motherTitle,
      groups: [
        {
          id: 'mother-view-group',
          fields: [
            getDetailsExist(
              formMessageDescriptors.mothersDetailsExist,
              mothersDetailsExistConditionals
            ), // Strongly recommend is required if you want to register abandoned / orphaned children!
            divider(
              'mother-details-seperator',
              mothersDetailsExistConditionals
            ),
            getReasonNotExisting(certificateHandlebars.motherReasonNotApplying), // Strongly recommend is required if you want to register abandoned / orphaned children!
            // ...idReaderFields(
            //   'birth',
            //   'mother',
            //   qrCodeConfig,
            //   esignetConfig,
            //   getCustomFieldMapping(`birth.mother.mother-view-group.verified`),
            //   detailsExist
            // ),
            getFirstNameField(
              'motherNameInEnglish',
              motherFirstNameConditionals.concat(
                disableIfVerifiedOrAuthenticated
              ),
              certificateHandlebars.motherFirstName
              // getInitialValueFromIDReader('firstName')
            ), // Required field.
            getFamilyNameField(
              'motherNameInEnglish',
              motherFamilyNameConditionals.concat(
                disableIfVerifiedOrAuthenticated
              ),
              certificateHandlebars.motherFamilyName
              // getInitialValueFromIDReader('familyName')
            ), // Required field.
            getBirthDate(
              'motherBirthDate',
              mothersBirthDateConditionals.concat(
                disableIfVerifiedOrAuthenticated
              ),
              parentsBirthDateValidators,
              certificateHandlebars.motherBirthDate
              // getInitialValueFromIDReader('birthDate')
            ), // Required field.
            exactDateOfBirthUnknown(
              detailsExistConditional.concat(
                exactDateOfBirthUnknownConditionals
              )
            ),
            getAgeOfIndividualInYears(
              formMessageDescriptors.ageOfMother,
              exactDateOfBirthUnknownConditional.concat(
                detailsExistConditional,
                exactDateOfBirthUnknownConditionals
              ),
              ageOfParentsConditionals,
              certificateHandlebars.ageOfMotherInYears
            ),
            getNationality(
              certificateHandlebars.motherNationality,
              detailsExist.concat(disableIfVerifiedOrAuthenticated)
            ), // Required field.
            getIDType(
              'birth',
              'mother',
              detailsExist.concat(typeOfIDVerificationConditionals),
              true
            ),
            ...getIDNumberFields(
              'mother',
              detailsExist.concat(typeOfIDVerificationConditionals),
              true
            ),
            // ADDRESS FIELDS WILL RENDER HERE
            divider('mother-address-seperator', detailsExist),
            getMaritalStatus(certificateHandlebars.motherMaritalStatus, [
              {
                action: 'hide',
                expression: '!values.detailsExist'
              }
            ]),
            getEducation(certificateHandlebars.motherEducationalAttainment),
            getOccupation(certificateHandlebars.motherOccupation, [
              {
                action: 'hide',
                expression: '!values.detailsExist'
              }
            ]),
            multipleBirth
          ],
          previewGroups: [motherNameInEnglish]
        }
      ],
      mapping: getSectionMapping('mother')
    },
    {
      id: 'father',
      viewType: 'form',
      name: {
        defaultMessage: 'Father',
        description: 'Form section name for Father',
        id: 'form.section.father.name'
      },
      title: {
        defaultMessage: "Father's details",
        description: 'Form section title for Father',
        id: 'form.section.father.title'
      },
      groups: [
        {
          id: 'father-view-group',
          fields: [
            getDetailsExist(
              formMessageDescriptors.fathersDetailsExist,
              fathersDetailsExistConditionals
            ), // Strongly recommend is required if you want to register abandoned / orphaned children!
            divider(
              'father-details-seperator',
              fathersDetailsExistConditionals
            ),
            getReasonNotExisting('fatherReasonNotApplying'), // Strongly recommend is required if you want to register abandoned / orphaned children!
            // ...idReaderFields(
            //   'birth',
            //   'father',
            //   qrCodeConfig,
            //   esignetConfig,
            //   getCustomFieldMapping(`birth.father.father-view-group.verified`),
            //   detailsExist
            // ),
            getFirstNameField(
              'fatherNameInEnglish',
              fatherFirstNameConditionals.concat(
                disableIfVerifiedOrAuthenticated
              ),
              certificateHandlebars.fatherFirstName
              // getInitialValueFromIDReader('firstName')
            ), // Required field.
            getFamilyNameField(
              'fatherNameInEnglish',
              fatherFamilyNameConditionals.concat(
                disableIfVerifiedOrAuthenticated
              ),
              certificateHandlebars.fatherFamilyName
              // getInitialValueFromIDReader('familyName')
            ), // Required field.
            getBirthDate(
              'fatherBirthDate',
              fathersBirthDateConditionals.concat(
                disableIfVerifiedOrAuthenticated
              ),
              parentsBirthDateValidators,
              certificateHandlebars.fatherBirthDate
              // getInitialValueFromIDReader('birthDate')
            ), // Required field.
            exactDateOfBirthUnknown(
              detailsExistConditional.concat(
                exactDateOfBirthUnknownConditionals
              )
            ),
            getAgeOfIndividualInYears(
              formMessageDescriptors.ageOfFather,
              exactDateOfBirthUnknownConditional.concat(
                detailsExistConditional,
                exactDateOfBirthUnknownConditionals
              ),
              ageOfParentsConditionals,
              certificateHandlebars.ageOfFatherInYears
            ),
            getNationality(
              certificateHandlebars.fatherNationality,
              detailsExist.concat(disableIfVerifiedOrAuthenticated)
            ), // Required field.
            getIDType(
              'birth',
              'father',
              detailsExist.concat(typeOfIDVerificationConditionals),
              true
            ),
            ...getIDNumberFields(
              'father',
              detailsExist.concat(typeOfIDVerificationConditionals),
              true
            ),
            // ADDRESS FIELDS WILL RENDER HERE
            divider('father-address-seperator', detailsExist),
            getMaritalStatus(certificateHandlebars.fatherMaritalStatus, [
              {
                action: 'hide',
                expression: '!values.detailsExist'
              }
            ]),
            getEducation(certificateHandlebars.fatherEducationalAttainment),
            getOccupation(certificateHandlebars.fatherOccupation, [
              {
                action: 'hide',
                expression: '!values.detailsExist'
              }
            ])
          ],
          previewGroups: [fatherNameInEnglish]
        }
      ],
      mapping: getSectionMapping('father')
    },
    documentsSection, // REQUIRED SECTION FOR DOCUMENT ATTACHMENTS
    previewSection, // REQUIRED SECTION TO PREVIEW DECLARATION BEFORE SUBMIT
    reviewSection // REQUIRED SECTION TO REVIEW SUBMITTED DECLARATION
  ]
}
