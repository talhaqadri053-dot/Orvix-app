import api from './client';
import { fetchMyBookings, fetchMyJobRequests } from './bookingService';

async function fetchAccountList(path, page = 1) {
  const { data } = await api.get(path, { params: { page } });
  return data?.data || { data: [], pagination: {} };
}

export const fetchReviews = (page = 1) => fetchAccountList('/user/reviews', page);
export const fetchBookings = fetchMyBookings;
export const fetchJobRequests = fetchMyJobRequests;