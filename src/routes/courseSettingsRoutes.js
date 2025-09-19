// File: routes/courseSettings.routes.js
import express from 'express';
import { CourseSettingsController } from '../controllers/CourseSettingsController.js';

const router = express.Router();

// ==================== Categories Management ====================
router.get('/categories', CourseSettingsController.getAllCategories);
router.get('/categories/dropdown', CourseSettingsController.getDropdownData);
router.get('/categories/:id', CourseSettingsController.getCategoryById);
router.post('/categories', CourseSettingsController.createCategory);
router.put('/categories/:id', CourseSettingsController.updateCategory);
router.delete('/categories/:id', CourseSettingsController.deleteCategory);

// ==================== Levels Management ====================
router.get('/categories/:id/levels', CourseSettingsController.getCategoryLevels);
router.get('/levels/:categoryId/dropdown', CourseSettingsController.getLevelsDropdown);

export default router;
