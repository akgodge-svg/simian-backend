import express from 'express';
import { ChatController } from '../controllers/ChatController.js';
const router = express.Router();
// Chat channel routes
router.get('/channels', ChatController.getUserChannels);
router.post('/channels', ChatController.createChannel);
router.get('/channels/:id/messages', ChatController.getChannelMessages);
router.post('/channels/:id/messages', ChatController.sendMessage);
router.post('/channels/:id/upload', ChatController.sendFileMessage);
router.post('/channels/:id/join', ChatController.joinChannel);
router.get('/channels/:id/participants', ChatController.getChannelParticipants);
router.post('/channels/:id/mark-read', ChatController.markAsRead);
// User status routes
router.post('/online-status', ChatController.updateOnlineStatus);
router.get('/unread-count', ChatController.getUnreadCount);
export default router;