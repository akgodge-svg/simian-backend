import mysql from 'mysql2/promise';
import { PusherSettings } from './PusherSettings.js';
import dotenv from 'dotenv';
dotenv.config();
const pool = mysql.createPool({
 host: process.env.DB_HOST,
 user: process.env.DB_USER,
 password: process.env.DB_PASSWORD,
 database: process.env.DB_NAME,
 waitForConnections: true,
 connectionLimit: 10,
 queueLimit: 0
});
export class Chat {
 constructor(data = {}) {
 this.id = data?.id;
 this.channel_id = data?.channel_id;
 this.sender_user_name = data?.sender_user_name;
 this.sender_display_name = data?.sender_display_name;
 this.sender_role = data?.sender_role;
 this.message_type = data?.message_type || 'text';
 this.message_content = data?.message_content;
 this.file_url = data?.file_url;
 this.file_name = data?.file_name;
 this.file_size = data?.file_size;
 this.reply_to_message_id = data?.reply_to_message_id;
 this.is_edited = data?.is_edited || false;
 this.edited_at = data?.edited_at;
 this.is_deleted = data?.is_deleted || false;
 this.deleted_at = data?.deleted_at;
 this.created_at = data?.created_at;
 this.updated_at = data?.updated_at;

 // Additional fields from joins
 this.channel_name = data?.channel_name;
 this.channel_title = data?.channel_title;
 this.reply_to_content = data?.reply_to_content;
 this.reply_to_sender = data?.reply_to_sender;
 }
 // Get chat channels accessible to user
 static async getUserChannels(userName, userRole, centerContext = null) {
 let query = `
 SELECT
 cc.*,
 COUNT(DISTINCT cp.user_name) as participant_count,
 (SELECT COUNT(*) FROM chat_messages cm WHERE cm.channel_id = cc.id AND cm.is_deleted = 0) as
message_count,
 (SELECT cm.created_at FROM chat_messages cm WHERE cm.channel_id = cc.id AND cm.is_deleted = 0
ORDER BY cm.created_at DESC LIMIT 1) as last_message_at
 FROM chat_channels cc
 LEFT JOIN chat_participants cp ON cc.id = cp.channel_id AND cp.is_active = 1
 WHERE cc.is_active = 1
 `;

 let params = [];

 // Access control based on user role and context
 if (userRole === 'admin') {
 // Admin can see all channels
 query += ` AND 1=1`;
 } else if (userRole === 'center_admin' && centerContext){
 // Center admin can see global and their center channels
 query += ` AND (cc.channel_type = 'global' OR (cc.channel_type = 'center' AND cc.center_id = ?) OR
(cc.channel_type = 'course' AND EXISTS (SELECT 1 FROM course_bookings cb WHERE cb.id =
cc.course_booking_id AND cb.created_by_center_id = ?)))`;
 params.push(centerContext.id, centerContext.id);
 } else if (userRole === 'instructor' && centerContext) {
 // Instructor can see global channels and courses they're assigned to
 query += ` AND (cc.channel_type = 'global' OR (cc.channel_type = 'course' AND EXISTS (SELECT 1 FROM
course_bookings cb WHERE cb.id = cc.course_booking_id AND (cb.actual_instructor_id IN (SELECT id FROM
instructors WHERE user_name = ?) OR cb.document_instructor_id IN (SELECT id FROM instructors WHERE
user_name = ?)))))`;
 params.push(userName, userName);
 } else {
 // Default: only global channels
 query += ` AND cc.channel_type = 'global'`;
 }

 query += ` GROUP BY cc.id ORDER BY last_message_at DESC, cc.created_at DESC`;

 const [rows] = await pool.execute(query, params);
 return rows;
 }
 // Get channel by ID with access control
 static async getChannelById(channelId, userName, userRole, centerContext = null) {
 const query = `
 SELECT
 cc.*,
 c.name as center_name,
 cb.course_number
 FROM chat_channels cc
 LEFT JOIN centers c ON cc.center_id = c.id
 LEFT JOIN course_bookings cb ON cc.course_booking_id = cb.id
 WHERE cc.id = ? AND cc.is_active = 1
 `;

 const [rows] = await pool.execute(query, [channelId]);
 if (rows.length === 0) return null;

 const channel = rows[0];

 // Check access permissions
 const hasAccess = await this.checkChannelAccess(channel, userName, userRole, centerContext);
 if (!hasAccess) return null;

 return channel;
 }
 // Check if user has access to channel
 static async checkChannelAccess(channel, userName, userRole, centerContext = null) {
 if (userRole === 'admin') return true;

 if (channel.channel_type === 'global') return true;

 if (channel.channel_type === 'center') {
 if (userRole === 'center_admin' && centerContext && centerContext.id === channel.center_id) {
 return true;
 }
 }

 if (channel.channel_type === 'course') {
 // Check if user is instructor for this course
 const [instructorCheck] = await pool.execute(
 'SELECT 1 FROM course_bookings cb JOIN instructors i ON (cb.actual_instructor_id = i.id OR
cb.document_instructor_id = i.id) WHERE cb.id = ? AND i.user_name = ?',
 [channel.course_booking_id, userName]
 );

 if (instructorCheck.length > 0) return true;

 // Check if user is center admin for this course's center
 if (userRole === 'center_admin' && centerContext) {
 const [centerCheck] = await pool.execute(
 'SELECT 1 FROM course_bookings WHERE id = ? AND created_by_center_id = ?',
 [channel.course_booking_id, centerContext.id]
 );

 if (centerCheck.length > 0) return true;
 }
 }

 return false;
 }
 // Get messages for a channel
 static async getChannelMessages(channelId, limit = 50, offset = 0) {
 const query = `
 SELECT
 cm.*,
 reply.message_content as reply_to_content,
 reply.sender_display_name as reply_to_sender
 FROM chat_messages cm
 LEFT JOIN chat_messages reply ON cm.reply_to_message_id = reply.id
 WHERE cm.channel_id = ? AND cm.is_deleted = 0
 ORDER BY cm.created_at DESC
 LIMIT ? OFFSET ?
 `;

 const [rows] = await pool.execute(query, [channelId, limit, offset]);
 return rows.reverse().map(row => new Chat(row)); // Reverse to show oldest first
 }
 // Send message
 async save() {
 const connection = await pool.getConnection();
 await connection.beginTransaction();
 try {
 const insertQuery = `
 INSERT INTO chat_messages (
 channel_id, sender_user_name, sender_display_name, sender_role,
 message_type, message_content, file_url, file_name, file_size, reply_to_message_id
 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
 `;

 const [result] = await connection.execute(insertQuery, [
 this.channel_id,
 this.sender_user_name,
 this.sender_display_name,
 this.sender_role,
 this.message_type,
 this.message_content,
 this.file_url,
 this.file_name,
 this.file_size,
 this.reply_to_message_id
 ]);
 this.id = result.insertId;
 // Add sender as participant if not already
 await connection.execute(
 `INSERT IGNORE INTO chat_participants (channel_id, user_name, user_role, display_name, is_active)
 VALUES (?, ?, ?, ?, 1)`,
 [this.channel_id, this.sender_user_name, this.sender_role, this.sender_display_name]
 );
 await connection.commit();
 return this;
 } catch (error) {
 await connection.rollback();
 throw error;
 } finally {
 connection.release();
 }
 }
 // Create new channel
 static async createChannel(channelData) {
 const connection = await pool.getConnection();
 await connection.beginTransaction();
 try {
 const insertQuery = `
 INSERT INTO chat_channels (
 channel_name, channel_type, channel_title, description,
 center_id, course_booking_id, created_by_user
 ) VALUES (?, ?, ?, ?, ?, ?, ?)
 `;

 const [result] = await connection.execute(insertQuery, [
 channelData.channel_name,
 channelData.channel_type,
 channelData.channel_title,
 channelData.description,
 channelData.center_id,
 channelData.course_booking_id,
 channelData.created_by_user
 ]);
 const channelId = result.insertId;
 // Add creator as participant
 await connection.execute(
 `INSERT INTO chat_participants (channel_id, user_name, user_role, display_name, is_active)
 VALUES (?, ?, ?, ?, 1)`,
 [channelId, channelData.created_by_user, channelData.creator_role, channelData.creator_display_name]
 );
 await connection.commit();
 return { id: channelId, ...channelData };
 } catch (error) {
 await connection.rollback();
 throw error;
 } finally {
 connection.release();
 }
 }
 // Join channel
 static async joinChannel(channelId, userName, userRole, displayName, centerContext = null) {
 try {
 // Check if user has access to this channel
 const channel = await this.getChannelById(channelId, userName, userRole, centerContext);
 if (!channel) {
 throw new Error('Channel not found or access denied');
 }
 const query = `
 INSERT INTO chat_participants (channel_id, user_name, user_role, center_id, display_name, is_active)
 VALUES (?, ?, ?, ?, ?, 1)
 ON DUPLICATE KEY UPDATE
 is_active = 1,
 display_name = VALUES(display_name),
 center_id = VALUES(center_id)
 `;

 await pool.execute(query, [channelId, userName, userRole, centerContext?.id, displayName]);
 return true;
 } catch (error) {
 throw error;
 }
 }
 // Update user online status
 static async updateOnlineStatus(userName, isOnline) {
 const query = `
 UPDATE chat_participants
 SET is_online = ?, last_seen = CURRENT_TIMESTAMP
 WHERE user_name = ?
 `;

 await pool.execute(query, [isOnline, userName]);
 }
 // Get channel participants
 static async getChannelParticipants(channelId) {
 const query = `
 SELECT
 cp.*,
 c.name as center_name
 FROM chat_participants cp
 LEFT JOIN centers c ON cp.center_id = c.id
 WHERE cp.channel_id = ? AND cp.is_active = 1
 ORDER BY cp.is_online DESC, cp.display_name ASC
 `;

 const [rows] = await pool.execute(query, [channelId]);
 return rows;
 }
 // Mark message as read
 static async markMessageAsRead(messageId, channelId, userName) {
 const query = `
 INSERT INTO chat_message_reads (message_id, channel_id, reader_user_name)
 VALUES (?, ?, ?)
 ON DUPLICATE KEY UPDATE read_at = CURRENT_TIMESTAMP
 `;

 await pool.execute(query, [messageId, channelId, userName]);
 }
 // Get unread message count for user
 static async getUnreadCount(userName, channelId = null) {
 let query = `
 SELECT
 cm.channel_id,
 COUNT(*) as unread_count
 FROM chat_messages cm
 JOIN chat_participants cp ON cm.channel_id = cp.channel_id
 LEFT JOIN chat_message_reads cmr ON cm.id = cmr.message_id AND cmr.reader_user_name = ?
 WHERE cp.user_name = ?
 AND cp.is_active = 1
 AND cm.is_deleted = 0
 AND cm.sender_user_name != ?
 AND cmr.id IS NULL
 `;

 let params = [userName, userName, userName];

 if (channelId) {
 query += ` AND cm.channel_id = ?`;
 params.push(channelId);
 }

 query += ` GROUP BY cm.channel_id`;

 const [rows] = await pool.execute(query, params);

 if (channelId) {
 return rows.length > 0 ? rows[0].unread_count : 0;
 }

 return rows.reduce((total, row) => total + row.unread_count, 0);
 }
 // Test database connection
 static async testConnection() {
 try {
 await pool.execute('SELECT 1');
 return true;
 } catch (error) {
 console.error('Chat database connection test failed:', error);
 return false;
 }
 }
}
