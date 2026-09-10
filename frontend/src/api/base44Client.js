// Replacement for the Base44 SDK client. Same file path, same `base44`
// export shape as before, so none of this app's ~19 importing components
// needed to change. Talks to the self-hosted Express API instead of Base44.

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787/api';
const TOKEN_KEY = 'token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

// Google OAuth lands the user back on whatever `returnTo` page they started
// from, with ?token=... in the query string (see routes/auth.js's
// /google/callback). Pick it up once on load, wherever it appears, and strip
// it from the URL so it doesn't linger in browser history.
(function consumeOAuthTokenFromUrl() {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  const token = url.searchParams.get('token');
  if (token) {
    setToken(token);
    url.searchParams.delete('token');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
  }
})();

async function request(path, { method = 'GET', body, isForm = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!isForm && body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? (isForm ? body : JSON.stringify(body)) : undefined,
  });

  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function buildQuery({ filters = {}, sort, limit } = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, v);
  });
  if (sort) params.set('sort', sort);
  if (limit) params.set('limit', String(limit));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

function makeEntity(resource) {
  return {
    // list(sort?, limit?) — no filters, mirrors Base44's entities.X.list()
    list: (sort, limit) => request(`/${resource}${buildQuery({ sort, limit })}`),
    // filter(query, sort?, limit?)
    filter: (filters = {}, sort, limit) => request(`/${resource}${buildQuery({ filters, sort, limit })}`),
    get: (id) => request(`/${resource}/${id}`),
    create: (data) => request(`/${resource}`, { method: 'POST', body: data }),
    update: (id, data) => request(`/${resource}/${id}`, { method: 'PUT', body: data }),
    delete: (id) => request(`/${resource}/${id}`, { method: 'DELETE' }),
    // Polling stand-in for Base44's realtime subscribe(). Returns an unsubscribe fn.
    subscribe: (cb, intervalMs = 5000) => {
      const id = setInterval(cb, intervalMs);
      return () => clearInterval(id);
    },
  };
}

export const base44 = {
  entities: {
    Doctor: makeEntity('doctors'),
    Patient: makeEntity('patients'),
    IntakeSession: makeEntity('intake-sessions'),
    MedicalDocument: makeEntity('medical-documents'),
  },

  auth: {
    async isAuthenticated() {
      if (!getToken()) return false;
      try {
        await request('/auth/me');
        return true;
      } catch {
        return false;
      }
    },
    me: () => request('/auth/me'),

    async loginViaEmailPassword(email, password) {
      const { token } = await request('/auth/login', { method: 'POST', body: { email, password } });
      setToken(token);
    },

    // Starts the OTP flow — no token yet. Throws on 409 (already registered
    // and verified) or 400 (validation), which callers already handle.
    async register({ email, password }) {
      return request('/auth/register', { method: 'POST', body: { email, password } });
    },

    // { email, otpCode } -> { access_token }
    async verifyOtp({ email, otpCode }) {
      const result = await request('/auth/verify-otp', { method: 'POST', body: { email, otpCode } });
      if (result?.access_token) setToken(result.access_token);
      return result;
    },

    resendOtp: (email) => request('/auth/resend-otp', { method: 'POST', body: { email } }),

    resetPasswordRequest: (email) => request('/auth/forgot-password', { method: 'POST', body: { email } }),
    resetPassword: ({ resetToken, newPassword }) =>
      request('/auth/reset-password', { method: 'POST', body: { resetToken, newPassword } }),

    setToken,

    logout(redirectTo) {
      setToken(null);
      if (redirectTo) window.location.href = redirectTo;
    },

    redirectToLogin(returnTo) {
      window.location.href = `/login?returnTo=${encodeURIComponent(returnTo || window.location.href)}`;
    },

    // Full-page redirect into the backend's Google OAuth flow. The backend
    // redirects back to `returnTo` with ?token=... once Google confirms the
    // user — picked up by consumeOAuthTokenFromUrl() above.
    loginWithProvider(provider, returnTo) {
      if (provider !== 'google') throw new Error(`Unsupported provider: ${provider}`);
      const base = API_BASE.replace(/\/api$/, '');
      window.location.href = `${base}/api/auth/google?returnTo=${encodeURIComponent(returnTo || '/')}`;
    },
  },

  functions: {
    invoke: (name, payload) => {
      const path = { clinicalSummary: '/ai/clinical-summary', scanDocument: '/ai/scan-document' }[name];
      if (!path) throw new Error(`Unknown function: ${name}`);
      return request(path, { method: 'POST', body: payload });
    },
  },

  integrations: {
    Core: {
      UploadFile: ({ file }) => {
        const form = new FormData();
        form.append('file', file);
        return request('/upload', { method: 'POST', body: form, isForm: true });
      },
    },
  },

  app: {
    // No app-level public-settings server for a self-hosted backend;
    // return a minimal shape so AuthContext's checkAppState() doesn't break.
    getPublicSettings: () => Promise.resolve({ id: 'medikiosk', public_settings: {} }),
  },
};
