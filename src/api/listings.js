import api from './client';
import {
  fetchFeaturedListings as fetchMarketplaceFeaturedListings,
  fetchListingDetail as fetchMarketplaceListingDetail,
  searchListings as searchMarketplaceListings,
} from './marketplaceService';
import {
  createMyListing,
  deleteMyListing,
  fetchMyListing,
  fetchMyListings as fetchUserListings,
  updateMyListing,
} from './userService';

const SEARCH_PARAMS = [
  'search',
  'category_id',
  'sub_category_id',
  'city_id',
  'min_price',
  'max_price',
  'sort',
  'featured',
  'is_featured',
  'page',
  'per_page',
];

export async function searchListings(params = {}) {
  const query = Object.fromEntries(SEARCH_PARAMS
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .map((key) => [key, params[key]]));
  return searchMarketplaceListings(query);
}

export async function fetchListings(params = {}) {
  return searchListings(params);
}

export async function fetchFeaturedListings(limit = 8) {
  return fetchMarketplaceFeaturedListings(limit);
}

export async function fetchListingDetail(idOrSlug) {
  return fetchMarketplaceListingDetail(idOrSlug);
}

export async function createListing(formData) {
  return createMyListing(formData);
}

export async function fetchMyListings(page = 1) {
  return fetchUserListings(page);
}

export async function fetchMyListingDetail(id) {
  return fetchMyListing(id);
}

export async function fetchListingPromotionOptions() {
  const { data } = await api.get('/payments/listing-promotions/options');
  return data?.data || {};
}

/**
 * @param {string|number} listingId
 * @param {string} packageKey
 * @param {string} [gateway]
 * @param {string|null} [stripeToken]
 * @param {string|null} [platform]
 * @returns {Promise<any>}
 */
export async function createListingPromotion(listingId, packageKey, gateway = 'safepay', stripeToken = null, platform = null) {
  const { data } = await api.post('/payments/listing-promotions', {
    listing_id: Number(listingId),
    package: packageKey,
    gateway,
    stripe_token: stripeToken,
    platform,
  });
  return data?.data || {};
}

export async function verifyListingPromotion(quicklinkId) {
  const { data } = await api.get(`/payments/listing-promotions/${encodeURIComponent(String(quicklinkId))}`);
  return data?.data || {};
}

export async function deleteListing(id) {
  return deleteMyListing(id);
}

export async function updateListing(id, payload) {
  return updateMyListing(id, payload);
}
