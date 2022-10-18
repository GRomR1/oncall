import { Permissions } from 'state/userAction';

export interface OnCallAppSettings {
  onCallApiUrl?: string;
  grafanaUrl?: string;
  license?: string;
}

export type GrafanaUser = {
  permissions: Permissions;
};

declare global {
  interface Window {
    grafanaBootData: {
      /**
       * TODO: can grafanaBootData be properly typed?
       * aka is there an exported from grafana/app/core/core
       * that could be used here?
       */
      user: GrafanaUser;
    };
    RECAPTCHA_SITE_KEY: string;
    grecaptcha: any;
    dataLayer: any;
    mixpanel: any;
  }
}
