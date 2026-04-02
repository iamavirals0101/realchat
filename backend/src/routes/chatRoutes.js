import { Router } from "express";
import { requireUser } from "../middleware/requireUser.js";
import { upload } from "../lib/upload.js";
import {
  addConversationNote,
  deleteMessage,
  editMessage,
  getAnalyticsOverview,
  getCannedReplies,
  getConversationNotes,
  getConversations,
  getMessages,
  getResponseEstimate,
  getConversationSummary,
  listUsers,
  markConversationRead,
  postMessage,
  submitFeedback,
  updateConversationTicket,
  uploadAttachment
} from "../controllers/chatController.js";

const router = Router();

router.get("/users", listUsers);
router.get("/conversations", requireUser, getConversations);
router.get("/messages/:conversationId", requireUser, getMessages);
router.post("/message", postMessage);
router.post("/message/:messageId/edit", requireUser, editMessage);
router.post("/message/:messageId/delete", requireUser, deleteMessage);
router.patch("/message/:messageId", requireUser, editMessage);
router.delete("/message/:messageId", requireUser, deleteMessage);
router.patch("/conversations/:conversationId/ticket", updateConversationTicket);
router.post("/conversations/:conversationId/ticket", updateConversationTicket);
router.post("/conversations/:conversationId/read", requireUser, markConversationRead);
router.get("/conversations/:conversationId/notes", requireUser, getConversationNotes);
router.post("/conversations/:conversationId/notes", requireUser, addConversationNote);
router.get("/conversations/:conversationId/summary", requireUser, getConversationSummary);
router.get("/conversations/:conversationId/eta", requireUser, getResponseEstimate);
router.post("/conversations/:conversationId/feedback", requireUser, submitFeedback);
router.get("/canned-replies", getCannedReplies);
router.get("/analytics/overview", getAnalyticsOverview);
router.patch("/messages/:messageId", requireUser, editMessage);
router.delete("/messages/:messageId", requireUser, deleteMessage);
router.post("/uploads/attachment", requireUser, upload.single("file"), uploadAttachment);

export default router;
