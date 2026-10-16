import api from './client';

function unwrapUser(response) {
  return response?.user || response?.data?.user || null;
}

function unwrapToken(response) {
  return response?.token || response?.access_token || response?.data?.token || response?.accessToken || null;
}

export async function login(email, password) {
  const { data } = await api.post('/login', { email, password });
  return { user: unwrapUser(data), token: unwrapToken(data), response: data };
}

export async function googleLogin() {
  return { enabled: false };
}

export async function fetchGoogleSignInConfig(platform = 'web') {
  return { enabled: false, platform };
}

export async function register({ name, email, password, passwordConfirmation, phone = '' }) {
  const { data } = await api.post('/register', {
    name,
    email,
    password,
    password_confirmation: passwordConfirmation,
    phone,
  });
  const result = data?.data || data;
  return {
    user: unwrapUser(data),
    token: unwrapToken(data),
    verificationEmailSent: result?.email_sent !== false,
    response: data,
  };
}

export async function fetchCurrentUser() {
  const { data } = await api.get('/user');
  return unwrapUser(data);
}

export async function logout() {
  const { data } = await api.post('/logout');
  return data;
}

export async function requestPasswordReset(email) {
  const { data } = await api.post('/auth/forgot-password', { email });
  return data;
}

export async function resetPassword({ email, token, password, passwordConfirmation }) {
  const { data } = await api.post('/auth/reset-password', {
    email,
    token,
    password,
    password_confirmation: passwordConfirmation,
  });
  return data;
}

export async function getEmailVerificationStatus() {
  const { data } = await api.get('/auth/email/status');
  return data?.data || {};
}

export async function resendEmailVerification() {
  const { data } = await api.post('/auth/email/resend');
  return data;
}
