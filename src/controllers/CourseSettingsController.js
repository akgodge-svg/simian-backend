// File: controllers/CourseSettingsController.js
import { CourseSettingsService } from '../services/CourseSettingsService.js';

export class CourseSettingsController {
  // GET /api/course-settings/categories
  static async getAllCategories(req, res) {
    try {
      const result = await CourseSettingsService.getAllCategories();
      res.status(200).json(result);
    } catch (error) {
      console.error('Error getting categories:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  // GET /api/course-settings/categories/:id
  static async getCategoryById(req, res) {
    try {
      const { id } = req.params;
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'Valid category ID is required',
        });
      }

      const result = await CourseSettingsService.getCategoryById(id);
      if (!result.success) {
        return res.status(404).json(result);
      }
      res.status(200).json(result);
    } catch (error) {
      console.error('Error getting category by ID:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  // POST /api/course-settings/categories
  static async createCategory(req, res) {
    try {
      const { category, levels } = req.body;
      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Category data is required',
        });
      }

      const result = await CourseSettingsService.createCategory(category, levels);
      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(201).json(result);
    } catch (error) {
      console.error('Error creating category:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  // PUT /api/course-settings/categories/:id
  static async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const { category, levels } = req.body;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'Valid category ID is required',
        });
      }
      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Category data is required',
        });
      }

      const result = await CourseSettingsService.updateCategory(id, category, levels);
      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('Error updating category:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  // DELETE /api/course-settings/categories/:id
  static async deleteCategory(req, res) {
    try {
      const { id } = req.params;
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'Valid category ID is required',
        });
      }

      const result = await CourseSettingsService.deleteCategory(id);
      if (!result.success) {
        return res.status(404).json(result);
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('Error deleting category:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  // GET /api/course-settings/categories/:id/levels
  static async getCategoryLevels(req, res) {
    try {
      const { id } = req.params;
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'Valid category ID is required',
        });
      }

      const result = await CourseSettingsService.getCategoryLevels(id);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error getting category levels:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  // GET /api/course-settings/categories/dropdown
  static async getDropdownData(req, res) {
    try {
      const result = await CourseSettingsService.getDropdownData();
      res.status(200).json(result);
    } catch (error) {
      console.error('Error getting dropdown data:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  // GET /api/course-settings/levels/:categoryId/dropdown
  static async getLevelsDropdown(req, res) {
    try {
      const { categoryId } = req.params;
      if (!categoryId || isNaN(categoryId)) {
        return res.status(400).json({
          success: false,
          message: 'Valid category ID is required',
        });
      }

      const result = await CourseSettingsService.getLevelsDropdown(categoryId);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error getting levels dropdown:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }
}
