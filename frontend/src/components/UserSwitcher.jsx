export default function UserSwitcher({ users, currentUserId, onChange }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">Signed in as</label>
      <select
        value={currentUserId || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-accent"
      >
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name} ({user.role === "SUPPORT" ? "Support" : "Customer"})
          </option>
        ))}
      </select>
    </div>
  );
}
