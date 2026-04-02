export default function SupportTools({
  isSupport,
  cannedReplies,
  onUseReply,
  notes,
  noteInput,
  setNoteInput,
  onSaveNote,
  summary
}) {
  if (!isSupport) return null;

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-white p-3">
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Quick Replies</h4>
        <div className="mt-2 flex flex-wrap gap-2">
          {cannedReplies.map((reply) => (
            <button
              key={reply}
              onClick={() => onUseReply(reply)}
              className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600 hover:border-accent hover:text-accent"
            >
              {reply.slice(0, 42)}...
            </button>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Conversation Summary</h4>
        <p className="mt-1 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">{summary || "Loading summary..."}</p>
      </div>

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Internal Notes</h4>
        <textarea
          value={noteInput}
          onChange={(e) => setNoteInput(e.target.value)}
          placeholder="Add private note for support team"
          className="mt-2 w-full rounded-lg border border-slate-200 p-2 text-xs"
          rows={2}
        />
        <button onClick={onSaveNote} className="mt-2 rounded-lg bg-ink px-3 py-1 text-xs text-white">
          Save Note
        </button>
        <div className="mt-2 max-h-28 space-y-1 overflow-y-auto">
          {notes.map((note) => (
            <div key={note.id} className="rounded-md border border-slate-100 bg-slate-50 p-2 text-[11px] text-slate-600">
              <span className="font-semibold text-slate-700">{note.author.name}: </span>
              {note.content}
            </div>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-slate-400">Shortcut: Press Ctrl+Enter to send quickly.</p>
    </div>
  );
}
