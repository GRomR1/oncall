import React from 'react';

import { AppRootProps } from '@grafana/data';

import ChatOpsPage from 'pages/chat-ops/ChatOps';
import CloudPage from 'pages/cloud/CloudPage';
import EscalationsChainsPage from 'pages/escalation-chains/EscalationChains';
import IncidentPage2 from 'pages/incident/Incident';
import IncidentsPage2 from 'pages/incidents/Incidents';
import IntegrationsPage2 from 'pages/integrations/Integrations';
import LiveSettingsPage from 'pages/livesettings/LiveSettingsPage';
import MaintenancePage2 from 'pages/maintenance/Maintenance';
import MigrationTool from 'pages/migration-tool/MigrationTool';
import OrganizationLogPage2 from 'pages/organization-logs/OrganizationLog';
import OutgoingWebhooks2 from 'pages/outgoing_webhooks/OutgoingWebhooks';
import SchedulePage from 'pages/schedule/Schedule';
import SchedulesPage2 from 'pages/schedules/Schedules';
import SchedulesPage from 'pages/schedules_NEW/Schedules';
import SettingsPage2 from 'pages/settings/SettingsPage';
import Test from 'pages/test/Test';
import UsersPage2 from 'pages/users/Users';
import { UserAction } from 'state/userAction';

export type PageDefinition = {
  component: React.ComponentType<AppRootProps>;
  icon: string;
  id: string;
  text: string;
  hideFromTabs?: boolean;
  action?: UserAction;
};

export const pages: PageDefinition[] = [
  {
    component: IncidentsPage2,
    icon: 'bell',
    id: 'incidents',
    text: 'Alert Groups',
    action: UserAction.AlertGroupsRead,
  },
  {
    component: IncidentPage2,
    icon: 'bell',
    id: 'incident',
    text: 'Incident',
    hideFromTabs: true,
    action: UserAction.AlertGroupsRead,
  },
  {
    component: UsersPage2,
    icon: 'users-alt',
    id: 'users',
    text: 'Users',
    action: UserAction.UserSettingsRead,
  },
  {
    component: IntegrationsPage2,
    icon: 'plug',
    id: 'integrations',
    text: 'Integrations',
    action: UserAction.IntegrationsRead,
  },
  {
    component: EscalationsChainsPage,
    icon: 'list-ul',
    id: 'escalations',
    text: 'Escalation Chains',
    action: UserAction.EscalationChainsRead,
  },
  {
    component: SchedulesPage2,
    icon: 'calendar-alt',
    id: 'schedules',
    text: 'Schedules',
    action: UserAction.SchedulesRead,
  },
  {
    component: SchedulesPage,
    icon: 'calendar-alt',
    id: 'schedules-new',
    text: 'Schedules α',
    action: UserAction.SchedulesRead,
  },
  {
    component: SchedulePage,
    icon: 'calendar-alt',
    id: 'schedule',
    text: 'Schedule',
    hideFromTabs: true,
    action: UserAction.SchedulesRead,
  },
  {
    component: ChatOpsPage,
    icon: 'comments-alt',
    id: 'chat-ops',
    text: 'ChatOps',
    action: UserAction.ChatOpsRead,
  },
  {
    component: ChatOpsPage,
    icon: 'comments-alt',
    id: 'slack',
    text: 'ChatOps',
    hideFromTabs: true,
    action: UserAction.ChatOpsRead,
  },
  {
    component: OutgoingWebhooks2,
    icon: 'link',
    id: 'outgoing_webhooks',
    text: 'Outgoing Webhooks',
    action: UserAction.OutgoingWebhooksRead,
  },
  {
    component: MaintenancePage2,
    icon: 'wrench',
    id: 'maintenance',
    text: 'Maintenance',
    action: UserAction.MaintenanceRead,
  },
  {
    component: SettingsPage2,
    icon: 'cog',
    id: 'settings',
    text: 'Settings',
    action: UserAction.OtherSettingsRead,
  },
  {
    component: LiveSettingsPage,
    icon: 'table',
    id: 'live-settings',
    text: 'Env Variables',
    action: UserAction.OtherSettingsRead,
  },
  {
    component: CloudPage,
    icon: 'cloud',
    id: 'cloud',
    text: 'Cloud',
    action: UserAction.OtherSettingsWrite,
  },
  // TODO: should the following pages have any permissions associated with them?
  {
    component: OrganizationLogPage2,
    icon: 'gf-logs',
    id: 'organization-logs',
    text: 'Org Logs',
    hideFromTabs: true,
  },
  {
    component: MigrationTool,
    icon: 'import',
    id: 'migration-tool',
    text: 'Migrate From Amixr.IO',
    hideFromTabs: true,
  },
  {
    component: Test,
    icon: 'cog',
    id: 'test',
    text: 'Test',
    hideFromTabs: true,
  },
];
