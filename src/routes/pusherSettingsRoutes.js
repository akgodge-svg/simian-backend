import express from 'express';
import { PusherSettingsController } from '../controllers/PusherSettingsController.js';
const router = express.Router();
// Pusher settings management routes
router.get('/', PusherSettingsController.getAllSettings);
router.get('/active', PusherSettingsController.getActiveSettings);
router.get('/client-config', PusherSettingsController.getClientConfig);
router.post('/', PusherSettingsController.createSettings);
router.put('/:id', PusherSettingsController.updateSettings);
router.post('/:id/test', PusherSettingsController.testSettings);
router.delete('/:id', PusherSettingsController.deleteSettings);
export default router;
