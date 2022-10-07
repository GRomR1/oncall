import React, { FC, PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';

import { locationService } from '@grafana/runtime';
import { Button, HorizontalGroup, LinkButton } from '@grafana/ui';
import classnames from 'classnames';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isoWeek from 'dayjs/plugin/isoWeek';
import localeData from 'dayjs/plugin/localeData';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import weekday from 'dayjs/plugin/weekday';
import { observer, Provider } from 'mobx-react';
import Header from 'navbar/Header/Header';
import LegacyNavTabsBar from 'navbar/LegacyNavTabsBar';
import { AppRootProps } from 'types';

import DefaultPageLayout from 'containers/DefaultPageLayout/DefaultPageLayout';
import logo from 'img/logo.svg';
import 'interceptors';
import { pages } from 'pages';
import { routes } from 'pages/routes';
import { rootStore } from 'state';
import { useStore } from 'state/useStore';
import { useQueryParams, useQueryPath } from 'utils/hooks';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(weekday);
dayjs.extend(localeData);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(isoWeek);

import 'style/vars.css';
import 'style/global.css';
import 'style/utils.css';

import { isTopNavbar } from './GrafanaPluginRootPage.helpers';

export const GrafanaPluginRootPage = (props: AppRootProps) => (
  <Provider store={rootStore}>
    <RootWithLoader {...props} />
  </Provider>
);

type PluginSetupWrapperProps = PropsWithChildren & {
  text: string;
};
const PluginSetupWrapper: FC<PluginSetupWrapperProps> = ({ text, children }) => (
  <div className="spin">
    <img alt="Grafana OnCall Logo" src={logo} />
    <div className="spin-text">{text}</div>
    {children}
  </div>
);

const RootWithLoader = observer((props: AppRootProps) => {
  const store = useStore();

  const setupPlugin = useCallback(() => store.setupPlugin(props.meta), [props.meta]);

  useEffect(() => {
    setupPlugin();
  }, []);

  if (store.appLoading) {
    return <PluginSetupWrapper text="Initializing plugin..." />;
  }

  if (store.initializationError) {
    return (
      <PluginSetupWrapper text={`🚫 Error during initialization: ${store.initializationError}`}>
        <div className="configure-plugin">
          <HorizontalGroup>
            <Button variant="primary" onClick={setupPlugin} size="sm">
              Retry
            </Button>
            <LinkButton href={`/plugins/grafana-oncall-app?page=configuration`} variant="primary" size="sm">
              Configure Plugin
            </LinkButton>
          </HorizontalGroup>
        </div>
      </PluginSetupWrapper>
    );
  }

  return <Root {...props} />;
});

export const Root = observer((props: AppRootProps) => {
  const [didFinishLoading, setDidFinishLoading] = useState(false);
  const queryParams = useQueryParams();
  const page = queryParams.get('page');
  const path = useQueryPath();

  // Required to support grafana instances that use a custom `root_url`.
  const pathWithoutLeadingSlash = path.replace(/^\//, '');

  const store = useStore();

  useEffect(() => {
    updateBasicData();
  }, []);

  useEffect(() => {
    let link = document.createElement('link');
    link.type = 'text/css';
    link.rel = 'stylesheet';
    link.href = '/public/plugins/grafana-oncall-app/img/grafanaGlobalStyles.css';

    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const updateBasicData = async () => {
    await store.updateBasicData();
    setDidFinishLoading(true);
  };

  const Page = useMemo(() => getPageMatchingComponent(page), [page]);

  if (!didFinishLoading) {
    return null;
  }

  return (
    <DefaultPageLayout {...props}>
      {!isTopNavbar() && (
        <>
          <Header page={page} backendLicense={store.backendLicense} />
          <nav className="page-container">
            <LegacyNavTabsBar currentPage={page} />
          </nav>
        </>
      )}

      <div
        className={classnames(
          { 'page-container': !isTopNavbar() },
          { 'page-body': !isTopNavbar() },
          'u-position-relative'
        )}
      >
        <Page {...props} path={pathWithoutLeadingSlash} store={store} />
      </div>
    </DefaultPageLayout>
  );
});

function getPageMatchingComponent(pageId: string): (props?: any) => JSX.Element {
  let matchingPage = routes[pageId];
  if (!matchingPage) {
    const defaultPageId = pages['incidents'].id;
    matchingPage = routes[defaultPageId];
    locationService.replace(pages[defaultPageId].path);
  }

  return matchingPage.component;
}
