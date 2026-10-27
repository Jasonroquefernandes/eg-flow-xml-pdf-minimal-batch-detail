"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BsTooltip } from "@brandsync/react";
import {
  OUTCOMES,
  OUTCOME_COLOR,
  OUTCOME_LABEL,
  type CountRow,
  type DayBucket,
  type Outcome,
} from "@/lib/dashboard";

const SWATCH = "inline-block size-2.5 shrink-0 rounded-[2px]";

export function Legend() {
  return (
    <ul className="bs-caption flex flex-wrap gap-x-4 gap-y-1" aria-label="Legend">
      {OUTCOMES.map((o) => (
        <li key={o} className="flex items-center gap-1.5">
          <span className={SWATCH} style={{ background: OUTCOME_COLOR[o] }} aria-hidden="true" />
          {OUTCOME_LABEL[o]}
        </li>
      ))}
    </ul>
  );
}

/** Stacked daily columns. Hover/focus a column for its breakdown; a hidden table mirrors the data. */
export function ActivityChart({ buckets }: { buckets: DayBucket[] }) {
  const data = buckets.map((b) => ({ key: b.key, label: b.label, ...b.counts }));
  const tickEvery = Math.ceil(buckets.length / 7);

  return (
    <div>
      <div className="h-[220px] w-full" role="img" aria-label={`Files created per day over the last ${buckets.length} days`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid vertical={false} stroke="var(--bs-border-default)" strokeDasharray="3 4" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              interval={tickEvery - 1}
              tick={{ fontSize: 10, fill: "var(--bs-text-muted)" }}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "var(--bs-text-muted)" }}
            />
            <Tooltip
              cursor={{ fill: "var(--bs-surface-inset)" }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const rows = payload.filter((p) => Number(p.value) > 0);
                const total = rows.reduce((sum, p) => sum + Number(p.value), 0);
                return (
                  <BsTooltip>
                    <div className="flex min-w-36 flex-col gap-1 text-left">
                      <span className="font-semibold">{label}</span>
                      {rows.length === 0 && <span>No files</span>}
                      {rows.map((p) => (
                        <span key={String(p.dataKey)} className="flex items-center gap-2">
                          <span className={SWATCH} style={{ background: OUTCOME_COLOR[p.dataKey as Outcome] }} aria-hidden="true" />
                          <span className="flex-1">{OUTCOME_LABEL[p.dataKey as Outcome]}</span>
                          <span className="font-semibold">{String(p.value)}</span>
                        </span>
                      ))}
                      {rows.length > 1 && (
                        <span className="flex justify-between border-t border-white/30 pt-1">
                          <span>Total</span>
                          <span className="font-semibold">{total}</span>
                        </span>
                      )}
                    </div>
                  </BsTooltip>
                );
              }}
            />
            {OUTCOMES.map((o: Outcome) => (
              <Bar key={o} dataKey={o} stackId="day" fill={OUTCOME_COLOR[o]} maxBarSize={28} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Files created per day by outcome</caption>
        <thead>
          <tr>
            <th>Day</th>
            {OUTCOMES.map((o) => (
              <th key={o}>{OUTCOME_LABEL[o]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {buckets.map((b) => (
            <tr key={b.key}>
              <td>{b.label}</td>
              {OUTCOMES.map((o) => (
                <td key={o}>{b.counts[o]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 7-point trend line for a KPI tile. Decorative: the tile already states the value. */
export function Sparkline({ values, color }: { values: number[]; color: string }) {
  const W = 96;
  const H = 28;
  const max = Math.max(1, ...values);
  const step = W / Math.max(1, values.length - 1);
  const pts = values.map((v, i) => [i * step, H - 3 - (v / max) * (H - 6)] as const);
  const line = pts.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)} ${py.toFixed(1)}`).join(" ");
  const flat = values.every((v) => v === 0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-7 w-24" aria-hidden="true">
      {flat ? (
        <line x1="0" x2={W} y1={H - 3} y2={H - 3} stroke="var(--bs-border-default)" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <>
          <path d={`${line} L${W} ${H} L0 ${H} Z`} fill={color} opacity="0.12" />
          <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
  );
}

/** One stacked bar showing the whole pipeline, with a labelled breakdown beneath. */
export function PipelineBreakdown({ counts, total }: { counts: Record<Outcome, number>; total: number }) {
  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-[var(--bs-surface-inset)]"
        role="img"
        aria-label={OUTCOMES.map((o) => `${counts[o]} ${OUTCOME_LABEL[o].toLowerCase()}`).join(", ")}
      >
        {OUTCOMES.map((o) =>
          counts[o] ? (
            <span
              key={o}
              style={{ width: `${(counts[o] / total) * 100}%`, background: OUTCOME_COLOR[o] }}
              className="border-r-2 border-[var(--bs-surface-raised)] last:border-r-0"
            />
          ) : null
        )}
      </div>
      <ul className="flex flex-col gap-2.5">
        {OUTCOMES.map((o) => (
          <li key={o} className="bs-body-sm flex items-center gap-2">
            <span className={SWATCH} style={{ background: OUTCOME_COLOR[o] }} aria-hidden="true" />
            <span className="flex-1">{OUTCOME_LABEL[o]}</span>
            <span className="bs-mono font-semibold">{counts[o]}</span>
            <span className="bs-caption bs-mono w-10 text-right">
              {total ? Math.round((counts[o] / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Ranked horizontal bars (label above bar so long messages stay readable). */
export function RankedBars({ rows, color }: { rows: CountRow[]; color: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ol className="flex flex-col gap-3">
      {rows.map((r) => (
        <li key={r.label} className="flex flex-col gap-1">
          <div className="bs-body-sm flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate" title={r.label}>
              {r.label}
            </span>
            <span className="bs-mono font-semibold">{r.count}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bs-surface-inset)]" aria-hidden="true">
            <div className="h-full rounded-full" style={{ width: `${(r.count / max) * 100}%`, background: color }} />
          </div>
        </li>
      ))}
    </ol>
  );
}
