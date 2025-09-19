import { ChatService } from '../services/ChatService.js';
import multer from 'multer';
import path from 'path';
// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
 storage: storage,
 limits: {
 fileSize: 10 * 1024 * 1024 // 10MB limit
 },
 fileFilter: (req, file, cb) => {
 // Allow most file types for chat
 const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', '.txt', '.mp4', '.mp3'];
 const fileExt = path.extname(file.originalname).toLowerCase();

 if (allowedTypes.includes(fileExt)) {
 cb(null, true);
 } else {
 cb(new Error('File type not allowed'), false);
 }
 }
});
export class ChatController {
 // GET /api/chat/channels
 static async getUserChannels(req, res) {
 try {
 const userContext = {
 userName: req.userName || 'system',
 userRole: req.userRole || 'admin',
 centerContext: req.centerContext || { id: 1, type: 'main' }
 };
 const result = await ChatService.getUserChannels(
 userContext.userName,
 userContext.userRole,
 userContext.centerContext
 );
 res.status(200).json(result);
 } catch (error) {
 console.error('Error getting user channels:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // GET /api/chat/channels/:id/messages
 static async getChannelMessages(req, res) {
 try {
 const { id } = req.params;
 const limit = parseInt(req.query.limit) || 50;
 const offset = parseInt(req.query.offset) || 0;
 if (!id || isNaN(id)) {
 return res.status(400).json({
 success: false,
 message: 'Valid channel ID is required'
 });
 }
 const userContext = {
 userName: req.userName || 'system',
 userRole: req.userRole || 'admin',
 centerContext: req.centerContext || { id: 1, type: 'main' }
 };
 const result = await ChatService.getChannelMessages(
 id,
 userContext.userName,
 userContext.userRole,
 userContext.centerContext,
 limit,
 offset
 );
 if (!result.success) {
 return res.status(403).json(result);
 }
 res.status(200).json(result);
 } catch (error) {
 console.error('Error getting channel messages:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // POST /api/chat/channels/:id/messages
 static async sendMessage(req, res) {
 try {
 const { id } = req.params;
 const { message_content, message_type, reply_to_message_id } = req.body;
 if (!id || isNaN(id)) {
 return res.status(400).json({
 success: false,
 message: 'Valid channel ID is required'
 });
 }
 if (!message_content || message_content.trim() === '') {
 return res.status(400).json({
 success: false,
 message: 'Message content is required'
 });
 }
 const userContext = {
 userName: req.userName || 'system',
 userRole: req.userRole || 'admin',
 displayName: req.displayName || req.userName || 'System User',
 centerContext: req.centerContext || { id: 1, type: 'main' }
 };
 const messageData = {
 channel_id: parseInt(id),
 message_content: message_content.trim(),
 message_type: message_type || 'text',
 reply_to_message_id: reply_to_message_id || null
 };
 const result = await ChatService.sendMessage(messageData, userContext);
 if (!result.success) {
 return res.status(403).json(result);
 }
 res.status(201).json(result);
 } catch (error) {
 console.error('Error sending message:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // POST /api/chat/channels/:id/upload
 static async sendFileMessage(req, res) {
 upload.single('file')(req, res, async (err) => {
 if (err) {
 return res.status(400).json({
 success: false,
 message: err.message
 });
 }
 try {
 const { id } = req.params;
 const { message_content } = req.body;
 const file = req.file;
 if (!id || isNaN(id)) {
 return res.status(400).json({
 success: false,
 message: 'Valid channel ID is required'
 });
 }
 if (!file) {
 return res.status(400).json({
 success: false,
 message: 'File is required'
 });
 }
 const userContext = {
 userName: req.userName || 'system',
 userRole: req.userRole || 'admin',
 displayName: req.displayName || req.userName || 'System User',
 centerContext: req.centerContext || { id: 1, type: 'main'}
 };
 const result = await ChatService.sendFileMessage(
 parseInt(id),
 file,
 message_content,
 userContext
 );
 if (!result.success) {
 return res.status(403).json(result);
 }
 res.status(201).json(result);
 } catch (error) {
 console.error('Error sending file message:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 });
 }
 // POST /api/chat/channels
 static async createChannel(req, res) {
 try {
 const { channel_type, channel_title, description, center_id, course_booking_id } = req.body;
 if (!channel_type || !channel_title){
 return res.status(400).json({
 success: false,
 message: 'Channel type and title are required'
 });
 }
 const userContext = {
 userName: req.userName || 'system',
 userRole: req.userRole || 'admin',
 displayName: req.displayName || req.userName || 'System User',
 centerContext: req.centerContext || { id: 1, type: 'main' }
 };
 const channelData = {
 channel_type,
 channel_title,
 description,
 center_id,
 course_booking_id
 };
 const result = await ChatService.createChannel(channelData, userContext);
 res.status(201).json(result);
 } catch (error) {
 console.error('Error creating channel:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // POST /api/chat/channels/:id/join
 static async joinChannel(req, res) {
 try {
 const { id } = req.params;
 if (!id || isNaN(id)) {
 return res.status(400).json({
 success: false,
 message: 'Valid channel ID is required'
 });
 }
 const userContext = {
 userName: req.userName || 'system',
 userRole: req.userRole || 'admin',
 displayName: req.displayName || req.userName || 'System User',
 centerContext: req.centerContext || { id: 1, type: 'main' }
 };
 const result = await ChatService.joinChannel(parseInt(id), userContext);
 res.status(200).json(result);
 } catch (error) {
 console.error('Error joining channel:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // GET /api/chat/channels/:id/participants
 static async getChannelParticipants(req, res) {
 try {
 const { id } = req.params;
 if (!id || isNaN(id)) {
 return res.status(400).json({
 success: false,
 message: 'Valid channel ID is required'
 });
 }
 const userContext = {
 userName: req.userName || 'system',
 userRole: req.userRole || 'admin',
 centerContext: req.centerContext || { id: 1, type: 'main' }
 };
 const result = await ChatService.getChannelParticipants(parseInt(id), userContext);
 if (!result.success) {
 return res.status(403).json(result);
 }
 res.status(200).json(result);
 } catch (error) {
 console.error('Error getting channel participants:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // POST /api/chat/online-status
 static async updateOnlineStatus(req, res) {
 try {
 const { is_online } = req.body;
 const userName = req.userName || 'system';
 const result = await ChatService.updateOnlineStatus(userName, is_online);
 res.status(200).json(result);
 } catch (error) {
 console.error('Error updating online status:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // POST /api/chat/channels/:id/mark-read
 static async markAsRead(req, res) {
 try {
 const { id } = req.params;
 const { message_ids } = req.body;
 if (!id || isNaN(id)) {
 return res.status(400).json({
 success: false,
 message: 'Valid channel ID is required'
 });
 }
 if (!message_ids || !Array.isArray(message_ids)) {
 return res.status(400).json({
 success: false,
 message: 'Message IDs array is required'
 });
 }
 const userName = req.userName || 'system';
 const result = await ChatService.markAsRead(parseInt(id), message_ids, userName);
 res.status(200).json(result);
 } catch (error) {
 console.error('Error marking messages as read:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // GET /api/chat/unread-count
 static async getUnreadCount(req, res) {
 try {
 const userName = req.userName || 'system';
 const channelId = req.query.channel_id || null;
 const result = await ChatService.getUnreadCount(userName, channelId);
 res.status(200).json(result);
 } catch (error) {
 console.error('Error getting unread count:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
}