import { useEffect, useMemo, useRef, useState } from "react";
import AnalyticsPanel from "./components/AnalyticsPanel";
import ChatWindow from "./components/ChatWindow";
import ConversationList from "./components/ConversationList";
import CustomerExperience from "./components/CustomerExperience";
import InboxFilters from "./components/InboxFilters";
import SupportTools from "./components/SupportTools";
import UserSwitcher from "./components/UserSwitcher";
import {
  addNote,
  editMessage,
  fetchCannedReplies,
  fetchConversationSummary,
  fetchConversations,
  fetchAnalytics,
  fetchEta,
  fetchMessages,
  fetchNotes,
  fetchUsers,
  markRead,
  removeMessage,
  submitFeedback,
  updateConversationTicket,
  uploadAttachment
} from "./services/api";
import { connectSocket } from "./services/socket";

export default function App() {
  const [users, setUsers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [typingByConversation, setTypingByConversation] = useState({});
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [attachment, setAttachment] = useState({ type: "TEXT", url: "", name: "" });
  const [notes, setNotes] = useState([]);
  const [noteInput, setNoteInput] = useState("");
  const [cannedReplies, setCannedReplies] = useState([]);
  const [summary, setSummary] = useState("");
  const [eta, setEta] = useState(null);
  const [feedback, setFeedback] = useState({ rating: "", comment: "" });
  const [analytics, setAnalytics] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    priority: "",
    unreadOnly: false,
    assignedMe: false,
    sort: "recent"
  });

  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const currentUser = useMemo(() => users.find((u) => u.id === currentUserId), [users, currentUserId]);

  async function loadConversations(userId) {
    const params = {
      ...(filters.search ? { search: filters.search } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.priority ? { priority: filters.priority } : {}),
      ...(filters.unreadOnly ? { unreadOnly: true } : {}),
      ...(filters.assignedMe ? { assigned: "me" } : {}),
      ...(filters.sort ? { sort: filters.sort } : {})
    };
    const data = await fetchConversations(userId, params);
    setConversations(data);
    setActiveConversation((prev) => {
      if (!data.length) return null;
      if (!prev) return data[0];
      return data.find((item) => item.id === prev.id) || data[0];
    });
  }

  async function loadMessages(conversationId, userId, nextCursor) {
    const data = await fetchMessages({ conversationId, userId, cursor: nextCursor });
    setMessages((prev) => (nextCursor ? [...data.messages, ...prev] : data.messages));
    setCursor(data.nextCursor);
    if (!nextCursor) {
      loadConversations(userId);
      markRead(conversationId, userId);
    }
  }

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const allUsers = await fetchUsers();
      setUsers(allUsers);
      if (allUsers.length) {
        setCurrentUserId(allUsers[0].id);
      }
      setLoading(false);
    };

    init();
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    loadConversations(currentUserId);

    // Recreate socket bindings whenever user or filter scope changes so inbox events stay context-aware.
    const socket = connectSocket(currentUserId);
    socketRef.current = socket;

    socket.on("message:new", (message) => {
      if (activeConversation && message.conversationId === activeConversation.id) {
        setMessages((prev) => [...prev, message]);
      }
      loadConversations(currentUserId);
    });

    socket.on("typing:update", ({ conversationId, fromUserId, isTyping }) => {
      if (fromUserId === currentUserId) return;
      setTypingByConversation((prev) => ({ ...prev, [conversationId]: isTyping }));
    });

    socket.on("user:status", ({ userId, isOnline }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (isOnline) next.add(userId);
        else next.delete(userId);
        return next;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUserId, filters.search, filters.status, filters.priority, filters.unreadOnly, filters.assignedMe, filters.sort]);

  useEffect(() => {
    if (!activeConversation || !currentUserId) return;
    loadMessages(activeConversation.id, currentUserId);
  }, [activeConversation?.id, currentUserId]);

  useEffect(() => {
    if (!activeConversation || !currentUserId || currentUser?.role !== "SUPPORT") return;
    fetchNotes(activeConversation.id, currentUserId).then(setNotes);
    fetchCannedReplies().then(setCannedReplies);
    fetchConversationSummary(activeConversation.id, currentUserId).then((data) => setSummary(data.summary));
  }, [activeConversation?.id, currentUserId, currentUser?.role]);

  useEffect(() => {
    if (!activeConversation || !currentUserId || currentUser?.role !== "CUSTOMER") return;
    fetchEta(activeConversation.id, currentUserId).then(setEta);
  }, [activeConversation?.id, currentUserId, currentUser?.role]);

  useEffect(() => {
    if (currentUser?.role !== "SUPPORT") return;
    fetchAnalytics().then(setAnalytics);
  }, [currentUser?.role, conversations.length]);

  const onSend = async (e) => {
    e.preventDefault();
    const content = input.trim();
    if ((!content && !attachment.url) || !activeConversation) return;

    socketRef.current?.emit(
      "message:send",
      {
        receiverId: activeConversation.user.id,
        content,
        type: attachment.type,
        attachmentUrl: attachment.url || undefined,
        attachmentName: attachment.name || undefined
      },
      (ack) => {
        if (!ack?.ok) return;
      }
    );

    socketRef.current?.emit("typing:stop", {
      toUserId: activeConversation.user.id,
      conversationId: activeConversation.id
    });

    setInput("");
    setAttachment({ type: "TEXT", url: "", name: "" });
  };

  const onType = (value) => {
    setInput(value);
    if (!activeConversation) return;

    socketRef.current?.emit("typing:start", {
      toUserId: activeConversation.user.id,
      conversationId: activeConversation.id
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit("typing:stop", {
        toUserId: activeConversation.user.id,
        conversationId: activeConversation.id
      });
    }, 1000);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-panel">
        <div className="rounded-xl bg-white px-5 py-3 text-sm text-muted shadow-panel">Loading chat workspace...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden bg-panel p-3 md:p-6">
      <div className="mx-auto grid h-full max-w-7xl grid-cols-1 gap-4 md:grid-cols-[320px_1fr]">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-panel">
          <div className="mb-2 flex items-center gap-3 rounded-xl bg-gradient-to-r from-accentSoft to-white p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-white">
              <BrandChatIcon />
            </div>
            <h1 className="text-xl font-bold text-ink">
              {currentUser?.role === "SUPPORT" ? "Support Inbox" : "Customer Support Chat"}
            </h1>
          </div>
          <p className="mb-4 text-xs text-muted">
            {currentUser?.role === "SUPPORT"
              ? "Reply to customer conversations in real time"
              : "Chat directly with your assigned support executive"}
          </p>

          <UserSwitcher users={users} currentUserId={currentUserId} onChange={setCurrentUserId} />
          <InboxFilters filters={filters} onChange={setFilters} isSupport={currentUser?.role === "SUPPORT"} />

          <div className="mt-4 min-h-0 flex-1">
            <ConversationList
              conversations={conversations}
              activeConversationId={activeConversation?.id}
              onSelect={setActiveConversation}
              onlineUsers={onlineUsers}
            />
          </div>
          <SupportTools
            isSupport={currentUser?.role === "SUPPORT"}
            cannedReplies={cannedReplies}
            onUseReply={(reply) => setInput(reply)}
            notes={notes}
            noteInput={noteInput}
            setNoteInput={setNoteInput}
            onSaveNote={async () => {
              if (!activeConversation || !noteInput.trim()) return;
              const created = await addNote(activeConversation.id, currentUserId, noteInput.trim());
              setNotes((prev) => [created, ...prev]);
              setNoteInput("");
            }}
            summary={summary}
          />
        </aside>

        <main className="flex min-h-0 h-full flex-col overflow-hidden">
          <AnalyticsPanel isSupport={currentUser?.role === "SUPPORT"} analytics={analytics} />
          <CustomerExperience
            isCustomer={currentUser?.role === "CUSTOMER"}
            eta={eta}
            conversation={activeConversation}
            feedback={feedback}
            setFeedback={setFeedback}
            onSubmitFeedback={async () => {
              if (!activeConversation || !feedback.rating) return;
              await submitFeedback(activeConversation.id, currentUserId, {
                rating: Number(feedback.rating),
                comment: feedback.comment
              });
              setFeedback({ rating: "", comment: "" });
              loadConversations(currentUserId);
            }}
          />
          <div className="min-h-0 flex-1">
            <ChatWindow
              currentUser={currentUser}
              conversation={activeConversation}
              messages={messages}
              input={input}
              setInput={onType}
              onSend={onSend}
              onLoadOlder={() => loadMessages(activeConversation.id, currentUserId, cursor)}
              hasMore={Boolean(cursor)}
              isTyping={Boolean(activeConversation && typingByConversation[activeConversation.id])}
              onCloseConversation={async (conversationId) => {
                await updateConversationTicket(conversationId, currentUserId, { status: "CLOSED" });
                setActiveConversation((prev) => (prev ? { ...prev, status: "CLOSED" } : prev));
                loadConversations(currentUserId);
              }}
              onUploadAttachment={async (file) => {
                try {
                  const uploaded = await uploadAttachment(currentUserId, file);
                  setAttachment({
                    type: uploaded.type,
                    url: uploaded.url,
                    name: uploaded.name || file.name || ""
                  });
                } catch (_error) {
                  // Keep UX simple for demo; uploader failure just leaves attachment unchanged.
                }
              }}
              onEditMessage={async (messageId, nextText) => {
                const updated = await editMessage(messageId, currentUserId, nextText);
                setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, ...updated } : m)));
              }}
              onDeleteMessage={async (messageId) => {
                const updated = await removeMessage(messageId, currentUserId);
                setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, ...updated } : m)));
              }}
              attachment={attachment}
              setAttachment={setAttachment}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

function BrandChatIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M5 6a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3h-5l-4 4v-4a3 3 0 0 1-3-3z" />
      <path d="M9 8h6M9 11h4" />
    </svg>
  );
}
