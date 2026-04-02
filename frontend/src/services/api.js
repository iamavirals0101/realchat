import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api"
});

export async function fetchUsers() {
  const { data } = await api.get("/users");
  return data;
}

export async function fetchConversations(userId, params = {}) {
  const { data } = await api.get("/conversations", {
    headers: { "x-user-id": userId },
    params
  });
  return data;
}

export async function fetchMessages({ conversationId, userId, cursor, limit = 20 }) {
  const { data } = await api.get(`/messages/${conversationId}`, {
    headers: { "x-user-id": userId },
    params: { cursor, limit }
  });
  return data;
}

export async function sendMessage(payload) {
  const { data } = await api.post("/message", payload);
  return data;
}

export async function markRead(conversationId, userId) {
  const { data } = await api.post(
    `/conversations/${conversationId}/read`,
    {},
    {
      headers: { "x-user-id": userId }
    }
  );
  return data;
}

export async function editMessage(messageId, userId, content) {
  const { data } = await api.post(
    `/message/${messageId}/edit`,
    { content },
    {
      headers: { "x-user-id": userId }
    }
  );
  return data;
}

export async function removeMessage(messageId, userId) {
  const { data } = await api.post(
    `/message/${messageId}/delete`,
    {},
    {
      headers: { "x-user-id": userId }
    }
  );
  return data;
}

export async function fetchNotes(conversationId, userId) {
  const { data } = await api.get(`/conversations/${conversationId}/notes`, {
    headers: { "x-user-id": userId }
  });
  return data;
}

export async function addNote(conversationId, userId, content) {
  const { data } = await api.post(
    `/conversations/${conversationId}/notes`,
    { content },
    {
      headers: { "x-user-id": userId }
    }
  );
  return data;
}

export async function fetchCannedReplies() {
  const { data } = await api.get("/canned-replies");
  return data;
}

export async function fetchConversationSummary(conversationId, userId) {
  const { data } = await api.get(`/conversations/${conversationId}/summary`, {
    headers: { "x-user-id": userId }
  });
  return data;
}

export async function fetchEta(conversationId, userId) {
  const { data } = await api.get(`/conversations/${conversationId}/eta`, {
    headers: { "x-user-id": userId }
  });
  return data;
}

export async function submitFeedback(conversationId, userId, payload) {
  const { data } = await api.post(`/conversations/${conversationId}/feedback`, payload, {
    headers: { "x-user-id": userId }
  });
  return data;
}

export async function fetchAnalytics() {
  const { data } = await api.get("/analytics/overview");
  return data;
}

export async function updateConversationTicket(conversationId, userId, payload) {
  const { data } = await api.patch(`/conversations/${conversationId}/ticket`, payload, {
    headers: { "x-user-id": userId }
  });
  return data;
}

export async function uploadAttachment(userId, file) {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post("/uploads/attachment", formData, {
    headers: {
      "x-user-id": userId
    }
  });

  return data;
}
