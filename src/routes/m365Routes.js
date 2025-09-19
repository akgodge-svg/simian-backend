import express from 'express';
import { M365SettingsController } from '../controllers/M365SettingsController.js';
import { EmailController } from '../controllers/EmailController.js';
const router = express.Router();
// M365 App Settings (Admin only)
router.get('/settings', M365SettingsController.getSettings);
router.get('/settings/active', M365SettingsController.getActiveSettings);
router.post('/settings', M365SettingsController.createSettings);
router.put('/settings/:id', M365SettingsController.updateSettings);
router.delete('/settings/:id', M365SettingsController.deleteSettings);
// Authentication
router.get('/auth/url', EmailController.getAuthUrl);
router.post('/auth/callback', EmailController.handleAuthCallback);
router.get('/connection-status', EmailController.getConnectionStatus);
router.delete('/auth/disconnect', EmailController.disconnectAccount);
// Email Management
router.get('/emails', EmailController.getUserEmails);
router.get('/emails/:id', EmailController.getEmailById);
router.post('/emails', EmailController.sendEmail);
router.put('/emails/:id/read', EmailController.markEmailAsRead);
router.delete('/emails/:id', EmailController.deleteEmail);
// Email Templates
router.get('/templates', EmailController.getEmailTemplates);
router.get('/templates/:id', EmailController.getEmailTemplateById);
router.post('/templates', EmailController.createEmailTemplate);
router.put('/templates/:id', EmailController.updateEmailTemplate);
router.delete('/templates/:id', EmailController.deleteEmailTemplate);
router.post('/templates/:id/send', EmailController.sendTemplatedEmail);
router.get('/template-types', EmailController.getTemplateTypes);
export default router;