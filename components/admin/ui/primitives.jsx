'use client';
import React from 'react';

/* ── Design tokens helper classes (scoped via .admin-root variables) ───── */
const surf = 'bg-[color:var(--admin-surface)]';
const bd = 'border-[color:var(--admin-border)]';
const txtMuted = 'text-[color:var(--admin-muted)]';
const txtMain = 'text-[color:var(--admin-text)]';

/* ── Button ────────────────────────────────────────────────────────────── */
const btnVariants = {
  primary:
    'bg-[color:var(--admin-accent)] text-white hover:opacity-90 shadow-sm disabled:opacity-50',
  secondary:
    'bg-[color:var(--admin-surface)] text-[color:var(--admin-text)] border border-[color:var(--admin-border)] hover:bg-[color:var(--admin-accent-soft)]',
  ghost:
    'text-[color:var(--admin-muted)] hover:bg-[color:var(--admin-accent-soft)] hover:text-[color:var(--admin-accent)]',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50',
};

const btnSizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
  icon: 'p-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:cursor-not-allowed ${btnVariants[variant]} ${btnSizes[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ── Badge ─────────────────────────────────────────────────────────────── */
const badgeTones = {
  gray: 'bg-gray-500/10 text-gray-600 dark:text-gray-300',
  green: 'bg-green-500/10 text-green-600 dark:text-green-400',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  red: 'bg-red-500/10 text-red-600 dark:text-red-400',
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  orange: 'bg-[color:var(--admin-accent-soft)] text-[color:var(--admin-accent)]',
  purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
};

export function Badge({ tone = 'gray', children, className = '', dot = false }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeTones[tone]} ${className}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/* ── Card ──────────────────────────────────────────────────────────────── */
export function Card({ children, className = '', as: Tag = 'div' }) {
  return (
    <Tag className={`${surf} ${bd} border rounded-xl ${className}`}>{children}</Tag>
  );
}

export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`flex items-start justify-between gap-3 px-5 pt-5 ${className}`}>
      <div>
        {title && <h3 className={`text-base font-semibold ${txtMain}`}>{title}</h3>}
        {subtitle && <p className={`mt-0.5 text-sm ${txtMuted}`}>{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ── Stat card ─────────────────────────────────────────────────────────── */
const statAccents = [
  'text-orange-600 bg-orange-500/10',
  'text-blue-600 bg-blue-500/10',
  'text-green-600 bg-green-500/10',
  'text-purple-600 bg-purple-500/10',
  'text-rose-600 bg-rose-500/10',
];

export function StatCard({ label, value, delta, icon, accent = 0, hint }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className={`text-sm ${txtMuted}`}>{label}</span>
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${statAccents[accent % statAccents.length]}`}>
          {icon}
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className={`text-2xl font-bold tracking-tight ${txtMain}`}>{value}</span>
        {delta !== undefined && delta !== null && (
          <span
            className={`text-xs font-medium ${delta >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
          >
            {delta >= 0 ? '+' : ''}{delta}%
          </span>
        )}
      </div>
      {hint && <p className={`mt-1 text-xs ${txtMuted}`}>{hint}</p>}
    </Card>
  );
}

/* ── Input / Select ────────────────────────────────────────────────────── */
const fieldCls = `w-full rounded-lg border ${bd} bg-[color:var(--admin-surface)] px-3 py-2 text-sm ${txtMain} outline-none transition placeholder:text-[color:var(--admin-muted)] focus:border-[color:var(--admin-accent)] focus:ring-2 focus:ring-[color:var(--admin-accent)]/20`;

export function Input({ className = '', ...rest }) {
  return <input className={`${fieldCls} ${className}`} {...rest} />;
}

export function Textarea({ className = '', ...rest }) {
  return <textarea className={`${fieldCls} ${className}`} {...rest} />;
}

export function Select({ className = '', children, ...rest }) {
  return (
    <select className={`${fieldCls} cursor-pointer ${className}`} {...rest}>
      {children}
    </select>
  );
}

/* ── Skeleton ──────────────────────────────────────────────────────────── */
export function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse rounded-md bg-gray-200/70 dark:bg-slate-700/60 ${className}`} />
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="w-full space-y-3 p-5">
      <div className="flex gap-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-9 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ── Spinner ───────────────────────────────────────────────────────────── */
export function Spinner({ className = 'h-5 w-5 text-[color:var(--admin-accent)]' }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V0C5.4 0 0 5.4 0 12h4z"
      />
    </svg>
  );
}

/* ── Empty state ───────────────────────────────────────────────────────── */
export function EmptyState({
  icon,
  title = 'No data',
  description = 'No records found yet.',
  action,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-16 text-center ${className}`}>
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[color:var(--admin-accent-soft)] text-[color:var(--admin-accent)]">
        {icon || <IconBox />}
      </div>
      <h4 className={`mt-5 text-base font-semibold ${txtMain}`}>{title}</h4>
      <p className={`mt-1 max-w-sm text-sm ${txtMuted}`}>{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

const IconBox = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
    <path d="M3 8l9 5 9-5M12 13v8" />
  </svg>
);

/* ── Error state ───────────────────────────────────────────────────────── */
export function ErrorState({ message = 'Something went wrong.', onRetry, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-16 text-center ${className}`}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5M12 16h.01" />
        </svg>
      </div>
      <h4 className={`mt-4 text-base font-semibold ${txtMain}`}>Error</h4>
      <p className={`mt-1 max-w-sm text-sm ${txtMuted}`}>{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-5">
          Retry
        </Button>
      )}
    </div>
  );
}

/* ── Modal ─────────────────────────────────────────────────────────────── */
export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  if (!open) return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative w-full ${widths[size]} ${surf} ${txtMain} rounded-2xl shadow-2xl transition`}
      >
        <div className={`flex items-center justify-between border-b ${bd} px-5 py-4`}>
          <h3 className="text-base font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[color:var(--admin-muted)] hover:bg-[color:var(--admin-accent-soft)] hover:text-[color:var(--admin-accent)]"
          >
            <IconX />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className={`border-t ${bd} px-5 py-4`}>{footer}</div>}
      </div>
    </div>
  );
}

const IconX = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

/* ── Link button helper ────────────────────────────────────────────────── */
export function linkCls(active) {
  return active
    ? `${surf} ${bd} border text-[color:var(--admin-accent)]`
    : `${txtMuted} hover:bg-[color:var(--admin-accent-soft)] hover:text-[color:var(--admin-text)]`;
}

/* ── Page header ───────────────────────────────────────────────────────── */
export function PageHeader({ title, subtitle, actions, breadcrumb }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {breadcrumb && (
          <div className="mb-1 flex items-center gap-1.5 text-xs text-[color:var(--admin-muted)]">
            {breadcrumb}
          </div>
        )}
        <h2 className="text-xl font-bold tracking-tight text-[color:var(--admin-text)] sm:text-2xl">
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-sm text-[color:var(--admin-muted)]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ── Toolbar (search + filters) ────────────────────────────────────────── */
export function Toolbar({ searchPlaceholder = 'Rechercher…', value, onSearch, children }) {
  return (
    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
      <div className="relative md:max-w-xs md:flex-1">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--admin-muted)]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </span>
        <input
          value={value}
          onChange={(e) => onSearch?.(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-lg border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] py-2 pl-9 pr-3 text-sm text-[color:var(--admin-text)] outline-none transition placeholder:text-[color:var(--admin-muted)] focus:border-[color:var(--admin-accent)] focus:ring-2 focus:ring-[color:var(--admin-accent)]/20"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

/* ── Tabs ──────────────────────────────────────────────────────────────── */
export function Tabs({ tabs, active, onChange, className = '' }) {
  return (
    <div className={`flex gap-1 rounded-lg border ${bd} p-1 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
            active === tab.value
              ? 'bg-[color:var(--admin-accent)] text-white shadow-sm'
              : `${txtMuted} hover:bg-[color:var(--admin-accent-soft)] hover:${txtMain}`
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="ml-1.5 rounded-full bg-black/10 px-1.5 py-0.5 text-[10px]">
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ── Pagination ────────────────────────────────────────────────────────── */
export function Pagination({ page, totalPages, count, onPageChange, pageSize }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-[color:var(--admin-border)] px-5 py-3 text-sm">
      <span className={txtMuted}>
        Page {page} sur {totalPages}
        {count !== undefined && ` — ${count} résultat${count > 1 ? 's' : ''}`}
      </span>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          ← Précédent
        </Button>
        <span className={`${txtMuted} px-2 text-xs`}>{page} / {totalPages}</span>
        <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Suivant →
        </Button>
      </div>
    </div>
  );
}

/* ── Dropdown ──────────────────────────────────────────────────────────── */
export function Dropdown({ trigger, items, align = 'right', className = '' }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div
          className={`absolute z-50 mt-1 min-w-[180px] overflow-hidden rounded-xl border ${bd} ${surf} shadow-xl ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div className="p-1.5">
            {items.map((item, i) =>
              item.separator ? (
                <div key={i} className={`my-1 border-t ${bd}`} />
              ) : (
                <button
                  key={i}
                  onClick={() => {
                    item.onClick?.();
                    setOpen(false);
                  }}
                  disabled={item.disabled}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                    item.danger
                      ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10'
                      : `${txtMuted} hover:bg-[color:var(--admin-accent-soft)] hover:${txtMain}`
                  } disabled:opacity-50`}
                >
                  {item.icon && <span className="shrink-0">{item.icon}</span>}
                  {item.label}
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── ConfirmDialog ─────────────────────────────────────────────────────── */
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirmer', danger = false }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm" footer={
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Annuler</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    }>
      <p className="text-sm text-[color:var(--admin-muted)]">{message}</p>
    </Modal>
  );
}

export { surf, bd, txtMuted, txtMain };
