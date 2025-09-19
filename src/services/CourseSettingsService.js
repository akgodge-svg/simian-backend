import { CourseCategory } from "../models/CourseCategory.js";
import { CourseCategoryLevel } from "../models/CourseCategoryLevel.js";

export class CourseSettingsService {
  // Get all categories with level counts
  static async getAllCategories() {
    try {
      const categories = await CourseCategory.findAll();
      return {
        success: true,
        data: categories,
        message: "Categories retrieved successfully",
        count: categories.length,
      };
    } catch (error) {
      throw new Error(`Failed to get categories: ${error.message}`);
    }
  }

  // Get single category with its levels
  static async getCategoryById(id) {
    try {
      const category = await CourseCategory.findById(id);
      if (!category) {
        return { success: false, message: "Category not found" };
      }

      const levels = await CourseCategoryLevel.findByCategory(id);
      return {
        success: true,
        data: { ...category, levels },
        message: "Category retrieved successfully",
      };
    } catch (error) {
      throw new Error(`Failed to get category: ${error.message}`);
    }
  }

  // Create new category with levels
  static async createCategory(categoryData, levelData = []) {
    try {
      // Validate category data
      const validation = this.validateCategoryData(categoryData);
      if (!validation.isValid) {
        return { success: false, message: validation.message };
      }

      // Check if category name already exists
      const nameExists = await CourseCategory.nameExists(categoryData.name);
      if (nameExists) {
        return { success: false, message: "Category name already exists" };
      }

      // Create category
      const category = new CourseCategory(categoryData);
      await category.save();

      // Create levels (from user input or defaults)
      if (levelData.length > 0) {
        await CourseCategoryLevel.saveLevelsForCategory(category.id, levelData);
      } else {
        const defaultLevels = [];
        for (let i = 1; i <= categoryData.total_levels; i++) {
          defaultLevels.push({ level_name: `Level ${i}` });
        }
        await CourseCategoryLevel.saveLevelsForCategory(category.id, defaultLevels);
      }

      // Fetch full data
      const result = await this.getCategoryById(category.id);
      return {
        success: true,
        data: result.data,
        message: "Category created successfully",
      };
    } catch (error) {
      throw new Error(`Failed to create category: ${error.message}`);
    }
  }

  // Update existing category with levels
  static async updateCategory(id, categoryData, levelData = []) {
    try {
      const category = await CourseCategory.findById(id);
      if (!category) {
        return { success: false, message: "Category not found" };
      }

      // Validate category data
      const validation = this.validateCategoryData(categoryData);
      if (!validation.isValid) {
        return { success: false, message: validation.message };
      }

      // Check if name exists (excluding current)
      const nameExists = await CourseCategory.nameExists(categoryData.name, id);
      if (nameExists) {
        return { success: false, message: "Category name already exists" };
      }

      // Update category
      Object.assign(category, categoryData);
      await category.update();

      // Update levels
      if (levelData.length > 0) {
        await CourseCategoryLevel.saveLevelsForCategory(id, levelData);
      } else {
        const defaultLevels = [];
        for (let i = 1; i <= categoryData.total_levels; i++) {
          defaultLevels.push({ level_name: `Level ${i}` });
        }
        await CourseCategoryLevel.saveLevelsForCategory(id, defaultLevels);
      }

      // Fetch updated data
      const result = await this.getCategoryById(id);
      return {
        success: true,
        data: result.data,
        message: "Category updated successfully",
      };
    } catch (error) {
      throw new Error(`Failed to update category: ${error.message}`);
    }
  }

  // Delete category (soft delete)
  static async deleteCategory(id) {
    try {
      const category = await CourseCategory.findById(id);
      if (!category) {
        return { success: false, message: "Category not found" };
      }
      await category.delete();
      return { success: true, message: "Category deleted successfully" };
    } catch (error) {
      throw new Error(`Failed to delete category: ${error.message}`);
    }
  }

  // Get levels for specific category
  static async getCategoryLevels(categoryId) {
    try {
      const levels = await CourseCategoryLevel.findByCategory(categoryId);
      return {
        success: true,
        data: levels,
        message: "Levels retrieved successfully",
        count: levels.length,
      };
    } catch (error) {
      throw new Error(`Failed to get levels: ${error.message}`);
    }
  }

  // Get dropdown data for categories
  static async getDropdownData() {
    try {
      const categories = await CourseCategory.getDropdownList();
      return {
        success: true,
        data: categories,
        message: "Dropdown data retrieved successfully",
      };
    } catch (error) {
      throw new Error(`Failed to get dropdown data: ${error.message}`);
    }
  }

  // Get levels dropdown for a specific category
  static async getLevelsDropdown(categoryId) {
    try {
      const levels = await CourseCategoryLevel.getDropdownList(categoryId);
      return {
        success: true,
        data: levels,
        message: "Level dropdown data retrieved successfully",
      };
    } catch (error) {
      throw new Error(`Failed to get level dropdown: ${error.message}`);
    }
  }

  // Validation helper
  static validateCategoryData(data) {
    if (!data.name || data.name.trim().length === 0) {
      return { isValid: false, message: "Category name is required" };
    }
    if (data.name.trim().length < 3) {
      return { isValid: false, message: "Category name must be at least 3 characters" };
    }
    if (!data.total_levels || data.total_levels < 1 || data.total_levels > 10) {
      return { isValid: false, message: "Total levels must be between 1 and 10" };
    }
    if (
      !data.category_duration_days ||
      data.category_duration_days < 1 ||
      data.category_duration_days > 30
    ) {
      return { isValid: false, message: "Duration must be between 1 and 30 days" };
    }
    if (
      !data.category_candidate_limit ||
      data.category_candidate_limit < 1 ||
      data.category_candidate_limit > 100
    ) {
      return { isValid: false, message: "Candidate limit must be between 1 and 100" };
    }
    return { isValid: true };
  }
}
