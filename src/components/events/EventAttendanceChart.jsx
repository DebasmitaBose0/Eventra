/**
 * EventAttendanceChart
 *
 * Renders a responsive attendance analytics chart for event organizers.
 * Shows registration trends over time and a breakdown by attendee type.
 *
 * Features:
 * - Bar chart: daily registrations over the past 7 / 30 days
 * - Donut chart: attendee type breakdown (General, VIP, Speaker, etc.)
 * - Accessible: keyboard-navigable, ARIA-labelled, reduced-motion aware
 * - Graceful empty state when no data is available
 */

import { useMemo, useState } from "react";
import { Users, TrendingUp, TrendingDown, Minus } from "lucide-react";
import useReducedMotion from "../../hooks/useReducedMotion";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function generateDailyBuckets(registrations = [], days = 7) {
  const buckets = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const label = formatDate(d.toISOString().slice(0, 10));
    const dateKey = d.toISOString().slice(0, 10);

    const count = registrations.filter(
      (r) => r.registeredAt && r.registeredAt.startsWith(dateKey)
    ).length;

    buckets.push({ label, count, dateKey });
  }
  return buckets;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * A single bar in the bar chart.
 */
function Bar({ bucket, maxCount, height, prefersReducedMotion }) {
  const pct = maxCount > 0 ? clamp((bucket.count / maxCount) * 100, 2, 100) : 2;
  const barHeight = Math.round((pct / 100) * height);

  return (
    <div
      className="flex flex-col items-center gap-1.5 flex-1"
      role="img"
      aria-label={`${bucket.label}: ${bucket.count} registrations`}
    >
      {/* Count label */}
      <span className="text-[10px] font-semibold text-slate-500 tabular-nums select-none">
        {bucket.count > 0 ? bucket.count : ""}
      </span>

      {/* Bar */}
      <div
        className="w-full rounded-t-lg bg-indigo-500 dark:bg-indigo-400"
        style={{
          height: `${barHeight}px`,
          transition: prefersReducedMotion ? "none" : "height 0.5s ease",
          minHeight: bucket.count === 0 ? "2px" : undefined,
          opacity: bucket.count === 0 ? 0.25 : 1,
        }}
        aria-hidden="true"
      />

      {/* Date label */}
      <span className="text-[10px] text-slate-400 text-center select-none leading-tight">
        {bucket.label}
      </span>
    </div>
  );
}

/**
 * Mini stat card.
 */
function StatCard({ label, value, delta, icon: Icon }) {
  const isPositive = delta > 0;
  const isNeutral = delta === 0;

  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-slate-50 dark:bg-gray-800 p-4 border border-slate-200/80 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide">
          {label}
        </span>
        {Icon && (
          <Icon
            className="h-4 w-4 text-indigo-500 dark:text-indigo-400"
            aria-hidden="true"
          />
        )}
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
        {value}
      </p>
      {delta !== undefined && (
        <div
          className={`flex items-center gap-1 text-xs font-semibold ${
            isNeutral
              ? "text-slate-400"
              : isPositive
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-500 dark:text-rose-400"
          }`}
        >
          {isNeutral ? (
            <Minus className="h-3 w-3" aria-hidden="true" />
          ) : isPositive ? (
            <TrendingUp className="h-3 w-3" aria-hidden="true" />
          ) : (
            <TrendingDown className="h-3 w-3" aria-hidden="true" />
          )}
          <span>
            {isPositive ? "+" : ""}
            {delta}% vs last period
          </span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * @param {Object}   props
 * @param {Object}   props.event           - Event object with capacity / attendees fields
 * @param {Array}    [props.registrations] - Array of registration objects { registeredAt, ticketType }
 * @param {string}   [props.className]     - Extra CSS classes
 */
export default function EventAttendanceChart({
  event = {},
  registrations = [],
  className = "",
}) {
  const prefersReducedMotion = useReducedMotion();
  const [range, setRange] = useState(7); // 7 | 30

  const dailyBuckets = useMemo(
    () => generateDailyBuckets(registrations, range),
    [registrations, range]
  );

  const maxDailyCount = useMemo(
    () => Math.max(1, ...dailyBuckets.map((b) => b.count)),
    [dailyBuckets]
  );

  const totalRegistered = registrations.length;
  const capacity = event.capacity ?? event.maxAttendees ?? 0;
  const capacityPct =
    capacity > 0 ? Math.round((totalRegistered / capacity) * 100) : null;

  // Ticket-type breakdown
  const typeBreakdown = useMemo(() => {
    const map = {};
    registrations.forEach((r) => {
      const t = r.ticketType || "General";
      map[t] = (map[t] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [registrations]);

  const COLORS = [
    "bg-indigo-500",
    "bg-sky-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-purple-500",
  ];

  // Week-over-week delta (compare last 7 days vs prior 7 days)
  const thisWeek = dailyBuckets.slice(-7).reduce((s, b) => s + b.count, 0);
  const priorWeek = generateDailyBuckets(registrations, 14)
    .slice(0, 7)
    .reduce((s, b) => s + b.count, 0);
  const weekDelta =
    priorWeek === 0
      ? 0
      : Math.round(((thisWeek - priorWeek) / priorWeek) * 100);

  const CHART_HEIGHT = 120;

  if (registrations.length === 0) {
    return (
      <section
        className={`rounded-3xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 text-center shadow-sm ${className}`}
        aria-label="Attendance analytics"
      >
        <Users
          className="mx-auto h-10 w-10 text-slate-300 dark:text-gray-600 mb-3"
          aria-hidden="true"
        />
        <p className="text-slate-500 dark:text-gray-400 text-sm">
          No registrations yet. Analytics will appear once attendees start
          registering.
        </p>
      </section>
    );
  }

  return (
    <section
      className={`rounded-3xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm space-y-6 ${className}`}
      aria-label="Attendance analytics"
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Users className="h-5 w-5 text-indigo-500" aria-hidden="true" />
          Attendance Analytics
        </h2>

        {/* Range selector */}
        <div
          role="group"
          aria-label="Select time range"
          className="flex rounded-xl border border-slate-200 dark:border-gray-700 overflow-hidden text-xs font-semibold"
        >
          {[7, 30].map((d) => (
            <button
              key={d}
              onClick={() => setRange(d)}
              className={`px-3 py-1.5 transition-colors ${
                range === d
                  ? "bg-indigo-600 text-white"
                  : "text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-800"
              }`}
              aria-pressed={range === d}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard
          label="Total Registered"
          value={totalRegistered}
          icon={Users}
          delta={weekDelta}
        />
        {capacityPct !== null && (
          <StatCard
            label="Capacity Used"
            value={`${capacityPct}%`}
            icon={null}
          />
        )}
        <StatCard
          label={`Registrations (${range}d)`}
          value={dailyBuckets.reduce((s, b) => s + b.count, 0)}
          icon={TrendingUp}
        />
      </div>

      {/* Daily bar chart */}
      <div>
        <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          Daily Registrations — Last {range} Days
        </p>
        <div
          className="flex items-end gap-1.5"
          style={{ height: `${CHART_HEIGHT + 36}px` }}
          role="img"
          aria-label={`Bar chart showing daily registrations over the past ${range} days`}
        >
          {dailyBuckets.map((bucket) => (
            <Bar
              key={bucket.dateKey}
              bucket={bucket}
              maxCount={maxDailyCount}
              height={CHART_HEIGHT}
              prefersReducedMotion={prefersReducedMotion}
            />
          ))}
        </div>
      </div>

      {/* Ticket-type breakdown */}
      {typeBreakdown.length > 1 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Ticket Type Breakdown
          </p>
          <ul className="space-y-2" aria-label="Ticket type breakdown">
            {typeBreakdown.map(([type, count], idx) => {
              const pct = Math.round((count / totalRegistered) * 100);
              return (
                <li key={type} className="flex items-center gap-3">
                  <span
                    className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                      COLORS[idx % COLORS.length]
                    }`}
                    aria-hidden="true"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-slate-700 dark:text-gray-300 truncate">
                        {type}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white tabular-nums ml-2">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div
                      className="h-1.5 rounded-full bg-slate-100 dark:bg-gray-700 overflow-hidden"
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${type}: ${pct}%`}
                    >
                      <div
                        className={`h-full rounded-full ${COLORS[idx % COLORS.length]}`}
                        style={{
                          width: `${pct}%`,
                          transition: prefersReducedMotion
                            ? "none"
                            : "width 0.6s ease",
                        }}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Capacity progress */}
      {capacityPct !== null && (
        <div>
          <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1.5">
            <span>Overall Capacity</span>
            <span className="tabular-nums">
              {totalRegistered} / {capacity}
            </span>
          </div>
          <div
            className="h-2.5 rounded-full bg-slate-100 dark:bg-gray-700 overflow-hidden"
            role="progressbar"
            aria-valuenow={capacityPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${capacityPct}% capacity filled`}
          >
            <div
              className={`h-full rounded-full transition-all ${
                capacityPct >= 90
                  ? "bg-rose-500"
                  : capacityPct >= 70
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }`}
              style={{
                width: `${clamp(capacityPct, 0, 100)}%`,
                transition: prefersReducedMotion ? "none" : "width 0.6s ease",
              }}
            />
          </div>
          {capacityPct >= 90 && (
            <p
              className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-semibold"
              role="alert"
            >
              ⚠ Almost full — only {capacity - totalRegistered} spots remaining!
            </p>
          )}
        </div>
      )}
    </section>
  );
}
