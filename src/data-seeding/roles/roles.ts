import { SCOPES, Scope } from '@opencrvs/toolkit/scopes'
import { MessageDescriptor } from 'react-intl'

type Role = {
  id: string
  label: MessageDescriptor
  scopes: Scope[]
}

export const roles: Role[] = [
  {
    id: 'FIELD_AGENT',
    label: {
      defaultMessage: 'Field Agent',
      description: 'Name for user role Field Agent',
      id: 'userRole.fieldAgent'
    },
    scopes: [
      SCOPES.RECORD_DECLARE_BIRTH,
      SCOPES.RECORD_DECLARE_DEATH,
      SCOPES.RECORD_DECLARE_MARRIAGE,
      SCOPES.RECORD_SUBMIT_INCOMPLETE,
      SCOPES.RECORD_SUBMIT_FOR_REVIEW,
      SCOPES.SEARCH_BIRTH,
      SCOPES.SEARCH_DEATH,
      SCOPES.SEARCH_MARRIAGE,
      'search[event=birth,access=all]',
      'search[event=death,access=my-jurisdiction]',
      'workqueue[id=assigned-to-you|recent|requires-updates-self|sent-for-review]',
      `record.create[event=birth|death]`,
      'record.declare[event=birth|death]',
      'record.notify[event=birth|death]'
    ]
  },
  {
    id: 'POLICE_OFFICER',
    label: {
      defaultMessage: 'Police Officer',
      description: 'Name for user role Police Officer',
      id: 'userRole.policeOfficer'
    },
    scopes: [
      SCOPES.RECORD_DECLARE_BIRTH,
      SCOPES.RECORD_DECLARE_DEATH,
      SCOPES.RECORD_DECLARE_MARRIAGE,
      SCOPES.RECORD_SUBMIT_INCOMPLETE,
      SCOPES.RECORD_SUBMIT_FOR_REVIEW,
      SCOPES.SEARCH_BIRTH,
      SCOPES.SEARCH_DEATH,
      SCOPES.SEARCH_MARRIAGE,
      'search[event=birth,access=all]',
      'search[event=death,access=all]',
      `record.create[event=birth|death]`,
      'record.declare[event=birth|death]',
      'record.notify[event=birth|death]'
    ]
  },
  {
    id: 'HOSPITAL_CLERK',
    label: {
      defaultMessage: 'Hospital Clerk',
      description: 'Name for user role Hospital Clerk',
      id: 'userRole.hospitalClerk'
    },
    scopes: [
      SCOPES.RECORD_DECLARE_BIRTH,
      SCOPES.RECORD_DECLARE_DEATH,
      SCOPES.RECORD_DECLARE_MARRIAGE,
      SCOPES.RECORD_SUBMIT_INCOMPLETE,
      SCOPES.RECORD_SUBMIT_FOR_REVIEW,
      SCOPES.SEARCH_BIRTH,
      SCOPES.SEARCH_DEATH,
      SCOPES.SEARCH_MARRIAGE,
      'search[event=birth,access=all]',
      'search[event=death,access=all]',
      'workqueue[id=assigned-to-you|recent|requires-updates-self|sent-for-review]',
      `record.create[event=birth|death]`,
      'record.declare[event=birth|death]',
      'record.notify[event=birth|death]'
    ]
  },
  {
    id: 'HEALTHCARE_WORKER',
    label: {
      defaultMessage: 'Healthcare Worker',
      description: 'Name for user role Healthcare Worker',
      id: 'userRole.healthcareWorker'
    },
    scopes: [
      SCOPES.RECORD_DECLARE_BIRTH,
      SCOPES.RECORD_DECLARE_DEATH,
      SCOPES.RECORD_DECLARE_MARRIAGE,
      SCOPES.RECORD_SUBMIT_INCOMPLETE,
      SCOPES.RECORD_SUBMIT_FOR_REVIEW,
      SCOPES.SEARCH_BIRTH,
      SCOPES.SEARCH_DEATH,
      SCOPES.SEARCH_MARRIAGE,
      'search[event=birth,access=all]',
      'search[event=death,access=all]',
      `record.create[event=birth|death]`,
      'record.declare[event=birth|death]',
      'record.notify[event=birth|death]'
    ]
  },
  {
    id: 'COMMUNITY_LEADER',
    label: {
      defaultMessage: 'Community Leader',
      description: 'Name for user role Community Leader',
      id: 'userRole.communityLeader'
    },
    scopes: [
      SCOPES.RECORD_DECLARE_BIRTH,
      SCOPES.RECORD_DECLARE_DEATH,
      SCOPES.RECORD_DECLARE_MARRIAGE,
      SCOPES.RECORD_SUBMIT_INCOMPLETE,
      SCOPES.RECORD_SUBMIT_FOR_REVIEW,
      SCOPES.RECORD_PRINT_ISSUE_CERTIFIED_COPIES,
      SCOPES.SEARCH_BIRTH,
      SCOPES.SEARCH_DEATH,
      SCOPES.SEARCH_MARRIAGE,
      SCOPES.USER_READ_ONLY_MY_AUDIT,
      'search[event=birth,access=all]',
      'search[event=death,access=all]',
      'workqueue[id=assigned-to-you|recent|sent-for-review|ready-to-print]',
      'record.create[event=birth|death]',
      'record.read[event=birth|death]',
      'record.declare[event=birth|death]',
      'record.notify[event=birth|death]',
      'record.registered.print-certified-copies[event=birth|death]'
    ]
  },
  {
    id: 'REGISTRATION_AGENT',
    label: {
      defaultMessage: 'Registration Agent',
      description: 'Name for user role Registration Agent',
      id: 'userRole.registrationAgent'
    },
    scopes: [
      SCOPES.RECORD_READ,
      SCOPES.RECORD_DECLARE_BIRTH,
      SCOPES.RECORD_DECLARE_DEATH,
      SCOPES.RECORD_DECLARE_MARRIAGE,
      SCOPES.RECORD_DECLARATION_EDIT,
      SCOPES.RECORD_SUBMIT_FOR_APPROVAL,
      SCOPES.RECORD_SUBMIT_FOR_UPDATES,
      SCOPES.RECORD_REVIEW_DUPLICATES,
      SCOPES.RECORD_DECLARATION_ARCHIVE,
      SCOPES.RECORD_DECLARATION_REINSTATE,
      SCOPES.RECORD_REGISTRATION_REQUEST_CORRECTION,
      SCOPES.RECORD_PRINT_ISSUE_CERTIFIED_COPIES,
      SCOPES.PERFORMANCE_READ,
      SCOPES.PERFORMANCE_READ_DASHBOARDS,
      SCOPES.ORGANISATION_READ_LOCATIONS_MY_OFFICE,
      SCOPES.USER_READ_ONLY_MY_AUDIT,
      SCOPES.SEARCH_BIRTH,
      SCOPES.SEARCH_DEATH,
      SCOPES.SEARCH_MARRIAGE,
      'search[event=birth,access=all]',
      'search[event=death,access=all]',
      'workqueue[id=assigned-to-you|recent|requires-completion|requires-updates-office|in-review|sent-for-approval|in-external-validation|ready-to-print|ready-to-issue]',
      'record.create[event=birth|death]',
      'record.read[event=birth|death]',
      'record.declare[event=birth|death]',
      'record.declared.validate[event=birth|death]',
      'record.declared.reject[event=birth|death]',
      'record.declared.archive[event=birth|death]',
      'record.declared.review-duplicates[event=birth|death]',
      'record.registered.print-certified-copies[event=birth|death]',
      'record.registered.request-correction[event=birth|death]'
    ]
  },
  {
    id: 'LOCAL_REGISTRAR',
    label: {
      defaultMessage: 'Local Registrar',
      description: 'Name for user role Local Registrar',
      id: 'userRole.localRegistrar'
    },
    scopes: [
      SCOPES.RECORD_READ,
      SCOPES.RECORD_DECLARE_BIRTH,
      SCOPES.RECORD_DECLARE_DEATH,
      SCOPES.RECORD_DECLARE_MARRIAGE,
      SCOPES.RECORD_DECLARATION_EDIT,
      SCOPES.RECORD_SUBMIT_FOR_UPDATES,
      SCOPES.RECORD_REVIEW_DUPLICATES,
      SCOPES.RECORD_DECLARATION_ARCHIVE,
      SCOPES.RECORD_DECLARATION_REINSTATE,
      SCOPES.RECORD_REGISTER,
      SCOPES.RECORD_REGISTRATION_CORRECT,
      SCOPES.RECORD_UNASSIGN_OTHERS,
      SCOPES.RECORD_PRINT_ISSUE_CERTIFIED_COPIES,
      SCOPES.RECORD_CONFIRM_REGISTRATION,
      SCOPES.RECORD_REJECT_REGISTRATION,
      SCOPES.PERFORMANCE_READ,
      SCOPES.PERFORMANCE_READ_DASHBOARDS,
      SCOPES.PROFILE_ELECTRONIC_SIGNATURE,
      SCOPES.USER_READ_ONLY_MY_AUDIT,
      SCOPES.ORGANISATION_READ_LOCATIONS_MY_OFFICE,
      SCOPES.SEARCH_BIRTH,
      SCOPES.SEARCH_DEATH,
      SCOPES.SEARCH_MARRIAGE,
      'search[event=birth,access=all]',
      'search[event=death,access=all]',
      'workqueue[id=assigned-to-you|recent|requires-completion|requires-updates-office|in-review-all|in-external-validation|ready-to-print|ready-to-issue]',
      'record.create[event=birth|death]',
      'record.read[event=birth|death]',
      'record.declare[event=birth|death]',
      'record.declared.reject[event=birth|death]',
      'record.declared.archive[event=birth|death]',
      'record.declared.review-duplicates[event=birth|death]',
      'record.register[event=birth|death]',
      'record.registered.print-certified-copies[event=birth|death]',
      'record.registered.correct[event=birth|death]',
      'record.unassign-others[event=birth|death]'
    ]
  },
  {
    id: 'LOCAL_SYSTEM_ADMIN',
    label: {
      defaultMessage: 'Local System Admin',
      description: 'Name for user role Local System Admin',
      id: 'userRole.localSystemAdmin'
    },
    scopes: [
      SCOPES.USER_READ_MY_OFFICE,
      SCOPES.USER_CREATE_MY_JURISDICTION,
      SCOPES.USER_UPDATE_MY_JURISDICTION,
      'user.create[role=FIELD_AGENT|POLICE_OFFICER|HOSPITAL_CLERK|HEALTHCARE_WORKER|COMMUNITY_LEADER|REGISTRATION_AGENT|LOCAL_REGISTRAR]',
      'user.edit[role=FIELD_AGENT|POLICE_OFFICER|HOSPITAL_CLERK|HEALTHCARE_WORKER|COMMUNITY_LEADER|REGISTRATION_AGENT|LOCAL_REGISTRAR]',
      SCOPES.ORGANISATION_READ_LOCATIONS_MY_JURISDICTION,
      SCOPES.PERFORMANCE_READ,
      SCOPES.PERFORMANCE_READ_DASHBOARDS,
      SCOPES.PERFORMANCE_EXPORT_VITAL_STATISTICS
    ]
  },
  {
    id: 'NATIONAL_SYSTEM_ADMIN',
    label: {
      defaultMessage: 'National System Admin',
      description: 'Name for user role National System Admin',
      id: 'userRole.nationalSystemAdmin'
    },
    scopes: [
      SCOPES.USER_CREATE,
      'user.create[role=FIELD_AGENT|POLICE_OFFICER|HOSPITAL_CLERK|HEALTHCARE_WORKER|COMMUNITY_LEADER|REGISTRATION_AGENT|LOCAL_REGISTRAR|NATIONAL_REGISTRAR|LOCAL_SYSTEM_ADMIN|NATIONAL_SYSTEM_ADMIN|PERFORMANCE_MANAGER]',
      'user.edit[role=FIELD_AGENT|POLICE_OFFICER|HOSPITAL_CLERK|HEALTHCARE_WORKER|COMMUNITY_LEADER|REGISTRATION_AGENT|LOCAL_REGISTRAR|NATIONAL_REGISTRAR|LOCAL_SYSTEM_ADMIN|NATIONAL_SYSTEM_ADMIN|PERFORMANCE_MANAGER]',
      SCOPES.USER_READ,
      SCOPES.USER_UPDATE,
      SCOPES.ORGANISATION_READ_LOCATIONS,
      SCOPES.PERFORMANCE_READ,
      SCOPES.PERFORMANCE_READ_DASHBOARDS,
      SCOPES.PERFORMANCE_EXPORT_VITAL_STATISTICS,
      SCOPES.RECORD_REINDEX,
      SCOPES.CONFIG_UPDATE_ALL
    ]
  },
  {
    id: 'PERFORMANCE_MANAGER',
    label: {
      defaultMessage: 'Performance Manager',
      description: 'Name for user role Performance Manager',
      id: 'userRole.performanceManager'
    },
    scopes: [
      SCOPES.PERFORMANCE_READ,
      SCOPES.PERFORMANCE_READ_DASHBOARDS,
      SCOPES.PERFORMANCE_EXPORT_VITAL_STATISTICS,
      SCOPES.ORGANISATION_READ_LOCATIONS
    ]
  },
  {
    id: 'NATIONAL_REGISTRAR',
    label: {
      defaultMessage: 'National Registrar',
      description: 'Name for user role National Registrar',
      id: 'userRole.nationalRegistrar'
    },
    scopes: [
      SCOPES.RECORD_READ,
      SCOPES.RECORD_DECLARE_BIRTH,
      SCOPES.RECORD_DECLARE_DEATH,
      SCOPES.RECORD_DECLARE_MARRIAGE,
      SCOPES.RECORD_SUBMIT_FOR_UPDATES,
      SCOPES.RECORD_REVIEW_DUPLICATES,
      SCOPES.RECORD_DECLARATION_ARCHIVE,
      SCOPES.RECORD_DECLARATION_REINSTATE,
      SCOPES.RECORD_REGISTER,
      SCOPES.RECORD_REGISTRATION_CORRECT,
      SCOPES.RECORD_UNASSIGN_OTHERS,
      SCOPES.RECORD_PRINT_ISSUE_CERTIFIED_COPIES,
      SCOPES.RECORD_CONFIRM_REGISTRATION,
      SCOPES.RECORD_REJECT_REGISTRATION,
      SCOPES.PERFORMANCE_READ,
      SCOPES.PERFORMANCE_READ_DASHBOARDS,
      SCOPES.PERFORMANCE_EXPORT_VITAL_STATISTICS,
      SCOPES.USER_READ_ONLY_MY_AUDIT,
      SCOPES.PROFILE_ELECTRONIC_SIGNATURE,
      SCOPES.ORGANISATION_READ_LOCATIONS_MY_OFFICE,
      SCOPES.USER_READ_MY_OFFICE,
      SCOPES.SEARCH_BIRTH,
      SCOPES.SEARCH_DEATH,
      SCOPES.SEARCH_MARRIAGE,
      'search[event=birth,access=all]',
      'search[event=death,access=all]',
      'workqueue[id=assigned-to-you|recent|requires-completion|requires-updates-office|in-review-all|in-external-validation|ready-to-print|ready-to-issue]',
      'record.create[event=birth|death]',
      'record.read[event=birth|death]',
      'record.declare[event=birth|death]',
      'record.declared.reject[event=birth|death]',
      'record.declared.archive[event=birth|death]',
      'record.declared.review-duplicates[event=birth|death]',
      'record.register[event=birth|death]',
      'record.registered.print-certified-copies[event=birth|death]',
      'record.registered.correct[event=birth|death]',
      'record.unassign-others[event=birth|death]'
    ]
  }
]
