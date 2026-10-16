export async function fetchSupportTickets(page = 1) {
  return {
    data: [],
    meta: {
      current_page: page,
      last_page: page,
      per_page: 15,
      total: 0,
    },
  };
}

export async function createSupportTicket() {
  return { enabled: false, message: 'Support tickets are temporarily unavailable.' };
}

export async function fetchSupportTicket() {
  return null;
}

export async function replyToSupportTicket() {
  return { enabled: false, message: 'Support replies are temporarily unavailable.' };
}
