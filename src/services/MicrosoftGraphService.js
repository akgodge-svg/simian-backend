import { Client } from '@azure/msal-node';
import { Client as GraphClient } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graphclient/authProviders/azureTokenCredentials';
import { EncryptionService } from './EncryptionService.js';
import mysql from 'mysql2/promise';
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
export class MicrosoftGraphService {

 // Get active M365 app settings
 static async getAppSettings() {
 const [rows] = await pool.execute(
 'SELECT * FROM m365_app_settings WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1'
 );

 if (rows.length === 0) {
 throw new Error('No active M365 app settings found');
 }

 const settings = rows[0];
 return {
 ...settings,
 client_secret: EncryptionService.decryptFromStorage(settings.client_secret)
 };
 }

 // Generate Microsoft auth URL
 static async getAuthUrl(userName) {
 try {
 const settings = await this.getAppSettings();

 const authUrl = `https://login.microsoftonline.com/${settings.tenant_id}/oauth2/v2.0/authorize?` +
 `client_id=${settings.client_id}` +
 `&response_type=code` +
 `&redirect_uri=${encodeURIComponent(settings.redirect_uri)}` +
 `&scope=${encodeURIComponent(settings.scopes)}` +
 `&response_mode=query` +
 `&state=${userName}`; // Use userName as state to identify user

 return {
 success: true,
 auth_url: authUrl,
 message: 'Auth URL generated successfully'
 };
 } catch (error) {
 throw new Error(`Failed to generate auth URL: ${error.message}`);
 }
 }

 // Handle OAuth callback and exchange code for tokens
 static async handleAuthCallback(code, state, redirectUri) {
 try {
 const settings = await this.getAppSettings();
 const userName = state; // state contains userName

 // Exchange code for tokens
 const tokenUrl = `https://login.microsoftonline.com/${settings.tenant_id}/oauth2/v2.0/token`;

 const tokenParams = new URLSearchParams({
 client_id: settings.client_id,
 client_secret: settings.client_secret,
 code: code,
 redirect_uri: redirectUri,
 grant_type: 'authorization_code',
 scope: settings.scopes
 });

 const tokenResponse = await fetch(tokenUrl, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/x-www-form-urlencoded'
 },
 body: tokenParams
 });

 if (!tokenResponse.ok) {
 throw new Error(`Token exchange failed: ${tokenResponse.statusText}`);
 }

 const tokenData = await tokenResponse.json();

 // Get user profile
 const userProfile = await this.getUserProfile(tokenData.access_token);

 // Calculate token expiry
 const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

 // Store encrypted tokens
 const encryptedAccessToken = EncryptionService.encryptForStorage(tokenData.access_token);
 const encryptedRefreshToken = EncryptionService.encryptForStorage(tokenData.refresh_token);

 await pool.execute(`
 INSERT INTO user_m365_tokens (
 user_name, access_token, refresh_token, token_expires_at,
 scope, email_address, display_name, is_active
 ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
 ON DUPLICATE KEY UPDATE
 access_token = VALUES(access_token),
 refresh_token = VALUES(refresh_token),
 token_expires_at = VALUES(token_expires_at),
 scope = VALUES(scope),
 display_name = VALUES(display_name),
 is_active = 1,
 updated_at = CURRENT_TIMESTAMP
 `, [
 userName,
 encryptedAccessToken,
 encryptedRefreshToken,
 expiresAt,
 tokenData.scope,
 userProfile.mail || userProfile.userPrincipalName,
 userProfile.displayName
 ]);

 return {
 success: true,
 user_profile: {
 email: userProfile.mail || userProfile.userPrincipalName,
 display_name: userProfile.displayName
 },
 message: 'M365 account connected successfully'
 };

 } catch (error) {
 throw new Error(`Auth callback failed: ${error.message}`);
 }
 }

 // Get user profile from Microsoft Graph
 static async getUserProfile(accessToken) {
 const response = await fetch('https://graph.microsoft.com/v1.0/me', {
 headers: {
 'Authorization': `Bearer ${accessToken}`
 }
 });

 if (!response.ok) {
 throw new Error(`Failed to get user profile: ${response.statusText}`);
 }

 return await response.json();
 }

 // Get valid access token for user (refresh if needed)
 static async getValidToken(userName) {
 const [rows] = await pool.execute(
 'SELECT * FROM user_m365_tokens WHERE user_name = ? AND is_active = 1',
 [userName]
 );

 if (rows.length === 0) {
 throw new Error('User not connected to M365. Please authenticate first.');
 }

 const tokenData = rows[0];
 const now = new Date();

 // Check if token is still valid (with 5 minute buffer)
 if (new Date(tokenData.token_expires_at) > new Date(now.getTime() + 300000)) {
 return EncryptionService.decryptFromStorage(tokenData.access_token);
 }

 // Token expired, refresh it
 return await this.refreshToken(userName, tokenData);
 }

 // Refresh expired token
 static async refreshToken(userName, tokenData) {
 try {
 const settings = await this.getAppSettings();
 const refreshToken = EncryptionService.decryptFromStorage(tokenData.refresh_token);

 const tokenUrl = `https://login.microsoftonline.com/${settings.tenant_id}/oauth2/v2.0/token`;

 const refreshParams = new URLSearchParams({
 client_id: settings.client_id,
 client_secret: settings.client_secret,
 refresh_token: refreshToken,
 grant_type: 'refresh_token',
 scope: settings.scopes
 });

 const response = await fetch(tokenUrl, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/x-www-form-urlencoded'
 },
 body: refreshParams
 });

 if (!response.ok) {
 throw new Error(`Token refresh failed: ${response.statusText}`);
 }

 const newTokenData = await response.json();

 // Calculate new expiry
 const expiresAt = new Date(Date.now() + (newTokenData.expires_in * 1000));

 // Update stored tokens
 const encryptedAccessToken = EncryptionService.encryptForStorage(newTokenData.access_token);
 const encryptedRefreshToken = EncryptionService.encryptForStorage(
 newTokenData.refresh_token || refreshToken // Some responses don't include new refresh token
 );

 await pool.execute(`
 UPDATE user_m365_tokens
 SET access_token = ?, refresh_token = ?, token_expires_at = ?, updated_at = CURRENT_TIMESTAMP
 WHERE user_name = ?
 `, [encryptedAccessToken, encryptedRefreshToken, expiresAt, userName]);

 return newTokenData.access_token;

 } catch (error) {
 // Token refresh failed, user needs to re-authenticate
 await pool.execute(
 'UPDATE user_m365_tokens SET is_active = 0 WHERE user_name = ?',
 [userName]
 );

 throw new Error('Token refresh failed. Please re-authenticate with M365.');
 }
 }

 // Get user emails
 static async getUserEmails(userName, folder = 'inbox', top = 50, skip = 0) {
 try {
 const accessToken = await this.getValidToken(userName);

 // Map folder names to Microsoft Graph folder identifiers
 const folderMap = {
 'inbox': 'inbox',
 'sent': 'sentitems',
 'drafts': 'drafts',
 'deleted': 'deleteditems',
 'junk': 'junkemail'
 };

 const folderName = folderMap[folder.toLowerCase()] || folder;

 const url = `https://graph.microsoft.com/v1.0/me/mailFolders/${folderName}/messages?` +
 `$top=${top}&$skip=${skip}&$orderby=receivedDateTime desc&` +

`$select=id,subject,sender,toRecipients,receivedDateTime,isRead,importance,hasAttachments,bodyPreview`;

 const response = await fetch(url, {
 headers: {
 'Authorization': `Bearer ${accessToken}`,
 'Content-Type': 'application/json'
 }
 });

 if (!response.ok) {
 throw new Error(`Failed to get emails: ${response.statusText}`);
 }

 const emailData = await response.json();

 // Cache emails for performance
 await this.cacheEmails(userName, folder, emailData.value);

 return {
 success: true,
 data: {
 emails: emailData.value,
 total_count: emailData['@odata.count'] || emailData.value.length,
 has_more: !!emailData['@odata.nextLink']
 },
 message: 'Emails retrieved successfully'
 };

 } catch (error) {
 throw new Error(`Failed to get user emails: ${error.message}`);
 }
 }

 // Get single email with full content
 static async getEmailById(userName, emailId) {
 try {
 const accessToken = await this.getValidToken(userName);

 const url = `https://graph.microsoft.com/v1.0/me/messages/${emailId}?` +

`$select=id,subject,sender,toRecipients,ccRecipients,bccRecipients,receivedDateTime,sentDateTime,isRead,i
mportance,hasAttachments,body,attachments`;

 const response = await fetch(url, {
 headers: {
 'Authorization': `Bearer ${accessToken}`,
 'Content-Type': 'application/json'
 }
 });

 if (!response.ok) {
 throw new Error(`Failed to get email: ${response.statusText}`);
 }

 const email = await response.json();

 return {
 success: true,
 data: email,
 message: 'Email retrieved successfully'
 };

 } catch (error) {
 throw new Error(`Failed to get email: ${error.message}`);
 }
 }

 // Send email
 static async sendEmail(userName, emailData) {
 try {
 const accessToken = await this.getValidToken(userName);

 const message = {
 subject: emailData.subject,
 body: {
 contentType: emailData.body_type || 'HTML',
 content: emailData.body_content
 },
 toRecipients: emailData.to_recipients.map(email => ({
 emailAddress: {
 address: email.address,
 name: email.name || email.address
 }
 }))
 };

 // Add CC recipients if provided
 if (emailData.cc_recipients && emailData.cc_recipients.length > 0) {
 message.ccRecipients = emailData.cc_recipients.map(email => ({
 emailAddress: {
 address: email.address,
 name: email.name || email.address
 }
 }));
 }

 // Add BCC recipients if provided
 if (emailData.bcc_recipients && emailData.bcc_recipients.length > 0) {
 message.bccRecipients = emailData.bcc_recipients.map(email => ({
 emailAddress: {
 address: email.address,
 name: email.name || email.address
 }
 }));
 }

 // Add attachments if provided
 if (emailData.attachments && emailData.attachments.length > 0) {
 message.attachments = emailData.attachments.map(attachment => ({
 '@odata.type': '#microsoft.graph.fileAttachment',
 name: attachment.name,
 contentType: attachment.content_type,
 contentBytes: attachment.content_base64
 }));
 }

 const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
 method: 'POST',
 headers: {
 'Authorization': `Bearer ${accessToken}`,
 'Content-Type': 'application/json'
 },
 body: JSON.stringify({ message })
 });

 if (!response.ok) {
 const errorText = await response.text();
 throw new Error(`Failed to send email: ${response.statusText} - ${errorText}`);
 }

 // Log sent email
 await this.logSentEmail(userName, emailData, 'sent', null);

 return {
 success: true,
 message: 'Email sent successfully'
 };

 } catch (error) {
 // Log failed email
 await this.logSentEmail(userName, emailData, 'failed', error.message);
 throw new Error(`Failed to send email: ${error.message}`);
 }
 }

 // Cache emails in database
 static async cacheEmails(userName, folder, emails) {
 try {
 for (const email of emails){
 await pool.execute(`
 INSERT INTO email_cache (
 user_name, email_id, folder_name, subject, sender_email, sender_name,
 recipients, body_preview, has_attachments, is_read, importance, received_at
 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
 ON DUPLICATE KEY UPDATE
 subject = VALUES(subject),
 sender_email = VALUES(sender_email),
 sender_name = VALUES(sender_name),
 recipients = VALUES(recipients),
 body_preview = VALUES(body_preview),
 has_attachments = VALUES(has_attachments),
 is_read = VALUES(is_read),
 importance = VALUES(importance),
 received_at = VALUES(received_at),
 cached_at = CURRENT_TIMESTAMP
 `, [
 userName,
 email.id,
 folder,
 email.subject || '(No Subject)',
 email.sender?.emailAddress?.address || '',
 email.sender?.emailAddress?.name || '',
 JSON.stringify(email.toRecipients || []),
 email.bodyPreview || '',
 email.hasAttachments || false,
 email.isRead || false,
 email.importance || 'normal',
 email.receivedDateTime ? new Date(email.receivedDateTime) : new Date()
 ]);
 }
 } catch (error) {
 console.error('Error caching emails:', error);
 }
 }

 // Log sent email
 static async logSentEmail(userName, emailData, status, errorMessage) {
 try {
 await pool.execute(`
 INSERT INTO sent_emails_log (
 user_name, recipient_emails, cc_emails, bcc_emails, subject,
 body_content, body_preview, has_attachments, email_type,
 sent_status, error_message
 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
 `, [
 userName,
 JSON.stringify(emailData.to_recipients || []),
 JSON.stringify(emailData.cc_recipients || []),
 JSON.stringify(emailData.bcc_recipients || []),
 emailData.subject,
 emailData.body_content,
 emailData.body_content?.substring(0, 500) || '',
 (emailData.attachments && emailData.attachments.length > 0),
 emailData.email_type || 'manual',
 status,
 errorMessage
 ]);
 } catch (error) {
 console.error('Error logging sent email:', error);
 }
 }

 // Mark email as read/unread
 static async markEmailAsRead(userName, emailId, isRead = true) {
 try {
 const accessToken = await this.getValidToken(userName);

 const response = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${emailId}`, {
 method: 'PATCH',
 headers: {
 'Authorization': `Bearer ${accessToken}`,
 'Content-Type': 'application/json'
 },
 body: JSON.stringify({
 isRead: isRead
 })
 });

 if (!response.ok) {
 throw new Error(`Failed to mark email as ${isRead ? 'read' : 'unread'}: ${response.statusText}`);
 }

 // Update cache
 await pool.execute(
 'UPDATE email_cache SET is_read = ? WHERE user_name = ? AND email_id = ?',
 [isRead, userName, emailId]
 );

 return {
 success: true,
 message: `Email marked as ${isRead ? 'read' : 'unread'}`
 };

 } catch (error) {
 throw new Error(`Failed to update email status: ${error.message}`);
 }
 }

 // Delete email
 static async deleteEmail(userName, emailId) {
 try {
 const accessToken = await this.getValidToken(userName);

 const response = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${emailId}`, {
 method: 'DELETE',
 headers: {
 'Authorization': `Bearer ${accessToken}`
 }
 });

 if (!response.ok) {
 throw new Error(`Failed to delete email: ${response.statusText}`);
 }

 // Remove from cache
 await pool.execute(
 'UPDATE email_cache SET is_active = 0 WHERE user_name = ? AND email_id = ?',
 [userName, emailId]
 );

 return {
 success: true,
 message: 'Email deleted successfully'
 };

 } catch (error) {
 throw new Error(`Failed to delete email: ${error.message}`);
 }
 }

 // Get user connection status
 static async getUserConnectionStatus(userName) {
 try {
 const [rows] = await pool.execute(
 'SELECT email_address, display_name, last_sync_at, token_expires_at FROM user_m365_tokens WHERE
user_name = ? AND is_active = 1',
 [userName]
 );

 if (rows.length === 0) {
 return {
 success: false,
 connected: false,
 message: 'User not connected to M365'
 };
 }

 const tokenData = rows[0];
 const isTokenValid = new Date(tokenData.token_expires_at) > new Date();

 return {
 success: true,
 connected: true,
 data: {
 email_address: tokenData.email_address,
 display_name: tokenData.display_name,
 last_sync_at: tokenData.last_sync_at,
 token_expires_at: tokenData.token_expires_at,
 token_valid: isTokenValid
 },
 message: 'User connection status retrieved'
 };

 } catch (error) {
 throw new Error(`Failed to get connection status: ${error.message}`);
 }
 }

 // Disconnect user account
 static async disconnectUser(userName) {
 try {
 await pool.execute(
 'UPDATE user_m365_tokens SET is_active = 0 WHERE user_name = ?',
 [userName]
 );

 // Clear cached emails
 await pool.execute(
 'UPDATE email_cache SET is_active = 0 WHERE user_name = ?',
 [userName]
 );

 return {
 success: true,
 message: 'M365 account disconnected successfully'
 };

 } catch (error) {
 throw new Error(`Failed to disconnect user: ${error.message}`);
 }
 }
}
