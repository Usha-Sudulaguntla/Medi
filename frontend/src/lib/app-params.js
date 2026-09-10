// Simplified replacement for the Base44 SDK's app-params helper. Only
// OAuthConsent.jsx (a Base44-platform MCP feature that isn't reimplemented
// in this self-hosted backend — see README.md's "Not migrated" section)
// still imports this. Kept minimal so that page doesn't hard-crash on
// import; it just won't get a working consent flow.

const isNode = typeof window === 'undefined';

const isClearAccessTokenRequested = () =>
  !isNode && new URLSearchParams(window.location.search).get('clear_access_token') === 'true';

const clearStoredToken = () => {
  window.localStorage.removeItem('token');
};

if (!isNode && isClearAccessTokenRequested()) {
  clearStoredToken();
}

export const appParams = {
  get token() {
    return isNode ? null : window.localStorage.getItem('token');
  },
  appId: 'medikiosk',
};
