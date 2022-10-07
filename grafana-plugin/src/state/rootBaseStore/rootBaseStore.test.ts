import { OrgRole } from '@grafana/data';
import { contextSrv as contextSrvOriginal } from 'grafana/app/core/core';
import { OnCallAppPluginMeta } from 'types';

import {
  checkIfPluginIsConnected as checkIfPluginIsConnectedOriginal,
  getHumanReadableErrorFromOnCallError as getHumanReadableErrorFromOnCallErrorOriginal,
  installPlugin as installPluginOriginal,
  syncDataWithOnCall as syncDataWithOnCallOriginal,
} from 'state/plugin';

import { RootBaseStore } from './';

const checkIfPluginIsConnected = checkIfPluginIsConnectedOriginal as jest.Mock<
  ReturnType<typeof checkIfPluginIsConnectedOriginal>
>;
const getHumanReadableErrorFromOnCallError = getHumanReadableErrorFromOnCallErrorOriginal as jest.Mock<
  ReturnType<typeof getHumanReadableErrorFromOnCallErrorOriginal>
>;
const installPlugin = installPluginOriginal as jest.Mock<ReturnType<typeof installPluginOriginal>>;
const syncDataWithOnCall = syncDataWithOnCallOriginal as jest.Mock<ReturnType<typeof syncDataWithOnCallOriginal>>;
const contextSrv = contextSrvOriginal as { hasRole: jest.Mock<ReturnType<typeof contextSrvOriginal['hasRole']>> };

jest.mock('state/plugin');

const generatePluginData = (
  onCallApiUrl: OnCallAppPluginMeta['jsonData']['onCallApiUrl'] = null
): OnCallAppPluginMeta =>
  ({
    jsonData: onCallApiUrl === null ? null : { onCallApiUrl },
  } as OnCallAppPluginMeta);

describe('rootBaseStore', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test("onCallApiUrl is not set in the plugin's meta jsonData", async () => {
    // mocks/setup
    const rootBaseStore = new RootBaseStore();

    // test
    await rootBaseStore.setupPlugin(generatePluginData());

    // assertions
    expect(rootBaseStore.appLoading).toBe(false);
    expect(rootBaseStore.initializationError).toEqual('🚫 Plugin has not been initialized');
  });

  test('when there is an issue checking the plugin connection, the error is properly handled', async () => {
    // mocks/setup
    const errorMsg = 'ohhh noooo error';
    const onCallApiUrl = 'http://asdfasdf.com';
    const rootBaseStore = new RootBaseStore();

    checkIfPluginIsConnected.mockResolvedValueOnce(errorMsg);

    // test
    await rootBaseStore.setupPlugin(generatePluginData(onCallApiUrl));

    // assertions
    expect(checkIfPluginIsConnected).toHaveBeenCalledTimes(1);
    expect(checkIfPluginIsConnected).toHaveBeenCalledWith(onCallApiUrl);

    expect(rootBaseStore.appLoading).toBe(false);
    expect(rootBaseStore.initializationError).toEqual(errorMsg);
  });

  test('anonymous user', async () => {
    // mocks/setup
    const onCallApiUrl = 'http://asdfasdf.com';
    const rootBaseStore = new RootBaseStore();

    checkIfPluginIsConnected.mockResolvedValueOnce({
      is_user_anonymous: true,
      is_installed: true,
      token_ok: true,
      allow_signup: true,
      version: 'asdfasdf',
      license: 'asdfasdf',
    });

    // test
    await rootBaseStore.setupPlugin(generatePluginData(onCallApiUrl));

    // assertions
    expect(checkIfPluginIsConnected).toHaveBeenCalledTimes(1);
    expect(checkIfPluginIsConnected).toHaveBeenCalledWith(onCallApiUrl);

    expect(rootBaseStore.appLoading).toBe(false);
    expect(rootBaseStore.initializationError).toEqual(
      '😞 Unfortunately Grafana OnCall is available for authorized users only, please sign in to proceed.'
    );
  });

  test('the plugin is not installed, and allow_signup is false', async () => {
    // mocks/setup
    const onCallApiUrl = 'http://asdfasdf.com';
    const rootBaseStore = new RootBaseStore();

    checkIfPluginIsConnected.mockResolvedValueOnce({
      is_user_anonymous: false,
      is_installed: false,
      token_ok: true,
      allow_signup: false,
      version: 'asdfasdf',
      license: 'asdfasdf',
    });
    installPlugin.mockResolvedValueOnce(null);

    // test
    await rootBaseStore.setupPlugin(generatePluginData(onCallApiUrl));

    // assertions
    expect(checkIfPluginIsConnected).toHaveBeenCalledTimes(1);
    expect(checkIfPluginIsConnected).toHaveBeenCalledWith(onCallApiUrl);

    expect(installPlugin).toHaveBeenCalledTimes(0);

    expect(rootBaseStore.appLoading).toBe(false);
    expect(rootBaseStore.initializationError).toEqual(
      '🚫 OnCall has temporarily disabled signup of new users. Please try again later.'
    );
  });

  test('plugin is not installed, user is not an Admin', async () => {
    // mocks/setup
    const onCallApiUrl = 'http://asdfasdf.com';
    const rootBaseStore = new RootBaseStore();

    checkIfPluginIsConnected.mockResolvedValueOnce({
      is_user_anonymous: false,
      is_installed: false,
      token_ok: true,
      allow_signup: true,
      version: 'asdfasdf',
      license: 'asdfasdf',
    });
    contextSrv.hasRole.mockReturnValueOnce(false);
    installPlugin.mockResolvedValueOnce(null);

    // test
    await rootBaseStore.setupPlugin(generatePluginData(onCallApiUrl));

    // assertions
    expect(checkIfPluginIsConnected).toHaveBeenCalledTimes(1);
    expect(checkIfPluginIsConnected).toHaveBeenCalledWith(onCallApiUrl);

    expect(contextSrv.hasRole).toHaveBeenCalledTimes(1);
    expect(contextSrv.hasRole).toHaveBeenCalledWith(OrgRole.Admin);

    expect(installPlugin).toHaveBeenCalledTimes(0);

    expect(rootBaseStore.appLoading).toBe(false);
    expect(rootBaseStore.initializationError).toEqual(
      '🚫 Admin must sign on to setup OnCall before a Viewer can use it'
    );
  });

  test('plugin is not installed, signup is allowed, user is an admin, plugin installation is triggered', async () => {
    // mocks/setup
    const onCallApiUrl = 'http://asdfasdf.com';
    const rootBaseStore = new RootBaseStore();
    const mockedLoadCurrentUser = jest.fn();

    checkIfPluginIsConnected.mockResolvedValueOnce({
      is_user_anonymous: false,
      is_installed: false,
      token_ok: true,
      allow_signup: true,
      version: 'asdfasdf',
      license: 'asdfasdf',
    });
    contextSrv.hasRole.mockReturnValueOnce(true);
    installPlugin.mockResolvedValueOnce(null);
    rootBaseStore.userStore.loadCurrentUser = mockedLoadCurrentUser;

    // test
    await rootBaseStore.setupPlugin(generatePluginData(onCallApiUrl));

    // assertions
    expect(checkIfPluginIsConnected).toHaveBeenCalledTimes(1);
    expect(checkIfPluginIsConnected).toHaveBeenCalledWith(onCallApiUrl);

    expect(contextSrv.hasRole).toHaveBeenCalledTimes(1);
    expect(contextSrv.hasRole).toHaveBeenCalledWith(OrgRole.Admin);

    expect(installPlugin).toHaveBeenCalledTimes(1);
    expect(installPlugin).toHaveBeenCalledWith();

    expect(mockedLoadCurrentUser).toHaveBeenCalledTimes(1);
    expect(mockedLoadCurrentUser).toHaveBeenCalledWith();

    expect(rootBaseStore.appLoading).toBe(false);
    expect(rootBaseStore.initializationError).toBeNull();
  });

  test('plugin is not installed, signup is allowed, the user is an admin, and plugin installation throws an error', async () => {
    // mocks/setup
    const onCallApiUrl = 'http://asdfasdf.com';
    const rootBaseStore = new RootBaseStore();
    const installPluginError = new Error('asdasdfasdfasf');
    const humanReadableErrorMsg = 'asdfasldkfjaksdjflk';

    checkIfPluginIsConnected.mockResolvedValueOnce({
      is_user_anonymous: false,
      is_installed: false,
      token_ok: true,
      allow_signup: true,
      version: 'asdfasdf',
      license: 'asdfasdf',
    });
    contextSrv.hasRole.mockReturnValueOnce(true);
    installPlugin.mockRejectedValueOnce(installPluginError);
    getHumanReadableErrorFromOnCallError.mockReturnValueOnce(humanReadableErrorMsg);

    // test
    await rootBaseStore.setupPlugin(generatePluginData(onCallApiUrl));

    // assertions
    expect(checkIfPluginIsConnected).toHaveBeenCalledTimes(1);
    expect(checkIfPluginIsConnected).toHaveBeenCalledWith(onCallApiUrl);

    expect(contextSrv.hasRole).toHaveBeenCalledTimes(1);
    expect(contextSrv.hasRole).toHaveBeenCalledWith(OrgRole.Admin);

    expect(installPlugin).toHaveBeenCalledTimes(1);
    expect(installPlugin).toHaveBeenCalledWith();

    expect(getHumanReadableErrorFromOnCallError).toHaveBeenCalledTimes(1);
    expect(getHumanReadableErrorFromOnCallError).toHaveBeenCalledWith(installPluginError, onCallApiUrl, 'install');

    expect(rootBaseStore.appLoading).toBe(false);
    expect(rootBaseStore.initializationError).toEqual(humanReadableErrorMsg);
  });

  test('when the plugin is installed, a data sync is triggered', async () => {
    // mocks/setup
    const onCallApiUrl = 'http://asdfasdf.com';
    const rootBaseStore = new RootBaseStore();
    const mockedLoadCurrentUser = jest.fn();
    const version = 'asdfalkjslkjdf';
    const license = 'lkjdkjfdkjfdjkfd';

    checkIfPluginIsConnected.mockResolvedValueOnce({
      is_user_anonymous: false,
      is_installed: true,
      token_ok: true,
      allow_signup: true,
      version: 'asdfasdf',
      license: 'asdfasdf',
    });
    syncDataWithOnCall.mockResolvedValueOnce({ version, license, token_ok: true });
    rootBaseStore.userStore.loadCurrentUser = mockedLoadCurrentUser;

    // test
    await rootBaseStore.setupPlugin(generatePluginData(onCallApiUrl));

    // assertions
    expect(checkIfPluginIsConnected).toHaveBeenCalledTimes(1);
    expect(checkIfPluginIsConnected).toHaveBeenCalledWith(onCallApiUrl);

    expect(syncDataWithOnCall).toHaveBeenCalledTimes(1);
    expect(syncDataWithOnCall).toHaveBeenCalledWith(onCallApiUrl);

    expect(mockedLoadCurrentUser).toHaveBeenCalledTimes(1);
    expect(mockedLoadCurrentUser).toHaveBeenCalledWith();

    expect(rootBaseStore.appLoading).toBe(false);
    expect(rootBaseStore.initializationError).toBeNull();
  });

  test('when the plugin is installed, and the data sync returns an error, it is properly handled', async () => {
    // mocks/setup
    const onCallApiUrl = 'http://asdfasdf.com';
    const rootBaseStore = new RootBaseStore();
    const mockedLoadCurrentUser = jest.fn();
    const syncDataWithOnCallError = 'asdasdfasdfasf';

    checkIfPluginIsConnected.mockResolvedValueOnce({
      is_user_anonymous: false,
      is_installed: true,
      token_ok: true,
      allow_signup: true,
      version: 'asdfasdf',
      license: 'asdfasdf',
    });
    syncDataWithOnCall.mockResolvedValueOnce(syncDataWithOnCallError);
    rootBaseStore.userStore.loadCurrentUser = mockedLoadCurrentUser;

    // test
    await rootBaseStore.setupPlugin(generatePluginData(onCallApiUrl));

    // assertions
    expect(checkIfPluginIsConnected).toHaveBeenCalledTimes(1);
    expect(checkIfPluginIsConnected).toHaveBeenCalledWith(onCallApiUrl);

    expect(syncDataWithOnCall).toHaveBeenCalledTimes(1);
    expect(syncDataWithOnCall).toHaveBeenCalledWith(onCallApiUrl);

    expect(rootBaseStore.appLoading).toBe(false);
    expect(rootBaseStore.initializationError).toEqual(syncDataWithOnCallError);
  });
});
