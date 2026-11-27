import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  BarChart,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine
} from 'recharts';
import { formatCurrency, formatNumber } from '../utils/formatters';

const formatCompactAxis = (n) => {
  const abs = Math.abs(Number(n) || 0);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1000000) return `${sign}${(abs / 1000000).toFixed(1)}M`;
  if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(0)}k`;
  return `${Math.round(n)}`;
};

/**
 * Floating dark/light tooltip card shared across Recharts views.
 */
function ChartTooltipCard({ active, payload, valueFormatter = formatCurrency }) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  const title = point?.fullLabel || point?.label || payload[0]?.name || '';

  return (
    <div
      dir="rtl"
      className="rounded-2xl bg-slate-900/95 dark:bg-slate-800/95 text-white px-3.5 py-2.5 shadow-xl border border-slate-700/80 backdrop-blur-md text-xs space-y-1.5 min-w-[160px]"
    >
      <div className="font-black text-slate-200 border-b border-slate-700/70 pb-1 flex items-center justify-between gap-3">
        <span>{title}</span>
        {point?.count !== undefined && (
          <span className="text-[10px] font-mono text-slate-400">({point.count} عملية)</span>
        )}
      </div>
      <div className="space-y-1">
        {payload.map((entry, idx) => {
          // Skip duplicate area/bar entry for same dataKey if identical name
          if (idx > 0 && entry.dataKey === payload[0].dataKey) return null;
          return (
            <div key={`${entry.dataKey}-${idx}`} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-slate-300 font-bold">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: entry.color || entry.payload?.color || '#e11d48' }}
                />
                <span>{entry.name || point?.label}</span>
              </span>
              <span className="font-mono font-black text-white" dir="ltr">
                {valueFormatter(entry.value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Interactive Recharts Donut Chart with smooth transitions and floating tooltip.
 */
export function InteractiveDonutChart({
  data = [],
  centerLabel = 'الإجمالي',
  centerValueFormatter = formatCurrency,
  size = 210,
  emptyText = 'لا توجد بيانات كافية للعرض'
}) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const validData = data.filter(d => (Number(d.value) || 0) > 0);
  const total = validData.reduce((s, d) => s + (Number(d.value) || 0), 0);

  if (total <= 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="w-28 h-28 rounded-full border-[14px] border-slate-100 dark:border-slate-800 flex items-center justify-center mb-3">
          <span className="text-xs font-bold text-slate-400">0</span>
        </div>
        <p className="text-xs font-bold text-slate-400">{emptyText}</p>
      </div>
    );
  }

  const activeItem = hoveredIdx !== null ? validData[hoveredIdx] : null;
  const activePct = activeItem && total > 0 ? ((activeItem.value / total) * 100).toFixed(1) : null;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      {/* Recharts Pie / Donut */}
      <div className="relative shrink-0" style={{ width: size, height: size }} dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={validData}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={84}
              paddingAngle={validData.length > 1 ? 3 : 0}
              cornerRadius={6}
              isAnimationActive={true}
              animationDuration={650}
              animationEasing="ease-out"
              onMouseEnter={(_, idx) => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {validData.map((entry, idx) => (
                <Cell
                  key={entry.key || entry.label}
                  fill={entry.color}
                  stroke="none"
                  style={{
                    cursor: 'pointer',
                    transition: 'opacity 220ms ease, transform 220ms ease',
                    opacity: hoveredIdx !== null && hoveredIdx !== idx ? 0.35 : 1
                  }}
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0';
                return (
                  <div
                    dir="rtl"
                    className="rounded-xl bg-slate-900/95 text-white px-3 py-2 shadow-xl border border-slate-700 text-xs"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-slate-200 mb-0.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      <span>{d.label}</span>
                    </div>
                    <div className="font-mono font-black flex items-center gap-2" dir="ltr">
                      <span>{centerValueFormatter(d.value)}</span>
                      <span className="text-[10px] text-slate-400">({pct}%)</span>
                    </div>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-5">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500 truncate max-w-[108px]">
            {activeItem ? activeItem.label : centerLabel}
          </span>
          <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white font-mono mt-0.5 leading-tight" dir="ltr">
            {centerValueFormatter(activeItem ? activeItem.value : total)}
          </span>
          {activeItem && activePct && (
            <span className="text-[10px] font-black font-mono mt-0.5" style={{ color: activeItem.color }}>
              {activePct}%
            </span>
          )}
        </div>
      </div>

      {/* Legend Breakdown */}
      <div className="flex-1 w-full space-y-2 min-w-0">
        {validData.map((seg, idx) => {
          const isHovered = hoveredIdx === idx;
          const pct = total > 0 ? (seg.value / total) * 100 : 0;
          return (
            <div
              key={seg.key || seg.label}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className={`flex items-center justify-between gap-2 p-2 rounded-xl border transition-all duration-200 cursor-pointer ${
                isHovered
                  ? 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 shadow-2xs scale-[1.01]'
                  : 'bg-transparent border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                  {seg.label}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-black font-mono text-slate-900 dark:text-white" dir="ltr">
                  {centerValueFormatter(seg.value)}
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 w-12 text-center">
                  {pct.toFixed(0)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Interactive Daily Area/Line + Subtle Column Chart powered by Recharts with smooth animations.
 */
export function InteractiveTrendChart({
  points = [],
  seriesName = 'القيمة',
  color = '#e11d48',
  gradientId = 'trendGrad',
  valueFormatter = formatCurrency,
  height = 260,
  showZeroLine = false,
  emptyText = 'لا توجد حركة مسجلة في هذه الفترة'
}) {
  if (!points || points.length === 0) {
    return (
      <div className="py-12 text-center text-xs font-bold text-slate-400">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height }} dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={points} margin={{ top: 12, right: 10, left: 4, bottom: 4 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.34} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 4" vertical={false} stroke="#94a3b8" strokeOpacity={0.22} />

          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            minTickGap={16}
          />

          <YAxis
            tickFormatter={formatCompactAxis}
            tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8', fontFamily: 'monospace' }}
            axisLine={false}
            tickLine={false}
            width={48}
          />

          {showZeroLine && (
            <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" strokeOpacity={0.6} />
          )}

          <Tooltip
            cursor={{ stroke: color, strokeWidth: 1.5, strokeDasharray: '4 4' }}
            content={<ChartTooltipCard valueFormatter={valueFormatter} />}
          />

          <Bar
            dataKey="value"
            name={seriesName}
            barSize={18}
            radius={[6, 6, 0, 0]}
            fill={color}
            fillOpacity={0.16}
            isAnimationActive={true}
            animationDuration={550}
            animationEasing="ease-out"
          />

          <Area
            type="monotone"
            dataKey="value"
            name={seriesName}
            stroke={color}
            strokeWidth={3}
            fill={`url(#${gradientId})`}
            dot={{ r: 3.5, fill: color, strokeWidth: 1.5, stroke: '#ffffff' }}
            activeDot={{ r: 6.5, fill: '#ffffff', stroke: color, strokeWidth: 3 }}
            isAnimationActive={true}
            animationDuration={650}
            animationEasing="ease-out"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Clean Interactive Horizontal Comparison / Ranking Bars.
 */
export function HorizontalBarChart({
  items = [],
  valueFormatter = formatCurrency,
  emptyText = 'لا توجد بيانات مسجلة بعد',
  maxItems = 8,
  defaultColorClass = 'from-red-600 to-rose-500'
}) {
  const sliced = items.slice(0, maxItems);
  const maxVal = Math.max(...sliced.map(i => Math.abs(Number(i.value) || 0)), 1);
  const totalSum = sliced.reduce((s, i) => s + Math.max(0, Number(i.value) || 0), 0);

  if (sliced.length === 0) {
    return <p className="text-xs text-slate-400 py-8 text-center font-bold">{emptyText}</p>;
  }

  return (
    <div className="space-y-3">
      {sliced.map((item, index) => {
        const val = Number(item.value) || 0;
        const absVal = Math.abs(val);
        const widthPct = maxVal > 0 ? Math.min(100, Math.round((absVal / maxVal) * 100)) : 0;
        const sharePct = totalSum > 0 && val > 0 ? Math.round((val / totalSum) * 100) : null;

        return (
          <div key={item.key || item.label || index} className="space-y-1.5 group">
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-5 h-5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-black flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 font-mono">
                  {index + 1}
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate" dir={item.ltrLabel ? 'ltr' : undefined}>
                  {item.label}
                </span>
                {item.badge && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                    {item.badge}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className={`font-black font-mono ${item.textColorClass || 'text-slate-900 dark:text-white'}`}
                  dir="ltr"
                >
                  {valueFormatter(val)}
                </span>
                {item.secondaryValue !== undefined && (
                  <span className="text-[10px] font-bold font-mono text-emerald-600 dark:text-emerald-400" dir="ltr">
                    (ربح {formatCurrency(item.secondaryValue)})
                  </span>
                )}
                {sharePct !== null && item.showShare !== false && (
                  <span className="text-[10px] font-mono text-slate-400">
                    ({sharePct}%)
                  </span>
                )}
              </div>
            </div>

            <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out group-hover:brightness-110 bg-gradient-to-r ${item.colorClass || defaultColorClass}`}
                style={{ width: `${Math.max(val !== 0 ? 3 : 0, widthPct)}%` }}
              />
            </div>

            {item.subText && (
              <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center justify-between">
                <span>{item.subText}</span>
                {item.subRight && <span className="font-mono">{item.subRight}</span>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Interactive Grouped Vertical Bar Chart powered by Recharts.
 */
export function GroupedBarChart({
  groups = [],
  primaryLabel = 'المبيعات',
  secondaryLabel = 'الربح',
  primaryColor = '#3b82f6',
  secondaryColor = '#10b981',
  height = 230,
  emptyText = 'لا توجد بيانات مقارنة بعد'
}) {
  if (!groups || groups.length === 0) {
    return <p className="text-xs text-slate-400 py-10 text-center font-bold">{emptyText}</p>;
  }

  const chartData = groups.map(g => ({
    ...g,
    fullLabel: g.label,
    displayLabel: g.shortLabel || (g.label?.length > 12 ? `${g.label.slice(0, 11)}…` : g.label)
  }));

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-4 text-xs">
        <span className="inline-flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-300">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: primaryColor }} />
          {primaryLabel}
        </span>
        <span className="inline-flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-300">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: secondaryColor }} />
          {secondaryLabel}
        </span>
      </div>

      <div className="w-full" style={{ height }} dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 4, bottom: 4 }} barGap={4}>
            <CartesianGrid strokeDasharray="3 4" vertical={false} stroke="#94a3b8" strokeOpacity={0.22} />
            <XAxis
              dataKey="displayLabel"
              tick={{ fontSize: 10.5, fontWeight: 700, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatCompactAxis}
              tick={{ fontSize: 10.5, fontWeight: 700, fill: '#94a3b8', fontFamily: 'monospace' }}
              axisLine={false}
              tickLine={false}
              width={46}
            />
            <Tooltip
              cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }}
              content={<ChartTooltipCard valueFormatter={formatCurrency} />}
            />
            <Bar
              dataKey="primary"
              name={primaryLabel}
              fill={primaryColor}
              radius={[6, 6, 0, 0]}
              barSize={18}
              isAnimationActive={true}
              animationDuration={600}
              animationEasing="ease-out"
            />
            <Bar
              dataKey="secondary"
              name={secondaryLabel}
              fill={secondaryColor}
              radius={[6, 6, 0, 0]}
              barSize={18}
              isAnimationActive={true}
              animationDuration={650}
              animationEasing="ease-out"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
