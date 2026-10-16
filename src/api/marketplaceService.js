import api from './client';

export async function fetchHomepage() {
  const { data } = await api.get('/home');
  return data?.data || {};
}

export async function fetchSliders() {
  const { data } = await api.get('/sliders');
  return data?.data?.sliders || [];
}

export async function fetchTestimonials() {
  const { data } = await api.get('/testimonials');
  return data?.data?.testimonials || [];
}

export async function fetchCategories() {
  const { data } = await api.get('/categories');
  return data?.data?.categories || [];
}

export async function fetchSubCategories(categoryId) {
  const { data } = await api.get(`/categories/${encodeURIComponent(String(categoryId))}/subcategories`);
  return data?.data?.subcategories || [];
}

export async function fetchCities() {
  const { data } = await api.get('/cities');
  return data?.data?.cities || [];
}

export async function searchListings(params = {}) {
  const { data } = await api.get('/listings', { params });
  return data;
}

export const fetchListings = searchListings;

export async function fetchFeaturedListings(limit = 8) {
  const { data } = await api.get('/featured-listings', { params: { per_page: limit } });
  return data?.data || [];
}

export async function fetchListingDetail(slugOrId) {
  const { data } = await api.get(`/listings/${encodeURIComponent(String(slugOrId))}`);
  return data?.data?.listing || null;
}

export async function fetchListingReviews(slug, params = {}) {
  const { data } = await api.get(`/listings/${encodeURIComponent(String(slug))}/reviews`, { params });
  return data;
}

export async function fetchAgent(username) {
  const { data } = await api.get(`/agents/${encodeURIComponent(String(username))}`);
  return data?.data?.agent || null;
}

export async function fetchAgentListings(username, params = {}) {
  const { data } = await api.get(`/agents/${encodeURIComponent(String(username))}/listings`, { params });
  return data;
}

export async function fetchAgentReviews(username, params = {}) {
  const { data } = await api.get(`/agents/${encodeURIComponent(String(username))}/reviews`, { params });
  return data;
}