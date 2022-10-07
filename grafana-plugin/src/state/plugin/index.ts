import { getBackendSrv } from '@grafana/runtime';
import axios from 'axios';
import { OnCallAppPluginMeta, OnCallPluginMetaJSONData, OnCallPluginMetaSecureJSONData } from 'types';

import { makeRequest } from 'network';

const ONCALL_BASE_URL = '/plugin';
const GRAFANA_PLUGIN_SETTINGS_URL = '/api/plugins/grafana-oncall-app/settings';
const SYNC_STATUS_POLLING_RETRY_LIMIT = 10;

const grafanaBackend = getBackendSrv();

type UpdateGrafanaPluginSettingsProps = {
  jsonData?: Partial<OnCallPluginMetaJSONData>;
  secureJsonData?: Partial<OnCallPluginMetaSecureJSONData>;
};

export type PluginStatusResponseBase = Pick<OnCallPluginMetaJSONData, 'license'> & {
  version: string;
};

type PluginSyncStatusResponse = PluginStatusResponseBase & {
  token_ok: boolean;
};

type PluginConnectedStatusResponse = PluginStatusResponseBase & {
  is_installed: boolean;
  token_ok: boolean;
  allow_signup: boolean;
  is_user_anonymous: boolean;
};

type CloudProvisioningConfigResponse = null;

type SelfHostedProvisioningConfigResponse = Omit<OnCallPluginMetaJSONData, 'onCallApiUrl'> & {
  onCallToken: string;
};

type InstallPluginResponse<OnCallAPIResponse = any> = Pick<OnCallPluginMetaSecureJSONData, 'grafanaToken'> & {
  onCallAPIResponse: OnCallAPIResponse;
};

type InstallationVerb = 'install' | 'sync';

export const generateInvalidOnCallApiURLErrorMsg = (onCallApiUrl: string): string =>
  `Could not communicate with your OnCall API at ${onCallApiUrl}. Validate that the URL is correct`;

export const generateUnknownErrorMsg = (verb: InstallationVerb): string =>
  `An unknown error occured when trying to ${verb} the plugin. Refresh your page and try again.`;

export const getHumanReadableErrorFromOnCallError = (
  e: any,
  onCallApiUrl: string,
  installationVerb: InstallationVerb
): string => {
  let errorMsg: string;
  const unknownErrorMsg = generateUnknownErrorMsg(installationVerb);
  const consoleMsg = `occured while trying to ${installationVerb} the plugin w/ the OnCall backend`;

  if (axios.isAxiosError(e)) {
    const { status: statusCode } = e.response;

    console.warn(`An HTTP related error ${consoleMsg}`, e.response);

    if (statusCode === 502) {
      // 502 occurs when the plugin-proxy cannot communicate w/ the OnCall API using the provided URL
      errorMsg = generateInvalidOnCallApiURLErrorMsg(onCallApiUrl);
    } else if (statusCode === 400) {
      /**
       * A 400 is 'bubbled-up' from the OnCall API. It indicates one of three cases:
       * 1. there is a communication error when OnCall API tries to contact Grafana's API
       * 2. there is an auth error when OnCall API tries to contact Grafana's API
       * 3. (likely rare) user inputs an onCallApiUrl that is not RFC 1034/1035 compliant
       *
       * Check if the response body has an 'error' JSON attribute, if it does, assume scenario 1 or 2
       * Use the error message provided to give the user more context/helpful debugging information
       */
      errorMsg = e.response.data?.error || unknownErrorMsg;
    } else {
      // this scenario shouldn't occur..
      errorMsg = unknownErrorMsg;
    }
  } else {
    // a non-axios related error occured.. this scenario shouldn't occur...
    console.warn(`An unknown error ${consoleMsg}`, e);
    errorMsg = unknownErrorMsg;
  }
  return errorMsg;
};

export const getHumanReadableErrorFromGrafanaProvisioningError = (
  e: any,
  onCallApiUrl: string,
  installationVerb: InstallationVerb
): string => {
  let errorMsg: string;

  // TODO: handle the case where user puts in a completely bogus URL that causes a CORS error (ex. https://grafana.com)
  if (axios.isAxiosError(e)) {
    // The user likely put in a bogus URL for the OnCall API URL
    console.warn('An HTTP related error occured while trying to provision the plugin w/ Grafana', e.response);
    errorMsg = generateInvalidOnCallApiURLErrorMsg(onCallApiUrl);
  } else {
    // a non-axios related error occured.. this scenario shouldn't occur...
    console.warn('An unknown error occured while trying to provision the plugin w/ Grafana', e);
    errorMsg = generateUnknownErrorMsg(installationVerb);
  }
  return errorMsg;
};

export const getGrafanaPluginSettings = async (): Promise<OnCallAppPluginMeta> =>
  grafanaBackend.get<OnCallAppPluginMeta>(GRAFANA_PLUGIN_SETTINGS_URL);

const updateGrafanaPluginSettings = async (data: UpdateGrafanaPluginSettingsProps, enabled = true) =>
  grafanaBackend.post(GRAFANA_PLUGIN_SETTINGS_URL, { ...data, enabled, pinned: true });

export const createGrafanaToken = async () => {
  const baseUrl = '/api/auth/keys';
  const keys = await grafanaBackend.get(baseUrl);
  const existingKey = keys.find((key: { id: number; name: string; role: string }) => key.name === 'OnCall');

  if (existingKey) {
    await grafanaBackend.delete(`${baseUrl}/${existingKey.id}`);
  }

  return await grafanaBackend.post(baseUrl, {
    name: 'OnCall',
    role: 'Admin',
    secondsToLive: null,
  });
};

const getPluginSyncStatus = (): Promise<PluginSyncStatusResponse> =>
  makeRequest<PluginSyncStatusResponse>(`${ONCALL_BASE_URL}/sync`, { method: 'GET' });

const timeout = (pollCount: number) => new Promise((resolve) => setTimeout(resolve, 10 * 2 ** pollCount));

/**
 * Poll, for a configured amount of time, the status of the OnCall backend data sync
 * Returns a PluginSyncStatusResponse if the sync was successful (ie. token_ok is true), otherwise null
 */
const pollOnCallDataSyncStatus = async (
  onCallApiUrl: string,
  pollCount = 0
): Promise<PluginSyncStatusResponse | string> => {
  if (pollCount > SYNC_STATUS_POLLING_RETRY_LIMIT) {
    return 'There was an issue while synchronizing data required for the plugin. Verify your OnCall backend setup (ie. that Celery workers are launched and properly configured)';
  }

  try {
    const syncResponse = await getPluginSyncStatus();
    if (syncResponse?.token_ok) {
      return syncResponse;
    }

    await timeout(pollCount);
    return await pollOnCallDataSyncStatus(onCallApiUrl, pollCount + 1);
  } catch (e) {
    return getHumanReadableErrorFromOnCallError(e, onCallApiUrl, 'sync');
  }
};

/**
 * Trigger a data sync with the OnCall backend AND then poll, for a configured amount of time, the status of that sync
 * If the
 * Returns a PluginSyncStatusResponse if the sync was succesful, otherwise null
 */
export const syncDataWithOnCall = async (onCallApiUrl: string): Promise<PluginSyncStatusResponse | string> => {
  try {
    const startSyncResponse = await makeRequest(`${ONCALL_BASE_URL}/sync`, { method: 'POST' });

    if (typeof startSyncResponse === 'string') {
      // an error occured trying to initiate the sync
      return startSyncResponse;
    }

    return await pollOnCallDataSyncStatus(onCallApiUrl);
  } catch (e) {
    return getHumanReadableErrorFromOnCallError(e, onCallApiUrl, 'sync');
  }
};

export const installPlugin = async <RT = CloudProvisioningConfigResponse>(
  selfHosted = false
): Promise<InstallPluginResponse<RT>> => {
  const { key: grafanaToken } = await createGrafanaToken();
  await updateGrafanaPluginSettings({ secureJsonData: { grafanaToken } });
  const onCallAPIResponse = await makeRequest<RT>(`${ONCALL_BASE_URL}/${selfHosted ? 'self-hosted/' : ''}install`, {
    method: 'POST',
  });
  return { grafanaToken, onCallAPIResponse };
};

export const selfHostedInstallPlugin = async (onCallApiUrl: string): Promise<string | null> => {
  let pluginInstallationOnCallResponse: InstallPluginResponse<SelfHostedProvisioningConfigResponse>;
  const errorMsgVerb: InstallationVerb = 'install';

  // Step 1. Try provisioning the plugin w/ the Grafana API
  try {
    await updateGrafanaPluginSettings({ jsonData: { onCallApiUrl: onCallApiUrl } });
  } catch (e) {
    return getHumanReadableErrorFromGrafanaProvisioningError(e, onCallApiUrl, errorMsgVerb);
  }

  /**
   * Step 2:
   * - Create a grafana token
   * - store that token in the Grafana plugin settings
   * - configure the plugin in OnCall's backend
   */
  try {
    pluginInstallationOnCallResponse = await installPlugin<SelfHostedProvisioningConfigResponse>(true);
  } catch (e) {
    return getHumanReadableErrorFromOnCallError(e, onCallApiUrl, errorMsgVerb);
  }

  // Step 3. reprovision the Grafana plugin settings, storing information that we get back from OnCall's backend
  try {
    const {
      grafanaToken,
      onCallAPIResponse: { onCallToken: onCallApiToken, ...jsonData },
    } = pluginInstallationOnCallResponse;

    await updateGrafanaPluginSettings({
      jsonData: {
        ...jsonData,
        onCallApiUrl,
      },
      secureJsonData: {
        grafanaToken,
        onCallApiToken,
      },
    });
  } catch (e) {
    return getHumanReadableErrorFromGrafanaProvisioningError(e, onCallApiUrl, errorMsgVerb);
  }

  return null;
};

export const checkIfPluginIsConnected = async (
  onCallApiUrl: string
): Promise<PluginConnectedStatusResponse | string> => {
  try {
    return await makeRequest<PluginConnectedStatusResponse>(`${ONCALL_BASE_URL}/status`, { method: 'GET' });
  } catch (e) {
    return getHumanReadableErrorFromOnCallError(e, onCallApiUrl, 'install');
  }
};

export const resetPlugin = (): Promise<void> => {
  /**
   * mark both of these objects as Required.. this will ensure that we are resetting every attribute back to null
   * and throw a type error in the event that OnCallPluginMetaJSONData or OnCallPluginMetaSecureJSONData is updated
   * but we forget to add the attribute here
   */
  const jsonData: Required<OnCallPluginMetaJSONData> = {
    stackId: null,
    orgId: null,
    onCallApiUrl: null,
    license: null,
  };
  const secureJsonData: Required<OnCallPluginMetaSecureJSONData> = {
    grafanaToken: null,
    onCallApiToken: null,
  };

  return updateGrafanaPluginSettings({ jsonData, secureJsonData }, false);
};
