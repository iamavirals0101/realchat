import { useEffect, useRef, useState } from "react";
import { fmtTime } from "../utils";

export default function ChatWindow({
  currentUser,
  conversation,
  messages,
  input,
  setInput,
  onSend,
  onLoadOlder,
  hasMore,
  isTyping,
  onEditMessage,
  onDeleteMessage,
  attachment,
  setAttachment
}) {
  const endRef = useRef(null);
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, conversation?.id]);

  if (!conversation) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl bg-white">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-ink">Choose a conversation</h3>
          <p className="text-sm text-muted">Open a chat from the left to start messaging.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-panel">
      <div className="border-b border-slate-100 bg-gradient-to-r from-white to-slate-50 px-5 py-4">
        <h3 className="font-semibold text-ink">{conversation.user.name}</h3>
        <p className="text-xs text-muted">{isTyping ? "Typing..." : "Active conversation"}</p>
      </div>

      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 to-white px-5 py-4 scrollbar-thin">
        {hasMore ? (
          <button onClick={onLoadOlder} className="mx-auto mb-4 block text-xs font-medium text-accent hover:underline">
            Load older messages
          </button>
        ) : null}

        <div className="space-y-3">
          {messages.map((message) => {
            const mine = message.senderId === currentUser.id;
            const deleted = Boolean(message.deletedAt);

            return (
              <div key={message.id} className={`group flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                    mine ? "bg-accent text-white" : "bg-slate-100 text-ink"
                  }`}
                >
                  {editingId === message.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        rows={2}
                        className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-ink"
                      />
                      <div className="flex gap-2 text-[11px]">
                        <button
                          onClick={() => {
                            onEditMessage(message.id, editingText);
                            setEditingId(null);
                          }}
                          className="rounded bg-emerald-500 px-2 py-1 text-white"
                        >
                          Save
                        </button>
                        <button onClick={() => setEditingId(null)} className="rounded bg-slate-300 px-2 py-1 text-slate-700">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className={`text-sm leading-relaxed ${deleted ? "italic opacity-75" : ""}`}>{message.content}</p>
                      {message.attachmentUrl ? (
                        <a
                          href={message.attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={`mt-2 block rounded-lg border px-2 py-1 text-xs ${
                            mine ? "border-blue-300 text-blue-100" : "border-slate-300 text-slate-600"
                          }`}
                        >
                          {message.type === "IMAGE" ? "Open image" : "Open file"}
                          {message.attachmentName ? `: ${message.attachmentName}` : ""}
                        </a>
                      ) : null}
                    </>
                  )}

                  <div className="mt-1 flex items-center justify-between gap-3 text-[10px]">
                    <p className={mine ? "text-blue-100" : "text-slate-500"}>
                      {fmtTime(message.timestamp)}
                      {message.editedAt ? " • edited" : ""}
                      {message.readAt && mine ? " • read" : ""}
                    </p>
                    {mine && !deleted && editingId !== message.id ? (
                      <div className="hidden gap-2 group-hover:flex">
                        <button
                          onClick={() => {
                            setEditingId(message.id);
                            setEditingText(message.content);
                          }}
                          className={mine ? "text-blue-100" : "text-slate-500"}
                        >
                          Edit
                        </button>
                        <button onClick={() => onDeleteMessage(message.id)} className={mine ? "text-blue-100" : "text-slate-500"}>
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
      </div>

      <form onSubmit={onSend} className="border-t border-slate-100 p-3">
        <div className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-3">
          <select
            value={attachment.type}
            onChange={(e) => setAttachment((prev) => ({ ...prev, type: e.target.value }))}
            className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
          >
            <option value="TEXT">Text</option>
            <option value="IMAGE">Image URL</option>
            <option value="FILE">File URL</option>
          </select>
          <input
            value={attachment.url}
            onChange={(e) => setAttachment((prev) => ({ ...prev, url: e.target.value }))}
            placeholder="Attachment URL (optional)"
            className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
          />
          <input
            value={attachment.name}
            onChange={(e) => setAttachment((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Attachment name"
            className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
          />
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 p-2 focus-within:border-accent">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.ctrlKey && e.key === "Enter") {
                onSend(e);
              }
            }}
            placeholder="Write a message..."
            className="w-full border-none bg-transparent px-2 text-sm outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
