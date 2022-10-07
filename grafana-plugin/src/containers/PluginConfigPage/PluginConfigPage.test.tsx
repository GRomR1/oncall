import React from 'react';

import { render, RenderResult, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import { OnCallPluginConfigPageProps } from 'types';

import {
  checkIfPluginIsConnected as checkIfPluginIsConnectedOriginal,
  resetPlugin as resetPluginOriginal,
  syncDataWithOnCall as syncDataWithOnCallOriginal,
  selfHostedInstallPlugin as selfHostedInstallPluginOriginal,
} from 'state/plugin';

import PluginConfigPage from './PluginConfigPage';

const checkIfPluginIsConnected = checkIfPluginIsConnectedOriginal as jest.Mock<
  ReturnType<typeof checkIfPluginIsConnectedOriginal>
>;
const resetPlugin = resetPluginOriginal as jest.Mock<ReturnType<typeof resetPluginOriginal>>;
const selfHostedInstallPlugin = selfHostedInstallPluginOriginal as jest.Mock<
  ReturnType<typeof selfHostedInstallPluginOriginal>
>;
const syncDataWithOnCall = syncDataWithOnCallOriginal as jest.Mock<ReturnType<typeof syncDataWithOnCallOriginal>>;

jest.mock('state/plugin');

enum License {
  OSS = 'OpenSource',
  CLOUD = 'some-other-license',
}

const SELF_HOSTED_INSTALL_PLUGIN_ERROR_MESSAGE = 'ohhh nooo an error msg from self hosted install plugin';
const CHECK_IF_PLUGIN_IS_CONNECTED_ERROR_MESSAGE = 'ohhh nooo a plugin connection error';
const SNYC_DATA_WITH_ONCALL_ERROR_MESSAGE = 'ohhh noooo a sync issue';

const mockSyncDataWithOnCall = (license: License = License.OSS) => {
  syncDataWithOnCall.mockResolvedValueOnce({
    token_ok: true,
    license,
    version: 'v1.2.3',
  });
};

const generateComponentProps = (
  onCallApiUrl: OnCallPluginConfigPageProps['plugin']['meta']['jsonData']['onCallApiUrl'] = null
): OnCallPluginConfigPageProps =>
  ({
    plugin: {
      meta: {
        jsonData: onCallApiUrl === null ? null : { onCallApiUrl },
      },
    },
  } as OnCallPluginConfigPageProps);

describe('ConfigurationForm', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test("If onCallApiUrl is not set in the plugin's meta jsonData, or in process.env, checkIfPluginIsConnected is not called, and the configuration form is shown", async () => {
    // mocks
    delete process.env.ONCALL_API_URL;

    checkIfPluginIsConnected.mockImplementation();
    syncDataWithOnCall.mockImplementation();

    // test setup
    let component: ReactTestRenderer;
    await act(async () => {
      component = renderer.create(<PluginConfigPage {...generateComponentProps()} />);
    });

    // assertions
    expect(checkIfPluginIsConnected).not.toHaveBeenCalled();
    expect(syncDataWithOnCall).not.toHaveBeenCalled();
    expect(component).toMatchSnapshot();
  });

  test("If onCallApiUrl is not set in the plugin's meta jsonData, and ONCALL_API_URL is passed in process.env, it calls selfHostedInstallPlugin", async () => {
    // mocks
    const processEnvOnCallApiUrl = 'onCallApiUrlFromProcessEnv';
    process.env.ONCALL_API_URL = processEnvOnCallApiUrl;

    mockSyncDataWithOnCall();

    // test setup
    await act(async () => {
      renderer.create(<PluginConfigPage {...generateComponentProps()} />);
    });

    // assertions
    expect(selfHostedInstallPlugin).toHaveBeenCalledTimes(1);
    expect(selfHostedInstallPlugin).toHaveBeenCalledWith(processEnvOnCallApiUrl);
  });

  test("If onCallApiUrl is not set in the plugin's meta jsonData, and ONCALL_API_URL is passed in process.env, and there is an error calling selfHostedInstallPlugin, it sets an error message", async () => {
    // mocks
    const processEnvOnCallApiUrl = 'onCallApiUrlFromProcessEnv';
    process.env.ONCALL_API_URL = processEnvOnCallApiUrl;

    selfHostedInstallPlugin.mockResolvedValueOnce(SELF_HOSTED_INSTALL_PLUGIN_ERROR_MESSAGE);

    // test setup
    let component: ReactTestRenderer;
    await act(async () => {
      component = renderer.create(<PluginConfigPage {...generateComponentProps()} />);
    });

    // assertions
    expect(selfHostedInstallPlugin).toHaveBeenCalledTimes(1);
    expect(selfHostedInstallPlugin).toHaveBeenCalledWith(processEnvOnCallApiUrl);
    expect(component).toMatchSnapshot();
  });

  test('If onCallApiUrl is set, and checkIfPluginIsConnected returns an error, it sets an error message', async () => {
    // mocks
    const processEnvOnCallApiUrl = 'onCallApiUrlFromProcessEnv';
    const metaJsonDataOnCallApiUrl = 'onCallApiUrlFromMetaJsonData';

    process.env.ONCALL_API_URL = processEnvOnCallApiUrl;

    checkIfPluginIsConnected.mockResolvedValueOnce(CHECK_IF_PLUGIN_IS_CONNECTED_ERROR_MESSAGE);

    // test setup
    let component: ReactTestRenderer;
    await act(async () => {
      component = renderer.create(<PluginConfigPage {...generateComponentProps(metaJsonDataOnCallApiUrl)} />);
    });

    // assertions
    expect(checkIfPluginIsConnected).toHaveBeenCalledTimes(1);
    expect(checkIfPluginIsConnected).toHaveBeenCalledWith(metaJsonDataOnCallApiUrl);
    expect(component).toMatchSnapshot();
  });

  test('OnCallApiUrl is set, and syncDataWithOnCall returns an error', async () => {
    // mocks
    const processEnvOnCallApiUrl = 'onCallApiUrlFromProcessEnv';
    const metaJsonDataOnCallApiUrl = 'onCallApiUrlFromMetaJsonData';

    process.env.ONCALL_API_URL = processEnvOnCallApiUrl;

    checkIfPluginIsConnected.mockResolvedValueOnce(null);
    syncDataWithOnCall.mockResolvedValueOnce(SNYC_DATA_WITH_ONCALL_ERROR_MESSAGE);

    // test setup
    let component: ReactTestRenderer;
    await act(async () => {
      component = renderer.create(<PluginConfigPage {...generateComponentProps(metaJsonDataOnCallApiUrl)} />);
    });

    // assertions
    expect(checkIfPluginIsConnected).toHaveBeenCalledTimes(1);
    expect(checkIfPluginIsConnected).toHaveBeenCalledWith(metaJsonDataOnCallApiUrl);
    expect(component).toMatchSnapshot();
  });

  test.each([License.CLOUD, License.OSS])(
    'OnCallApiUrl is set, and syncDataWithOnCall does not return an error. It displays properly the plugin connected items based on the license - License: %s',
    async (license) => {
      // mocks
      const processEnvOnCallApiUrl = 'onCallApiUrlFromProcessEnv';
      const metaJsonDataOnCallApiUrl = 'onCallApiUrlFromMetaJsonData';

      process.env.ONCALL_API_URL = processEnvOnCallApiUrl;

      checkIfPluginIsConnected.mockResolvedValueOnce(null);
      mockSyncDataWithOnCall(license);

      // test setup
      let component: ReactTestRenderer;
      await act(async () => {
        component = renderer.create(<PluginConfigPage {...generateComponentProps(metaJsonDataOnCallApiUrl)} />);
      });

      // assertions
      expect(checkIfPluginIsConnected).toHaveBeenCalledTimes(1);
      expect(checkIfPluginIsConnected).toHaveBeenCalledWith(metaJsonDataOnCallApiUrl);
      expect(component).toMatchSnapshot();
    }
  );

  // TODO:
  test.skip('Successful plugin reset', async () => {
    // mocks
    const processEnvOnCallApiUrl = 'onCallApiUrlFromProcessEnv';
    const metaJsonDataOnCallApiUrl = 'onCallApiUrlFromMetaJsonData';

    process.env.ONCALL_API_URL = processEnvOnCallApiUrl;

    checkIfPluginIsConnected.mockResolvedValueOnce(null);
    mockSyncDataWithOnCall(License.OSS);
    resetPlugin.mockResolvedValueOnce();

    // test setup
    let component: RenderResult;
    await act(async () => {
      component = render(<PluginConfigPage {...generateComponentProps(metaJsonDataOnCallApiUrl)} />);
    });

    // // TODO:
    // // const user = userEvent.setup();
    // // await user.click(screen.getByRole('button'));

    const user = userEvent.setup();
    // const component = render(<PluginConfigPage {...generateComponentProps(metaJsonDataOnCallApiUrl)} />);
    await user.click(screen.getByRole('button'));

    // assertions
    expect(checkIfPluginIsConnected).toHaveBeenCalledTimes(1);
    expect(checkIfPluginIsConnected).toHaveBeenCalledWith(metaJsonDataOnCallApiUrl);

    expect(syncDataWithOnCall).toHaveBeenCalledTimes(1);
    expect(syncDataWithOnCall).toHaveBeenCalledWith(metaJsonDataOnCallApiUrl);

    expect(resetPlugin).toHaveBeenCalledTimes(1);
    expect(resetPlugin).toHaveBeenCalledWith();

    expect(component).toMatchSnapshot();
  });

  // TODO:
  test.skip('Unsuccessful plugin reset', () => {});
});
