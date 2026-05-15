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
  exactDateOfBirthUnknown,
  getAgeOfIndividualInYears,
  getMaritalStatus,
  registrationEmail,
  registrationPhone,
  divider
  // getOccupation
} from '../common/common-optional-fields'
import {
  getGender,
  getBirthDate,
  getFamilyNameField,
  getFirstNameField,
  getNationality,
  otherInformantType,
  getDetailsExist,
  getReasonNotExisting
} from '../common/common-required-fields'
import {
  deathInformantType,
  getCauseOfDeath,
  getCauseOfDeathMethod,
  getDeathDate,
  getDeathDescription,
  getMannerOfDeath
} from './required-fields'
import { formMessageDescriptors } from '../common/messages'
import { Event, ISerializedForm } from '../types/types'
import {
  informantBirthDateConditionals,
  informantFamilyNameConditionals,
  ageOfIndividualValidators,
  ageOfDeceasedConditionals,
  informantFirstNameConditionals,
  exactDateOfBirthUnknownConditional,
  isValidBirthDate /*,
  fathersDetailsExistConditionals,
  fatherFirstNameConditionals,
  fatherFamilyNameConditionals,
  fathersBirthDateConditionals,
  parentsBirthDateValidators,
  detailsExistConditional,
  motherFirstNameConditionals,
  motherFamilyNameConditionals,
  mothersBirthDateConditionals,
  mothersDetailsExistConditionals,*/,
  spouseDetailsExistConditionals,
  detailsExist,
  spouseBirthDateConditionals,
  spouseFamilyNameConditionals,
  spouseFirstNameConditionals,
  hideIfInformantSpouse,
  disableIfVerifiedOrAuthenticated,
  exactDateOfBirthUnknownConditionals,
  typeOfIDVerificationConditionals
} from '../common/default-validation-conditionals'
import {
  documentsSection,
  previewSection,
  registrationSection,
  reviewSection
} from './required-sections'
import {
  deceasedNameInEnglish,
  informantNameInEnglish /*,
  fatherNameInEnglish,
  motherNameInEnglish,*/,
  spouseNameInEnglish
} from '../common/preview-groups'
import { certificateHandlebars } from './certficate-handlebars'
import { getCommonSectionMapping } from '@countryconfig/utils/mapping/field-mapping-utils'
import { getNumberOfDependants } from '@countryconfig/form/death/custom-fields'
import {
  getIDNumberFields,
  getIDType,
  getReasonForLateRegistration
} from '@countryconfig/form/common/common-custom-fields'
import { getSectionMapping } from '@countryconfig/utils/mapping/section/death/mapping-utils'

// import { createCustomFieldExample } from '../custom-fields'

// ======================= FORM CONFIGURATION =======================

// A REGISTRATION FORM IS MADE UP OF PAGES OR "SECTIONS"

// A "SECTION" CAN BE SPLIT OVER MULTIPLE SUB-PAGES USING "GROUPS"

// GROUPS CONTAIN A FIELDS ARRAY AND EACH FIELD IS RENDERED BY A FORM FIELD FUNCTION

// MOVE FORM FIELD FUNCTIONS UP AND DOWN TO CHANGE THE VERTICAL ORDER OF FIELDS

// IN EACH GROUP, REQUIRED FIELDS MUST BE INCLUDED AS-IS FOR OPENCRVS TO FUNCTION

// OPTIONAL FIELDS CAN BE COMMENTED OUT OR REMOVED IF NOT REQUIRED

// DUPLICATE & FOLLOW THE INSTRUCTIONS IN THE createCustomFieldExample FUNCTION WHEN REQUIRED FOR ADDING NEW CUSTOM FIELDS

export const deathForm = {
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
              'Introduce the death registration process to the informant',
            description: 'Event information title for the birth',
            id: 'register.eventInfo.death.title'
          },
          conditionals: [
            {
              action: 'hide',
              expression: 'window.config.HIDE_DEATH_EVENT_REGISTER_INFORMATION'
            }
          ],
          fields: [
            {
              name: 'list',
              type: 'BULLET_LIST',
              items: [
                {
                  defaultMessage:
                    'I am going to help you make a declaration of death.',
                  description: 'Form information for birth',
                  id: 'form.section.information.death.bullet1'
                },
                {
                  defaultMessage:
                    'As the legal Informant it is important that all the information provided by you is accurate.',
                  description: 'Form information for birth',
                  id: 'form.section.information.death.bullet2'
                },
                {
                  defaultMessage:
                    'Once the declaration is processed you will receive an SMS to tell you when to visit the office to collect the certificate - Take your ID with you.',
                  description: 'Form information for birth',
                  id: 'form.section.information.death.bullet3'
                },
                {
                  defaultMessage:
                    'Make sure you collect the certificate. A death certificate is critical to support with inheritance claims and to resolve the affairs of the deceased e.g. closing bank accounts and setting loans.',
                  description: 'Form information for birth',
                  id: 'form.section.information.death.bullet4'
                }
              ],
              label: {
                id: 'register.eventInfo.death.title'
              },
              initialValue: '',
              validator: []
            }
          ]
        }
      ]
    },
    {
      id: 'deceased',
      viewType: 'form',
      name: formMessageDescriptors.deceasedName,
      title: formMessageDescriptors.deceasedTitle,
      groups: [
        {
          id: 'deceased-view-group',
          fields: [
            // ...idReaderFields(
            //   'death',
            //   'deceased',
            //   qrCodeConfig,
            //   esignetConfig,
            //   getCustomFieldMapping(
            //     `death.deceased.deceased-view-group.verified`
            //   )
            // ),
            getFirstNameField(
              'deceasedNameInEnglish',
              disableIfVerifiedOrAuthenticated,
              certificateHandlebars.deceasedFirstName
              // getInitialValueFromIDReader('firstName')
            ), // Required field.  Names in Latin characters must be provided for international passport
            getFamilyNameField(
              'deceasedNameInEnglish',
              disableIfVerifiedOrAuthenticated,
              certificateHandlebars.deceasedFamilyName
              // getInitialValueFromIDReader('familyName')
            ), // Required field.  Names in Latin characters must be provided for international passport
            getGender(
              certificateHandlebars.deceasedGender
              // getInitialValueFromIDReader('gender'),
              // disableIfVerifiedOrAuthenticated
            ), // Required field.
            getBirthDate(
              'deceasedBirthDate',
              [
                {
                  action: 'hide',
                  expression:
                    'values.exactDateOfBirthUnknown && !$form?.idReader?.birthDate && $form?.verified !== "verified" && $form?.verified !== "authenticated"'
                }
              ].concat(disableIfVerifiedOrAuthenticated),
              isValidBirthDate,
              certificateHandlebars.deceasedBirthDate
              // getInitialValueFromIDReader('birthDate')
            ), // Required field.,
            exactDateOfBirthUnknown(exactDateOfBirthUnknownConditionals),
            getAgeOfIndividualInYears(
              formMessageDescriptors.ageOfDeceased,
              exactDateOfBirthUnknownConditional.concat(
                exactDateOfBirthUnknownConditionals
              ),
              ageOfDeceasedConditionals,
              certificateHandlebars.ageOfDeceasedInYears
            ),
            getNationality(
              certificateHandlebars.deceasedNationality,
              disableIfVerifiedOrAuthenticated
            ),
            getIDType(
              'death',
              'deceased',
              typeOfIDVerificationConditionals,
              true
            ),
            ...getIDNumberFields(
              'deceased',
              typeOfIDVerificationConditionals,
              true
            ),
            getMaritalStatus(certificateHandlebars.deceasedMaritalStatus, []),
            getNumberOfDependants()
          ],
          previewGroups: [deceasedNameInEnglish]
        }
      ]
    },
    {
      id: 'deathEvent',
      viewType: 'form',
      name: formMessageDescriptors.deathEventName,
      title: formMessageDescriptors.deathEventTitle,
      groups: [
        {
          id: 'death-event-details',
          fields: [
            getDeathDate(
              'deathDate',
              [],
              [
                {
                  operation: 'isValidDeathOccurrenceDate'
                }
              ]
            ),
            getReasonForLateRegistration('death'),
            getMannerOfDeath,
            getCauseOfDeath,
            getCauseOfDeathMethod,
            getDeathDescription
            // PLACE OF DEATH FIELDS WILL RENDER HERE
          ]
        }
      ]
    },
    {
      id: 'informant',
      viewType: 'form',
      name: formMessageDescriptors.informantName,
      title: formMessageDescriptors.deathInformantTitle,
      groups: [
        {
          id: 'informant-view-group',
          fields: [
            deathInformantType,
            otherInformantType(Event.Death),
            // ...idReaderFields(
            //   'death',
            //   'informant',
            //   qrCodeConfig,
            //   esignetConfig,
            //   getCustomFieldMapping(
            //     `death.informant.informant-view-group.verified`
            //   ),
            //   informantFirstNameConditionals.concat(hideIfInformantSpouse)
            // ),
            getFirstNameField(
              'informantNameInEnglish',
              informantFirstNameConditionals.concat(
                hideIfInformantSpouse,
                disableIfVerifiedOrAuthenticated
              ),
              certificateHandlebars.informantFirstName
              // getInitialValueFromIDReader('firstName')
            ), // Required field.
            getFamilyNameField(
              'informantNameInEnglish',
              informantFamilyNameConditionals.concat(
                hideIfInformantSpouse,
                disableIfVerifiedOrAuthenticated
              ),
              certificateHandlebars.informantFamilyName
              // getInitialValueFromIDReader('familyName')
            ), // Required field.
            getBirthDate(
              'informantBirthDate',
              informantBirthDateConditionals.concat(
                hideIfInformantSpouse,
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
              hideIfInformantSpouse.concat(exactDateOfBirthUnknownConditionals)
            ),
            getAgeOfIndividualInYears(
              formMessageDescriptors.ageOfInformant,
              exactDateOfBirthUnknownConditional.concat(
                hideIfInformantSpouse,
                exactDateOfBirthUnknownConditionals
              ),
              ageOfIndividualValidators,
              certificateHandlebars.ageOfInformantInYears
            ),
            getNationality(
              certificateHandlebars.informantNationality,
              hideIfInformantSpouse.concat(disableIfVerifiedOrAuthenticated)
            ),
            getIDType(
              'death',
              'informant',
              hideIfInformantSpouse.concat(typeOfIDVerificationConditionals),
              true
            ),
            ...getIDNumberFields(
              'informant',
              hideIfInformantSpouse.concat(typeOfIDVerificationConditionals),
              true
            ),
            // ADDRESS FIELDS WILL RENDER HERE
            divider('informant-address-separator', hideIfInformantSpouse),
            registrationPhone,
            registrationEmail
          ],
          previewGroups: [informantNameInEnglish]
        }
      ],
      mapping: getCommonSectionMapping('informant')
    },
    {
      id: 'spouse',
      viewType: 'form',
      name: formMessageDescriptors.spouseSectionName,
      title: formMessageDescriptors.spouseSectionName,
      groups: [
        {
          id: 'spouse-view-group',
          fields: [
            getDetailsExist(
              formMessageDescriptors.spouseDetailsExist,
              spouseDetailsExistConditionals
            ),
            divider('spouse-details-seperator', spouseDetailsExistConditionals),
            getReasonNotExisting(certificateHandlebars.spouseReasonNotApplying),
            // ...idReaderFields(
            //   'death',
            //   'spouse',
            //   qrCodeConfig,
            //   esignetConfig,
            //   getCustomFieldMapping(`death.spouse.spouse-view-group.verified`),
            //   detailsExist
            // ),
            getFirstNameField(
              'spouseNameInEnglish',
              spouseFirstNameConditionals.concat(
                disableIfVerifiedOrAuthenticated
              ),
              certificateHandlebars.spouseFirstName
              // getInitialValueFromIDReader('firstName')
            ), // Required field. In Farajaland, we have built the option to integrate with MOSIP. So we have different conditionals for each name to check MOSIP responses.  You could always refactor firstNamesEng for a basic setup
            getFamilyNameField(
              'spouseNameInEnglish',
              spouseFamilyNameConditionals.concat(
                disableIfVerifiedOrAuthenticated
              ),
              certificateHandlebars.spouseFamilyName
              // getInitialValueFromIDReader('familyName')
            ), // Required field.
            getBirthDate(
              'spouseBirthDate',
              spouseBirthDateConditionals.concat(
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
                }
              ],
              certificateHandlebars.spouseBirthDate
              // getInitialValueFromIDReader('birthDate')
            ), // Required field.
            exactDateOfBirthUnknown(
              detailsExist.concat(exactDateOfBirthUnknownConditionals)
            ),
            getAgeOfIndividualInYears(
              formMessageDescriptors.ageOfSpouse,
              exactDateOfBirthUnknownConditional.concat(
                detailsExist,
                exactDateOfBirthUnknownConditionals
              ),
              ageOfIndividualValidators,
              certificateHandlebars.ageOfSpouseInYears
            ),
            getNationality(
              certificateHandlebars.spouseNationality,
              detailsExist.concat(disableIfVerifiedOrAuthenticated)
            ),
            getIDType(
              'death',
              'spouse',
              detailsExist.concat(typeOfIDVerificationConditionals),
              true
            ),
            ...getIDNumberFields(
              'spouse',
              detailsExist.concat(typeOfIDVerificationConditionals),
              true
            ),
            // ADDRESS FIELDS WILL RENDER HERE
            divider('spouse-address-separator')
          ],
          previewGroups: [spouseNameInEnglish]
        }
      ],
      mapping: getSectionMapping('spouse')
    },
    /*
    OTHER POSSIBLE SECTIONS FOR DEATH INCLUDE:
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
            ),
            divider(
              'mother-details-seperator',
              mothersDetailsExistConditionals
            ),
            getReasonNotExisting(certificateHandlebars.motherReasonNotApplying),
            getFirstNameField(
              'motherNameInEnglish',
              motherFirstNameConditionals,
              certificateHandlebars.motherFirstName
            ), // Required field.
            getFamilyNameField(
              'motherNameInEnglish',
              motherFamilyNameConditionals,
              certificateHandlebars.motherFamilyName
            ), // Required field.
            getBirthDate(
              'motherBirthDate',
              mothersBirthDateConditionals,
              parentsBirthDateValidators,
              certificateHandlebars.motherBirthDate
            ), // Required field.
            exactDateOfBirthUnknown(detailsExistConditional),
            getAgeOfIndividualInYears(
              formMessageDescriptors.ageOfMother,
              exactDateOfBirthUnknownConditional.concat(detailsExistConditional)
            ),
            getNationality(
              certificateHandlebars.motherNationality,
              detailsExist
            ), // Required field.
            getNationalID(
              'iD',
              detailsExist,
              getNationalIDValidators('mother'),
              certificateHandlebars.motherNID
            ),
            // preceding field of address fields
            divider('mother-nid-seperator', detailsExist),
            // ADDRESS FIELDS WILL RENDER HERE
            divider('mother-address-seperator', detailsExist),
            getOccupation(certificateHandlebars.motherOccupation, [
              {
                action: 'hide',
                expression: '!values.detailsExist'
              }
            ])
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
            getFirstNameField(
              'fatherNameInEnglish',
              fatherFirstNameConditionals,
              certificateHandlebars.fatherFirstName
            ), // Required field.
            getFamilyNameField(
              'fatherNameInEnglish',
              fatherFamilyNameConditionals,
              certificateHandlebars.fatherFamilyName
            ), // Required field.
            getBirthDate(
              'fatherBirthDate',
              fathersBirthDateConditionals,
              parentsBirthDateValidators,
              certificateHandlebars.fatherBirthDate
            ), // Required field.
            exactDateOfBirthUnknown(detailsExistConditional),
            getAgeOfIndividualInYears(
              formMessageDescriptors.ageOfFather,
              exactDateOfBirthUnknownConditional.concat(detailsExistConditional)
            ),
            getNationality(
              certificateHandlebars.fatherNationality,
              detailsExist
            ), // Required field.
            getNationalID(
              'iD',
              detailsExist,
              getNationalIDValidators('father'),
              certificateHandlebars.fatherNID
            ),
            // preceding field of address fields
            divider('father-nid-seperator', detailsExist),
            // ADDRESS FIELDS WILL RENDER HERE
            divider('father-address-seperator', detailsExist),
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
    },*/
    documentsSection,
    previewSection,
    reviewSection
  ]
} satisfies ISerializedForm
