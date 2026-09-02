'use client';
import React from 'react';

/**
 * Simple SVG bar chart for sales data.
 * No external charting library needed.
 */
export function BarChart({ data, height = 250, className = '' }) {
  if (!data || data.length === 0) return null;

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const barWidth = Math.max(1, Math.min(40, Math.floor(600 / data.length) - 2));

  return (
    <div className={`overflow-x-auto ${className}`}>
      <svg
        viewBox={`0 0 ${Math.max(data.length * (barWidth + 4) + 60, 300)} ${height + 40}`}
        className="w-full"
        style={{ minWidth: Math.min(data.length * (barWidth + 4) + 60, 600) }}
      >
        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = height - pct * height + 10;
          const val = Math.round(maxRevenue * pct);
          return (
            <g key={pct}>
              <text x="0" y={y + 4} className="text-[10px] fill-[color:var(--admin-muted)]" fontFamily="sans-serif">
                {val > 999 ? `${(val / 1000).toFixed(1)}k` : val}
              </text>
              <line x1="35" y1={y} x2={35 + data.length * (barWidth + 4)} y2={y} stroke="var(--admin-border)" strokeWidth="0.5" strokeDasharray="3,3" />
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const x = 45 + i * (barWidth + 4);
          const barHeight = (d.revenue / maxRevenue) * (height - 20);
          const y = height - barHeight + 10;
          const dateLabel = d.date ? new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '';
          const showLabel = data.length <= 15 || i % Math.ceil(data.length / 15) === 0;

          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill="var(--admin-accent)"
                rx="2"
                opacity="0.85"
              >
                <title>{`${dateLabel}: ${formatNum(d.revenue)}`}</title>
              </rect>
              {showLabel && (
                <text
                  x={x + barWidth / 2}
                  y={height + 20}
                  textAnchor="middle"
                  className="text-[8px] fill-[color:var(--admin-muted)]"
                  fontFamily="sans-serif"
                  transform={`rotate(-45, ${x + barWidth / 2}, ${height + 20})`}
                >
                  {dateLabel}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/**
 * Simple horizontal bar chart for category/top products.
 */
export function HorizontalBarChart({ data, valueKey = 'revenue', labelKey = 'name', height = 200, className = '' }) {
  if (!data || data.length === 0) return null;

  const maxVal = Math.max(...data.map((d) => d[valueKey] || 0), 1);

  return (
    <div className={`space-y-3 ${className}`}>
      {data.map((d, i) => {
        const val = d[valueKey] || 0;
        const pct = (val / maxVal) * 100;
        return (
          <div key={i}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="truncate text-[color:var(--admin-text)] max-w-[70%]">{d[labelKey]}</span>
              <span className="font-medium text-[color:var(--admin-muted)]">{formatNum(val)}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[color:var(--admin-accent-soft)]">
              <div
                className="h-full rounded-full bg-[color:var(--admin-accent)] transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Simple donut/pie chart for order status distribution.
 */
export function DonutChart({ data, size = 160, className = '' }) {
  if (!data || Object.keys(data).length === 0) return null;

  const colors = {
    pending: '#f59e0b',
    confirmed: '#3b82f6',
    processing: '#6366f1',
    shipped: '#8b5cf6',
    delivered: '#22c55e',
    cancelled: '#ef4444',
    returned: '#f97316',
  };

  const labels = {
    pending: 'En attente',
    confirmed: 'Confirmée',
    processing: 'En cours',
    shipped: 'Expédiée',
    delivered: 'Livrée',
    cancelled: 'Annulée',
    returned: 'Retournée',
  };

  const entries = Object.entries(data).filter(([, v]) => v > 0);
  const total = entries.reduce((sum, [, v]) => sum + v, 0);
  if (total === 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 10;
  const innerR = r * 0.55;

  let cumAngle = -Math.PI / 2;

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {entries.map(([key, value]) => {
          const angle = (value / total) * 2 * Math.PI;
          const startAngle = cumAngle;
          const endAngle = cumAngle + angle;
          cumAngle = endAngle;

          const x1 = cx + r * Math.cos(startAngle);
          const y1 = cy + r * Math.sin(startAngle);
          const x2 = cx + r * Math.cos(endAngle);
          const y2 = cy + r * Math.sin(endAngle);
          const ix1 = cx + innerR * Math.cos(startAngle);
          const iy1 = cy + innerR * Math.sin(startAngle);
          const ix2 = cx + innerR * Math.cos(endAngle);
          const iy2 = cy + innerR * Math.sin(endAngle);

          const largeArc = angle > Math.PI ? 1 : 0;

          const d = [
            `M ${x1} ${y1}`,
            `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
            `L ${ix2} ${iy2}`,
            `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix1} ${iy1}`,
            'Z',
          ].join(' ');

          return (
            <path key={key} d={d} fill={colors[key] || '#94a3b8'} opacity="0.85">
              <title>{`${labels[key] || key}: ${value} (${Math.round((value / total) * 100)}%)`}</title>
            </path>
          );
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" className="text-lg font-bold fill-[color:var(--admin-text)]" fontFamily="sans-serif">
          {total}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" className="text-[10px] fill-[color:var(--admin-muted)]" fontFamily="sans-serif">
          commandes
        </text>
      </svg>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colors[key] || '#94a3b8' }} />
            <span className="text-[color:var(--admin-muted)]">{labels[key] || key}</span>
            <span className="ml-auto font-medium text-[color:var(--admin-text)]">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Period filter buttons.
 */
export function PeriodFilter({ value, onChange }) {
  const periods = [
    { value: '7d', label: '7 jours' },
    { value: '30d', label: '30 jours' },
    { value: '3m', label: '3 mois' },
    { value: '6m', label: '6 mois' },
    { value: '12m', label: '12 mois' },
  ];

  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-[color:var(--admin-border)] p-1">
      {periods.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
            value === p.value
              ? 'bg-[color:var(--admin-accent)] text-white shadow-sm'
              : 'text-[color:var(--admin-muted)] hover:bg-[color:var(--admin-accent-soft)] hover:text-[color:var(--admin-text)]'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

function formatNum(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}
