import api from './client';

export async function createBooking({ listingId, startDate, endDate }) {
  const { data } = await api.post('/bookings', {
    listing_id: listingId,
    start_date: startDate,
    end_date: endDate,
  });
  return data?.data?.booking || null;
}

export async function fetchMyBookings(page = 1, perPage = 20) {
  const { data } = await api.get('/my-bookings', { params: { page, per_page: perPage } });
  return data;
}

export async function applyForJob({ listingId, description }) {
  const { data } = await api.post('/jobs/apply', {
    listing_id: listingId,
    description,
  });
  return data?.data?.job_request || null;
}

export async function fetchMyJobRequests(page = 1, perPage = 20) {
  const { data } = await api.get('/my-job-requests', { params: { page, per_page: perPage } });
  return data;
}