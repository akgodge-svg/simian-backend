import express from 'express';
import { VisualTemplateController } from '../controllers/VisualTemplateController.js';
const router = express.Router();
// Template management
router.post('/upload', VisualTemplateController.uploadTemplate);
router.get('/', VisualTemplateController.getAllTemplates);
router.get('/:id/designer', VisualTemplateController.getTemplateForDesigner);
router.get('/:id/image', VisualTemplateController.serveTemplateImage);
// Field management
router.get('/fields', VisualTemplateController.getAvailableFields);
router.post('/:id/fields', VisualTemplateController.saveFieldPosition);
router.delete('/:id/fields/:fieldKey', VisualTemplateController.removeField);
// Logo management
router.post('/:id/logos', VisualTemplateController.saveLogoPosition);
export default router;