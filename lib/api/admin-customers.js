import apiClient from './client';

/**
 * Admin customers API.
 *
 * There is no dedicated customers endpoint in Django. Customers are
 * aggregated from orders — both registered users and guest checkout
 * customers are included.
 */
export const adminCustomersApi = {
  /**
   * Fetch all orders and aggregate unique customers from them.
   * Returns: { customers: [...], count: N }
   * Each customer: { email, name, phone, type, orderCount, totalSpent, lastOrder, orders }
   */
  list: async (params = {}) => {
    const qs = new URLSearchParams();
    qs.set('page_size', params.page_size || '200');
    if (params.search) qs.set('search', params.search);
    if (params.page) qs.set('page', params.page);
    if (params.ordering) qs.set('ordering', params.ordering);

    const data = await apiClient.get(`/orders/admin/?${qs.toString()}`);
    const orders = data.results || [];

    // Aggregate by email
    const customerMap = new Map();

    orders.forEach((order) => {
      const email = order.customer_email || order.guest_email || null;
      const name = order.customer_name || order.guest_full_name || `${order.guest_first_name || ''} ${order.guest_last_name || ''}`.trim() || '—';
      const phone = order.guest_phone || order.user?.phone_number || '';
      const key = email || `guest-${order.id}`;
      const amount = parseFloat(order.amount) || 0;

      if (customerMap.has(key)) {
        const c = customerMap.get(key);
        c.orderCount++;
        c.totalSpent += amount;
        if (new Date(order.date) > new Date(c.lastOrder)) {
          c.lastOrder = order.date;
          c.phone = c.phone || phone;
        }
        c.orderIds.push(order.id);
      } else {
        customerMap.set(key, {
          id: key,
          email: email || '—',
          name,
          phone,
          type: order.user ? 'registered' : 'guest',
          orderCount: 1,
          totalSpent: amount,
          lastOrder: order.date,
          orderIds: [order.id],
        });
      }
    });

    const customers = Array.from(customerMap.values()).sort(
      (a, b) => new Date(b.lastOrder) - new Date(a.lastOrder)
    );

    return { customers, count: customers.length, _allOrders: orders };
  },

  /**
   * Get a single customer's orders by email or guest key.
   */
  getOrders: async (customerKey, allOrders) => {
    // Filter orders belonging to this customer
    if (allOrders) {
      return allOrders.filter((o) => {
        const email = o.customer_email || o.guest_email || null;
        const key = email || `guest-${o.id}`;
        return key === customerKey;
      });
    }
    // Fallback: fetch all orders and filter
    const data = await apiClient.get('/orders/admin/?page_size=500');
    const orders = data.results || [];
    return orders.filter((o) => {
      const email = o.customer_email || o.guest_email || null;
      const key = email || `guest-${o.id}`;
      return key === customerKey;
    });
  },
};

export default adminCustomersApi;
