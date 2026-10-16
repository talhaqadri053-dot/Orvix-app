import { fetchAgent, fetchAgentListings } from './marketplaceService';

export async function fetchSeller(identifier) {
  return fetchAgent(identifier);
}

export async function fetchSellerListings(identifier, params = {}) {
  const query = Object.fromEntries(['page', 'per_page']
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .map((key) => [key, params[key]]));
  const data = await fetchAgentListings(identifier, query);
  return { ...data, meta: data?.pagination || data?.meta };
}