import { Chat } from '../models/Chat.js';
import { PusherSettings } from '../models/PusherSettings.js';
import { FileStorageService } from './FileStorageService.js';
export class ChatService {
 static pusherInstance = null;
 // Initialize Pusher with current settings
 static async initializePusher() {
 try {
 const settings = await PusherSettings.getActiveSettings();
 if (!settings) {
 console.warn('No active Pusher settings found');
 return null;
 }
 const Pusher = (await import('pusher')).default;

 this.pusherInstance = new Pusher({
 appId: settings.app_id,
 key: settings.app_key,
 secret: settings.app_secret,
 cluster: settings.cluster,
 useTLS: settings.use_tls
 });
 return this.pusherInstance;
 } catch (error) {
 console.error('Failed to initialize Pusher:', error);
 return null;
 }
 }
 // Get Pusher instance
 static async getPusher() {
 if (!this.pusherInstance){
 await this.initializePusher();
 }
 return this.pusherInstance;
 }
 // Get user channels
 static async getUserChannels(userName, userRole, centerContext = null) {
 try {
 const channels = await Chat.getUserChannels(userName, userRole, centerContext);

 // Get unread count for each channel
 for (const channel of channels){
 channel.unread_count = await Chat.getUnreadCount(userName, channel.id);
 }
 return {
 success: true,
 data: channels,
 message: 'User channels retrieved successfully'
 };
 } catch (error) {
 throw new Error(`Failed to get user channels: ${error.message}`);
 }
 }
 // Get channel messages
 static async getChannelMessages(channelId, userName, userRole, centerContext = null, limit = 50, offset =
0) {
 try {
 // Check access to channel
 const channel = await Chat.getChannelById(channelId, userName, userRole, centerContext);
 if (!channel) {
 return {
 success: false,
 message: 'Channel not found or access denied'
 };
 }
 const messages = await Chat.getChannelMessages(channelId, limit, offset);

 return {
 success: true,
 data: {
 channel,
 messages
 },
 message: 'Channel messages retrieved successfully'
 };
 } catch (error) {
 throw new Error(`Failed to get channel messages: ${error.message}`);
 }
 }
 // Send message
 static async sendMessage(messageData, userContext) {
 try {
 // Check access to channel
 const channel = await Chat.getChannelById(
 messageData.channel_id,
 userContext.userName,
 userContext.userRole,
 userContext.centerContext
 );

 if (!channel) {
 return {
 success: false,
 message: 'Channel not found or access denied'
 };
 }
 // Create message
 const message = new Chat({
 channel_id: messageData.channel_id,
 sender_user_name: userContext.userName,
 sender_display_name: userContext.displayName || userContext.userName,
 sender_role: userContext.userRole,
 message_type: messageData.message_type || 'text',
 message_content: messageData.message_content,
 file_url: messageData.file_url,
 file_name: messageData.file_name,
 file_size: messageData.file_size,
 reply_to_message_id: messageData.reply_to_message_id
 });
 await message.save();
 // Join user to channel if not already joined
 await Chat.joinChannel(
 messageData.channel_id,
 userContext.userName,
 userContext.userRole,
 userContext.displayName || userContext.userName,
 userContext.centerContext
 );
 // Send via Pusher
 await this.broadcastMessage(channel, message);
 return {
 success: true,
 data: message,
 message: 'Message sent successfully'
 };
 } catch (error) {
 throw new Error(`Failed to send message: ${error.message}`);
 }
 }
 // Upload file and send message
 static async sendFileMessage(channelId, file, messageContent, userContext) {
 try {
 // Check access to channel
 const channel = await Chat.getChannelById(
 channelId,
 userContext.userName,
 userContext.userRole,
 userContext.centerContext
 );

 if (!channel) {
 return {
 success: false,
 message: 'Channel not found or access denied'
 };
 }
 // Validate file
 const maxSize = 10 * 1024 * 1024; // 10MB
 if (file.size > maxSize){
 return {
 success: false,
 message: 'File size exceeds 10MB limit'
 };
 }
 // Store file
 const fileResult = await FileStorageService.storeChatFile(
 channel.channel_name,
 file.buffer,
 file.originalname,
 file.mimetype
 );
 if (!fileResult.success) {
 return {
 success: false,
 message: 'Failed to upload file'
 };
 }
 // Determine message type based on file
 let messageType = 'file';
 if (file.mimetype.startsWith('image/')) {
 messageType = 'image';
 }
 // Send message with file
 const messageData = {
 channel_id: channelId,
 message_type: messageType,
 message_content: messageContent || file.originalname,
 file_url: fileResult.path,
 file_name: file.originalname,
 file_size: file.size
 };
 return await this.sendMessage(messageData, userContext);
 } catch (error) {
 throw new Error(`Failed to send file message: ${error.message}`);
 }
 }
 // Broadcast message via Pusher
 static async broadcastMessage(channel, message) {
 try {
 const pusher = await this.getPusher();
 if (!pusher) {
 console.warn('Pusher not available, message not broadcasted');
 return;
 }
 const channelName = `chat-${channel.channel_name}`;
 const eventData = {
 id: message.id,
 channel_id: message.channel_id,
 sender_user_name: message.sender_user_name,
 sender_display_name: message.sender_display_name,
 sender_role: message.sender_role,
 message_type: message.message_type,
 message_content: message.message_content,
 file_url: message.file_url,
 file_name: message.file_name,
 file_size: message.file_size,
 reply_to_message_id: message.reply_to_message_id,
 created_at: new Date().toISOString()
 };
 await pusher.trigger(channelName, 'new-message', eventData);

 } catch (error) {
 console.error('Failed to broadcast message via Pusher:', error);
 }
 }
 // Create new channel
 static async createChannel(channelData, userContext) {
 try {
 // Generate unique channel name
 const timestamp = Date.now();
 const channelName = `${channelData.channel_type}-
${channelData.channel_title.toLowerCase().replace(/\s+/g, '-')}-${timestamp}`;
 const newChannelData = {
 ...channelData,
 channel_name: channelName,
 created_by_user: userContext.userName,
 creator_role: userContext.userRole,
 creator_display_name: userContext.displayName || userContext.userName
 };
 const channel = await Chat.createChannel(newChannelData);
 return {
 success: true,
 data: channel,
 message: 'Channel created successfully'
 };
 } catch (error) {
 throw new Error(`Failed to create channel: ${error.message}`);
 }
 }
 // Join channel
 static async joinChannel(channelId, userContext) {
 try {
 await Chat.joinChannel(
 channelId,
 userContext.userName,
 userContext.userRole,
 userContext.displayName || userContext.userName,
 userContext.centerContext
 );
 return {
 success: true,
 message: 'Successfully joined channel'
 };
 } catch (error) {
 throw new Error(`Failed to join channel: ${error.message}`);
 }
 }
 // Update online status
 static async updateOnlineStatus(userName, isOnline) {
 try {
 await Chat.updateOnlineStatus(userName, isOnline);
 // Broadcast online status via Pusher
 const pusher = await this.getPusher();
 if (pusher) {
 await pusher.trigger('presence-global', 'user-status', {
 user_name: userName,
 is_online: isOnline,
 timestamp: new Date().toISOString()
 });
 }
 return {
 success: true,
 message: 'Online status updated'
 };
 } catch (error) {
 throw new Error(`Failed to update online status: ${error.message}`);
 }
 }
 // Mark messages as read
 static async markAsRead(channelId, messageIds, userName) {
 try {
 for (const messageId of messageIds) {
 await Chat.markMessageAsRead(messageId, channelId, userName);
 }
 return {
 success: true,
 message: 'Messages marked as read'
 };
 } catch (error) {
 throw new Error(`Failed to mark messages as read: ${error.message}`);
 }
 }
 // Get channel participants
 static async getChannelParticipants(channelId, userContext) {
 try {
 // Check access to channel
 const channel = await Chat.getChannelById(
 channelId,
 userContext.userName,
 userContext.userRole,
 userContext.centerContext
 );

 if (!channel) {
 return {
 success: false,
 message: 'Channel not found or access denied'
 };
 }
 const participants = await Chat.getChannelParticipants(channelId);
 return {
 success: true,
 data: participants,
 message: 'Channel participants retrieved successfully'
 };
 } catch (error) {
 throw new Error(`Failed to get channel participants: ${error.message}`);
 }
 }
 // Get unread count
 static async getUnreadCount(userName, channelId = null) {
 try {
 const count = await Chat.getUnreadCount(userName, channelId);
 return {
 success: true,
 data: { unread_count: count },
 message: 'Unread count retrieved successfully'
 };
 } catch (error) {
 throw new Error(`Failed to get unread count: ${error.message}`);
 }
 }
}