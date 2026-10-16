import {
  addToWishlist,
  checkWishlist as checkUserWishlist,
  fetchWishlist as fetchUserWishlist,
  removeFromWishlist,
} from './userService';

export const fetchWishlist = fetchUserWishlist;

export async function toggleWishlist(listingId) {
  if (await checkUserWishlist(listingId)) {
    return removeFromWishlist(listingId);
  }
  return addToWishlist(listingId);
}

export const checkWishlist = checkUserWishlist;
