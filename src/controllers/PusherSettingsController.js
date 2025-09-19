import { PusherSettings } from '../models/PusherSettings.js';
import { ChatService } from '../services/ChatService.js';
export class PusherSettingsController {
 // GET /api/pusher-settings
 static async getAllSettings(req, res) {
 try {
 const settings = await PusherSettings.findAll();

 // Mask secrets for security
 const maskedSettings = settings.map(setting => setting.getMaskedSettings());
 res.status(200).json({
 success: true,
 data: maskedSettings,
 message: 'Pusher settings retrieved successfully'
 });
 } catch (error) {
 console.error('Error getting Pusher settings:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // GET /api/pusher-settings/active
 static async getActiveSettings(req, res) {
 try {
 const settings = await PusherSettings.getActiveSettings();

 if (!settings) {
 return res.status(404).json({
 success: false,
 message: 'No active Pusher settings found'
 });
 }
 res.status(200).json({
 success: true,
 data: settings.getMaskedSettings(),
 message: 'Active Pusher settings retrieved successfully'
 });
 } catch (error) {
 console.error('Error getting active Pusher settings:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // GET /api/pusher-settings/client-config
 static async getClientConfig(req, res) {
 try {
 const settings = await PusherSettings.getActiveSettings();

 if (!settings) {
 return res.status(404).json({
 success: false,
 message: 'No active Pusher settings found'
 });
 }
 // Return only client-safe configuration
 res.status(200).json({
 success: true,
 data: {
 app_key: settings.app_key,
 cluster: settings.cluster,
 use_tls: settings.use_tls
 },
 message: 'Pusher client configuration retrieved successfully'
 });
 } catch (error) {
 console.error('Error getting Pusher client config:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // POST /api/pusher-settings
 static async createSettings(req, res) {
 try {
 const { app_id, app_key, app_secret, cluster, use_tls } = req.body;
 if (!app_id || !app_key || !app_secret || !cluster){
 return res.status(400).json({
 success: false,
 message: 'App ID, App Key, App Secret, and Cluster are required'
 });
 }
 const settings = new PusherSettings({
 app_id,
 app_key,
 app_secret,
 cluster: cluster || 'us2',
 use_tls: use_tls !== false
 });
 await settings.save();
 // Reinitialize Pusher with new settings
 ChatService.pusherInstance = null;
 await ChatService.initializePusher();
 res.status(201).json({
 success: true,
 data: settings.getMaskedSettings(),
 message: 'Pusher settings created successfully'
 });
 } catch (error) {
 console.error('Error creating Pusher settings:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // PUT /api/pusher-settings/:id
 static async updateSettings(req, res) {
 try {
 const { id } = req.params;
 const { app_id, app_key, app_secret, cluster, use_tls } = req.body;
 if (!id || isNaN(id)) {
 return res.status(400).json({
 success: false,
 message: 'Valid settings ID is required'
 });
 }
 const settings = await PusherSettings.findById(id);
 if (!settings) {
 return res.status(404).json({
 success: false,
 message: 'Pusher settings not found'
 });
 }
 // Update fields
 if (app_id) settings.app_id = app_id;
 if (app_key) settings.app_key = app_key;
 if (app_secret) settings.app_secret = app_secret;
 if (cluster) settings.cluster = cluster;
 if (use_tls !== undefined) settings.use_tls = use_tls;
 await settings.update();
 // Reinitialize Pusher with updated settings
 ChatService.pusherInstance = null;
 await ChatService.initializePusher();
 res.status(200).json({
 success: true,
 data: settings.getMaskedSettings(),
 message: 'Pusher settings updated successfully'
 });
 } catch (error) {
 console.error('Error updating Pusher settings:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // POST /api/pusher-settings/:id/test
 static async testSettings(req, res) {
 try {
 const { id } = req.params;
 if (!id || isNaN(id)) {
 return res.status(400).json({
 success: false,
 message: 'Valid settings ID is required'
 });
 }
 const settings = await PusherSettings.findById(id);
 if (!settings) {
 return res.status(404).json({
 success: false,
 message: 'Pusher settings not found'
 });
 }
 const testResult = await PusherSettings.testConnection(settings);
 res.status(200).json({
 success: testResult.success,
 data: testResult,
 message: testResult.message
 });
 } catch (error) {
 console.error('Error testing Pusher settings:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // DELETE /api/pusher-settings/:id
 static async deleteSettings(req, res) {
 try {
 const { id } = req.params;
 if (!id || isNaN(id)) {
 return res.status(400).json({
 success: false,
 message: 'Valid settings ID is required'
 });
 }
 const deleted = await PusherSettings.delete(id);

 if (!deleted) {
 return res.status(404).json({
 success: false,
 message: 'Pusher settings not found'
 });
 }
 // Clear Pusher instance if this was active
 ChatService.pusherInstance = null;
 res.status(200).json({
 success: true,
 message: 'Pusher settings deleted successfully'
 });
 } catch (error) {
 console.error('Error deleting Pusher settings:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
}
