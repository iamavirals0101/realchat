export default function AnalyticsPanel({ isSupport, analytics }) {
  if (!isSupport || !analytics) return null;

  const { summary, volumeByDay, agentPerformance } = analytics;
  const maxVolume = Math.max(...volumeByDay.map((v) => v.count), 1);

  return (
    <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3 shadow-panel">
      <h3 className="mb-2 text-sm font-semibold text-ink">Support Analytics</h3>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Metric label="Open" value={summary.open} />
        <Metric label="Pending" value={summary.pending} />
        <Metric label="Avg First Response (min)" value={summary.avgFirstResponseMinutes} />
        <Metric label="Avg CSAT" value={summary.avgCsat} />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-2">
          <h4 className="text-xs font-semibold text-slate-600">Message Volume</h4>
          <div className="mt-2 flex items-end gap-2">
            {volumeByDay.slice(-7).map((row) => (
              <div key={row.date} className="flex-1 text-center">
                <div className="mx-auto w-full rounded-t bg-accent" style={{ height: `${(row.count / maxVolume) * 70}px` }} />
                <div className="mt-1 text-[10px] text-slate-500">{row.date.slice(5)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50 p-2">
          <h4 className="text-xs font-semibold text-slate-600">Agent Performance</h4>
          <div className="mt-2 space-y-1">
            {agentPerformance.map((agent) => (
              <div key={agent.agentId} className="flex items-center justify-between text-xs text-slate-600">
                <span>{agent.agentName}</span>
                <span>{agent.resolvedCount}/{agent.assignedCount} resolved</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-2">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-lg font-semibold text-ink">{value}</div>
    </div>
  );
}
