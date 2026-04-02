export default function InboxFilters({ filters, onChange, isSupport }) {
  return (
    <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <input
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        placeholder="Search by subject, tag, or name"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-accent"
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value })}
          className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs"
        >
          <option value="">All status</option>
          <option value="OPEN">Open</option>
          <option value="PENDING">Pending</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
        <select
          value={filters.priority}
          onChange={(e) => onChange({ ...filters, priority: e.target.value })}
          className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs"
        >
          <option value="">All priority</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
        <select
          value={filters.sort}
          onChange={(e) => onChange({ ...filters, sort: e.target.value })}
          className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs"
        >
          <option value="recent">Sort: Recent</option>
          <option value="sla">Sort: SLA</option>
        </select>
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs">
          <input
            type="checkbox"
            checked={filters.unreadOnly}
            onChange={(e) => onChange({ ...filters, unreadOnly: e.target.checked })}
          />
          Unread only
        </label>
      </div>
      {isSupport ? (
        <label className="flex items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={filters.assignedMe}
            onChange={(e) => onChange({ ...filters, assignedMe: e.target.checked })}
          />
          Assigned to me
        </label>
      ) : null}
    </div>
  );
}
