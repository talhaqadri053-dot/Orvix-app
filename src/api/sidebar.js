export async function fetchKyc() {
  return { submitted: null, types: [] };
}

export async function fetchSupportTickets() {
  return { data: [] };
}

export async function createSupportTicket() {
  return { enabled: false, message: 'Support tickets are temporarily unavailable.' };
}

export async function deleteAccount() {
  return { enabled: false, message: 'Account deletion is temporarily unavailable.' };
}