'use client';
import React, { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Icon } from './ui/icons';
import { useAdminTheme } from './ui/theme';
import { useAppContext } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import AdminLanguageSwitcher from './AdminLanguageSwitcher';

function useClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (e) => {
      if (ref.current && !ref.current.contains(e.target)) handler();
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref, handler]);
}

const NAV_ITEMS = [
  { nameKey: 'admin.sidebar.dashboard', path: '/admin' },
  { nameKey: 'admin.sidebar.orders', path: '/admin/orders' },
  { nameKey: 'admin.sidebar.customers', path: '/admin/customers' },
  { nameKey: 'admin.sidebar.quotes', path: '/admin/quotes' },
  { nameKey: 'admin.sidebar.invoices', path: '/admin/invoices' },
  { nameKey: 'admin.sidebar.products', path: '/admin/products' },
  { nameKey: 'admin.sidebar.categories', path: '/admin/categories' },
  { nameKey: 'admin.sidebar.brands', path: '/admin/brands' },
  { nameKey: 'admin.sidebar.promotions', path: '/admin/promotions' },
  { nameKey: 'admin.sidebar.reviews', path: '/admin/reviews' },
  { nameKey: 'admin.sidebar.analytics', path: '/admin/analytics' },
  { nameKey: 'admin.sidebar.users', path: '/admin/users' },
  { nameKey: 'admin.sidebar.settings', path: '/admin/settings' },
];

export default function Header({ onMenuToggle }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle } = useAdminTheme();
  const { userData, logout } = useAppContext();
  const { t } = useLanguage();

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);

  useEffect(() => {
    if (notifOpen && userData) {
      setNotifLoading(true);
      import('@/lib/api/admin-notifications').then(({ getNotifications, getUnreadCount }) =>
        Promise.all([getNotifications(), getUnreadCount()])
          .then(([notifs, count]) => {
            setNotifications(notifs.results || []);
            setUnreadCount(count);
          })
          .catch(() => {})
          .finally(() => setNotifLoading(false))
      );
    }
  }, [notifOpen, userData]);

  useEffect(() => {
    if (!userData) return;
    let mounted = true;
    const poll = () => {
      import('@/lib/api/admin-notifications').then(({ getUnreadCount }) =>
        getUnreadCount()
          .then((count) => { if (mounted) setUnreadCount(count); })
          .catch(() => {})
      );
    };
    poll();
    const interval = setInterval(poll, 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, [userData]);

  const handleMarkAllRead = async () => {
    try {
      const { markAllAsRead } = await import('@/lib/api/admin-notifications');
      await markAllAsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {}
  };

  const handleMarkRead = async (id) => {
    try {
      const { markAsRead } = await import('@/lib/api/admin-notifications');
      await markAsRead(id);
      setUnreadCount((c) => Math.max(0, c - 1));
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    } catch {}
  };

  const notifTypeColors = {
    order_created: 'bg-green-500', order_confirmed: 'bg-green-500',
    order_processing: 'bg-blue-500', order_shipped: 'bg-blue-500',
    order_delivered: 'bg-green-500', order_cancelled: 'bg-red-500',
    payment_received: 'bg-green-500', payment_failed: 'bg-red-500',
    invoice_created: 'bg-purple-500', invoice_issued: 'bg-purple-500',
    quote_sent: 'bg-amber-500', quote_accepted: 'bg-green-500',
    quote_declined: 'bg-red-500', quote_expired: 'bg-gray-400',
  };

  const notifRef = useRef(null);
  const profileRef = useRef(null);
  useClickOutside(notifRef, () => setNotifOpen(false));
  useClickOutside(profileRef, () => setProfileOpen(false));

  const currentNav = NAV_ITEMS.find((i) =>
    i.path === '/admin' ? pathname === '/admin' || pathname === '/admin/' : pathname.startsWith(i.path)
  );
  const title = currentNav ? t(currentNav.nameKey) : t('admin.sidebar.dashboard');

  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs = segments.map((seg, i) => {
    const path = '/' + segments.slice(0, i + 1).join('/');
    const item = NAV_ITEMS.find((n) => n.path === path);
    return { label: item ? t(item.nameKey) : seg.charAt(0).toUpperCase() + seg.slice(1), path };
  });

  const submitSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      router.push(`/admin/products?search=${encodeURIComponent(q)}`);
      setQuery('');
    }
  };

  const userInitial = (userData?.first_name?.[0] || userData?.email?.[0] || 'A').toUpperCase();
  const userName = userData?.first_name
    ? `${userData.first_name} ${userData.last_name || ''}`.trim()
    : userData?.email || 'Admin';
  const userRole = userData?.is_staff ? 'Staff' : userData?.role || 'Admin';

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-[color:var(--admin-border)] bg-[color:var(--admin-surface)]/95 px-4 backdrop-blur md:px-6">
      <button
        onClick={onMenuToggle}
        className="rounded-lg p-2 text-[color:var(--admin-muted)] hover:bg-[color:var(--admin-accent-soft)] hover:text-[color:var(--admin-text)] lg:hidden"
        aria-label="Menu"
      >
        <Icon name="menu" size={22} />
      </button>

      <div className="hidden min-w-0 items-center gap-1.5 text-sm md:flex">
        {breadcrumbs.map((b, i) => (
          <React.Fragment key={b.path}>
            {i > 0 && <span className="text-[color:var(--admin-muted)]">/</span>}
            {i === breadcrumbs.length - 1 ? (
              <span className="font-semibold text-[color:var(--admin-text)]">{b.label}</span>
            ) : (
              <button
                onClick={() => router.push(b.path)}
                className="truncate text-[color:var(--admin-muted)] hover:text-[color:var(--admin-accent)]"
              >
                {b.label}
              </button>
            )}
          </React.Fragment>
        ))}
      </div>

      <h1 className="text-lg font-semibold text-[color:var(--admin-text)] sm:hidden lg:block">{title}</h1>

      <form onSubmit={submitSearch} className="ml-auto hidden items-center md:flex">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--admin-muted)]">
            <Icon name="search" size={17} />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('admin.header.globalSearch')}
            className="w-64 rounded-lg border border-[color:var(--admin-border)] bg-[color:var(--admin-bg)] py-2 pl-9 pr-3 text-sm text-[color:var(--admin-text)] outline-none transition placeholder:text-[color:var(--admin-muted)] focus:border-[color:var(--admin-accent)] focus:ring-2 focus:ring-[color:var(--admin-accent)]/20 lg:w-80"
          />
        </div>
      </form>

      <AdminLanguageSwitcher />

      <button
        onClick={toggle}
        className="ml-2 rounded-lg p-2 text-[color:var(--admin-muted)] hover:bg-[color:var(--admin-accent-soft)] hover:text-[color:var(--admin-accent)]"
        aria-label="Toggle theme"
        title={theme === 'light' ? t('admin.header.darkMode') : t('admin.header.lightMode')}
      >
        <Icon name={theme === 'light' ? 'moon' : 'sun'} size={20} />
      </button>

      <div className="relative" ref={notifRef}>
        <button
          onClick={() => setNotifOpen((v) => !v)}
          className="relative rounded-lg p-2 text-[color:var(--admin-muted)] hover:bg-[color:var(--admin-accent-soft)] hover:text-[color:var(--admin-accent)]"
          aria-label="Notifications"
        >
          <Icon name="bell" size={20} />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[color:var(--admin-accent)] px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {notifOpen && (
          <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] shadow-xl">
            <div className="flex items-center justify-between border-b border-[color:var(--admin-border)] px-4 py-3">
              <span className="text-sm font-semibold text-[color:var(--admin-text)]">{t('admin.header.notifications')}</span>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} className="text-xs text-[color:var(--admin-accent)] hover:underline">
                  {t('admin.header.markAllRead')}
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-[color:var(--admin-border)]">
              {notifLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-[color:var(--admin-accent)] border-t-transparent" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-8 text-center text-sm text-[color:var(--admin-muted)]">
                  {t('admin.header.noNotifications')}
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => !n.is_read && handleMarkRead(n.id)}
                    className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-[color:var(--admin-bg)] ${!n.is_read ? 'bg-[color:var(--admin-accent-soft)]/30' : ''}`}
                  >
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notifTypeColors[n.notification_type] || 'bg-gray-400'}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm ${!n.is_read ? 'font-semibold' : 'font-medium'} text-[color:var(--admin-text)]`}>{n.title}</p>
                      {n.message && <p className="truncate text-xs text-[color:var(--admin-muted)]">{n.message}</p>}
                      <p className="mt-0.5 text-[11px] text-[color:var(--admin-muted)]">
                        {new Date(n.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="relative" ref={profileRef}>
        <button
          onClick={() => setProfileOpen((v) => !v)}
          className="flex items-center gap-2 rounded-full p-1 pr-2 hover:bg-[color:var(--admin-accent-soft)]"
          aria-label="Profile"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--admin-accent)] text-sm font-semibold text-white">
            {userInitial}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-xs font-semibold leading-tight text-[color:var(--admin-text)]">{userName}</span>
            <span className="block text-[11px] leading-tight text-[color:var(--admin-muted)]">{userRole}</span>
          </span>
          <Icon name="chevronDown" size={16} className="hidden text-[color:var(--admin-muted)] sm:block" />
        </button>

        {profileOpen && (
          <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] shadow-xl">
            <div className="border-b border-[color:var(--admin-border)] px-4 py-3">
              <p className="text-sm font-semibold text-[color:var(--admin-text)]">{userName}</p>
              <p className="truncate text-xs text-[color:var(--admin-muted)]">{userData?.email || 'admin@quickcart.com'}</p>
            </div>
            <div className="p-1.5">
              <button
                onClick={() => { setProfileOpen(false); router.push('/account'); }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[color:var(--admin-muted)] hover:bg-[color:var(--admin-accent-soft)] hover:text-[color:var(--admin-text)]"
              >
                <Icon name="settings" size={16} /> {t('admin.header.myProfile')}
              </button>
              <button
                onClick={() => { setProfileOpen(false); router.push('/admin/settings'); }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[color:var(--admin-muted)] hover:bg-[color:var(--admin-accent-soft)] hover:text-[color:var(--admin-text)]"
              >
                <Icon name="settings" size={16} /> {t('admin.header.settings')}
              </button>
              <button
                onClick={() => { setProfileOpen(false); router.push('/'); }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[color:var(--admin-muted)] hover:bg-[color:var(--admin-accent-soft)] hover:text-[color:var(--admin-text)]"
              >
                <Icon name="eye" size={16} /> {t('admin.header.viewStore')}
              </button>
              <div className="my-1 border-t border-[color:var(--admin-border)]" />
              <button
                onClick={() => { setProfileOpen(false); logout(); }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                <Icon name="logout" size={16} /> {t('admin.header.logout')}
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
