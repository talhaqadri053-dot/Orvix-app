export async function fetchNotifications(page = 1) {
  return {
    data: [],
    meta: { current_page: page, last_page: page, per_page: 15, total: 0, unread: 0 },
  };
}

export async function markNotificationRead() {
  return { status: 'success', data: [] };
}

export async function markAllNotificationsRead() {
  return { status: 'success', data: [] };
}