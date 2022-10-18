export enum UserAction {
  AlertGroupsRead = 'grafana-oncall-app.alert-groups:read',
  AlertGroupsWrite = 'grafana-oncall-app.alert-groups:write',

  IntegrationsRead = 'grafana-oncall-app.integrations:read',
  IntegrationsWrite = 'grafana-oncall-app.integrations:write',

  EscalationChainsRead = 'grafana-oncall-app.escalation-chains:read',
  EscalationChainsWrite = 'grafana-oncall-app.escalation-chains:write',

  SchedulesRead = 'grafana-oncall-app.schedules:read',
  SchedulesWrite = 'grafana-oncall-app.schedules:write',

  ChatOpsRead = 'grafana-oncall-app.chatops:read',
  ChatOpsWrite = 'grafana-oncall-app.chatops:write',

  OutgoingWebhooksRead = 'grafana-oncall-app.outgoing-webhooks:read',
  OutgoingWebhooksWrite = 'grafana-oncall-app.outgoing-webhooks:write',

  MaintenanceRead = 'grafana-oncall-app.maintenance:read',
  MaintenanceWrite = 'grafana-oncall-app.maintenance:write',

  APIKeysRead = 'grafana-oncall-app.api-keys:read',
  APIKeysWrite = 'grafana-oncall-app.api-keys:write',

  NotificationSettingsRead = 'grafana-oncall-app.notification-settings:read',
  NotificationSettingsWrite = 'grafana-oncall-app.notification-settings:write',

  UserSettingsRead = 'grafana-oncall-app.user-settings:read',
  UserSettingsWrite = 'grafana-oncall-app.user-settings:write',
  UserSettingsAdmin = 'grafana-oncall-app.user-settings:admin',

  OtherSettingsRead = 'grafana-oncall-app.other-settings:read',
  OtherSettingsWrite = 'grafana-oncall-app.others-settings:write',

  // These are not oncall specific
  TeamsWrite = 'teams:write',
  PluginsInstall = 'plugins:install',
}

export type Permissions = Record<UserAction, boolean>;
