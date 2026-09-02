/**
 * Admin / User notification API helpers.
 *
 * Notifications are per-user. Auth required.
 */
import client from './client';

/**
 * Get all notifications for the current user.
 */
export async function getNotifications(params = {}) {
  const { data } = await client.get('/notifications/', { params });
  return data;
}

/**
 * Get unread notification count.
 */
export async function getUnreadCount() {
  const { data } = await client.get('/notifications/unread-count/');
  return data.count;
}

/**
 * Mark a single notification as read.
 */
export async function markAsRead(id) {
  const { data } = await client.post(`/notifications/${id}/read/`);
  return data;
}

/**
 * Mark all notifications as read.
 */
export async function markAllAsRead() {
  const { data } = await client.post('/notifications/read-all/');
  return data;
}
