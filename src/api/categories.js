import {
  fetchCategories as fetchMarketplaceCategories,
  fetchCities as fetchMarketplaceCities,
  fetchSubCategories as fetchMarketplaceSubCategories,
} from './marketplaceService';
import { getListingAttributeSchema } from '../constants/listingAttributes';

export async function fetchCategories() {
  return fetchMarketplaceCategories();
}

export async function fetchSubCategories(categoryId) {
  return fetchMarketplaceSubCategories(categoryId);
}

export async function fetchChildCategories() {
  return [];
}

export function getCategorySubCategories(category) {
  return Array.isArray(category?.sub_categories) ? category.sub_categories : [];
}

export async function fetchCategoryAttributes(categorySlug, subCategorySlug, childCategorySlug) {
  return getListingAttributeSchema(categorySlug, subCategorySlug, childCategorySlug);
}

export async function fetchCities() {
  return fetchMarketplaceCities();
}