import api from './client';

function responseData(response) {
  return response?.data?.data || {};
}

export async function fetchProfile() {
  const { data } = await api.get('/profile');
  return responseData({ data }).user || null;
}

export async function updateProfile(payload) {
  const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData;
  if (isFormData) {
    payload.append('_method', 'PUT');
  }
  const { data } = isFormData
    ? await api.post('/profile', payload)
    : await api.put('/profile', payload);
  return responseData({ data }).user || null;
}

export async function updatePassword({ currentPassword, password, passwordConfirmation }) {
  const { data } = await api.put('/password', {
    current_password: currentPassword,
    password,
    password_confirmation: passwordConfirmation,
  });
  return data;
}

export async function fetchDashboard() {
  const { data } = await api.get('/dashboard');
  return responseData({ data });
}

export async function fetchMyListings(page = 1, perPage = 20) {
  const { data } = await api.get('/my-listings', {
    params: { page, per_page: perPage },
  });
  return data;
}

export async function fetchMyListing(id) {
  const { data } = await api.get(`/my-listings/${encodeURIComponent(String(id))}`);
  return responseData({ data }).listing || null;
}

export async function createMyListing(payload) {
  const { data } = await api.post('/listings', payload);
  return data?.data?.listing || data;
}

export async function updateMyListing(id, payload) {
  if (typeof FormData !== 'undefined' && payload instanceof FormData) {
    payload.append('_method', 'PUT');
  }
  const { data } = await api.post(`/listings/${encodeURIComponent(String(id))}`, payload);
  return data?.data?.listing || data?.data || data;
}

export async function deleteMyListing(id) {
  const { data } = await api.delete(`/listings/${encodeURIComponent(String(id))}`);
  return data;
}

export async function fetchWishlist(page = 1, perPage = 20) {
  const { data } = await api.get('/wishlist', { params: { page, per_page: perPage } });
  return data;
}

export async function addToWishlist(listingId) {
  const { data } = await api.post('/wishlist', { listing_id: listingId });
  return data?.data || {};
}

export async function removeFromWishlist(listingId) {
  const { data } = await api.delete(`/wishlist/${encodeURIComponent(String(listingId))}`);
  return data?.data || {};
}

export async function checkWishlist(listingId) {
  const { data } = await api.get(`/wishlist/${encodeURIComponent(String(listingId))}/check`);
  return Boolean(data?.data?.is_favorited);
}