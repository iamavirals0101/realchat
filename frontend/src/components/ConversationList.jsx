import { fmtAgo } from "../utils";

export default function ConversationList({ conversations, activeConversationId, onSelect, onlineUsers }) {
  if (!conversations.length) {
    return <div className="rounded-xl bg-white p-6 text-sm text-muted">No conversations yet.</div>;
  }

  return (
    <div className="overflow-y-auto scrollbar-thin">
      {conversations.map((item) => {
        const isActive = item.id === activeConversationId;
        const isOnline = onlineUsers.has(item.user.id);

        return (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            className={`mb-2 w-full rounded-xl border px-3 py-3 text-left transition ${
              isActive ? "border-accent bg-accentSoft" : "border-transparent bg-white hover:border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="truncate text-sm font-semibold text-ink">{item.user.name}</div>
                <div className="text-[10px] uppercase tracking-wide text-slate-400">
                  {item.participantRole === "SUPPORT" ? "Support Executive" : "Customer"}
                </div>
              </div>
              {item.lastMessage?.timestamp ? (
                <div className="text-xs text-muted">{fmtAgo(item.lastMessage.timestamp)}</div>
              ) : null}
            </div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <div className="truncate text-xs text-muted">{item.lastMessage?.content || "Start conversation"}</div>
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-slate-300"}`} />
                {item.unreadCount > 0 ? (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-white">{item.unreadCount}</span>
                ) : null}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
