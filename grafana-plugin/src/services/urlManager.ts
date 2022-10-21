import qs from 'query-string';

export const updateQueryParams = (params: any, isReplace = false) => {
  const query = qs.stringify(params);

  if (isReplace) {
    window.history.replaceState(null, '', `${window.location.pathname}?${query}`);
    return;
  }

  window.history.pushState(null, '', `${window.location.pathname}?${query}`);
};

export const mergeQueryParams = (params: any) => {
  const currentParams = qs.parse(window.location.search);
  const newParams = {
    ...currentParams,
    ...params,
  };

  const query = qs.stringify(newParams);

  return query;
};
