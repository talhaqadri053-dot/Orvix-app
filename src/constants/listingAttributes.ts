import { listingAttributesData } from './listingAttributesData.js';

export type AttributeField = {
  key: string;
  label: string;
  type?: 'select' | 'radio' | 'checkbox' | 'text' | 'number';
  options?: string[];
};

export function normalizeAttributeKey(value?: string | null): string {
  if (!value) return '';
  let str = String(value).toLowerCase().trim();
  str = str.replace(/[^a-z0-9]+/g, '-');
  str = str.replace(/^-+|-+$/g, '');

  const aliases: Record<string, string> = {
    vehilcles: 'vehicles',
    vehilcle: 'vehicles',
    vehicle: 'vehicles',
    'cars-accessories': 'car-accessories',
    'property-for-rent-': 'property-for-rent',
    'property-for-sale-': 'property-for-sale',
    'job-posts': 'job-post',
    jobposts: 'job-post',
    jobpost: 'job-post',
    mobile: 'mobiles',
    electronic: 'electronics',
    'mobiles-numbers': 'mobile-numbers',
    'computers-desktops': 'computers-desktops',
    'television-and-accessories': 'television-and-accessories',
  };

  return aliases[str] || str;
}

export function getListingAttributeSchema(
  category?: string | null,
  subCategory?: string | null,
  childCategory?: string | null
): AttributeField[] {
  const cat = normalizeAttributeKey(category);
  const sub = normalizeAttributeKey(subCategory);
  const child = normalizeAttributeKey(childCategory);

  const schemas = listingAttributesData as unknown as Record<string, AttributeField[]>;

  const candidates: string[] = [];

  if (cat && sub && child) {
    candidates.push(`${cat}/${sub}/${child}`);
  }
  if (cat && sub) {
    candidates.push(`${cat}/${sub}`);
    candidates.push(`${cat}/${sub}/*`);
  }
  if (sub && child) {
    candidates.push(`${sub}/${child}`);
    candidates.push(`${sub}/${child}/*`);
  }
  if (sub) {
    candidates.push(sub);
    candidates.push(`${sub}/*`);
  }
  if (child) {
    candidates.push(child);
    candidates.push(`${child}/*`);
  }
  if (cat) {
    candidates.push(cat);
    candidates.push(`${cat}/*`);
  }

  for (const key of candidates) {
    if (schemas[key] && Array.isArray(schemas[key])) {
      return schemas[key];
    }
  }

  // Fallback 1: check if key ends with `/${sub}` or `/${sub}/*`
  if (sub) {
    for (const key of Object.keys(schemas)) {
      if (key.endsWith(`/${sub}`) || key.endsWith(`/${sub}/*`) || key === sub) {
        return schemas[key];
      }
    }
  }

  // Fallback 2: check if key ends with `/${child}` or `/${child}/*`
  if (child) {
    for (const key of Object.keys(schemas)) {
      if (key.endsWith(`/${child}`) || key.endsWith(`/${child}/*`) || key === child) {
        return schemas[key];
      }
    }
  }

  // Fallback 3: check if any part of the path matches sub
  if (sub) {
    for (const key of Object.keys(schemas)) {
      const parts = key.split('/');
      if (parts.includes(sub)) {
        return schemas[key];
      }
    }
  }

  return [];
}
