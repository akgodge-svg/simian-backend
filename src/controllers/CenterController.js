import { CenterService } from '../services/CenterService.js';
export class CenterController {
 // GET /api/centers
 static async getAllCenters(req, res) {
 try {
 const result = await CenterService.getAllCenters();
 res.status(200).json(result);
 } catch (error) {
 console.error('Error getting centers:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // GET /api/centers/:id
 static async getCenterById(req, res) {
 try {
 const { id } = req.params;

 if (!id || isNaN(id)) {
 return res.status(400).json({
 success: false,
 message: 'Valid center ID is required'
 });
 }
 const result = await CenterService.getCenterById(id);

 if (!result.success) {
 return res.status(404).json(result);
 }
 res.status(200).json(result);
 } catch (error) {
 console.error('Error getting center by ID:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // POST /api/centers
 static async createCenter(req, res) {
 try {
 const centerData = req.body;

 if (!centerData) {
 return res.status(400).json({
 success: false,
 message: 'Center data is required'
 });
 }
 const result = await CenterService.createCenter(centerData);

 if (!result.success) {
 return res.status(400).json(result);
 }
 res.status(201).json(result);
 } catch (error) {
 console.error('Error creating center:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // PUT /api/centers/:id
 static async updateCenter(req, res) {
 try {
 const { id } = req.params;
 const centerData = req.body;

 if (!id || isNaN(id)) {
 return res.status(400).json({
 success: false,
 message: 'Valid center ID is required'
 });
 }

 if (!centerData) {
 return res.status(400).json({
 success: false,
 message: 'Center data is required'
 });
 }
 const result = await CenterService.updateCenter(id, centerData);

 if (!result.success) {
 return res.status(400).json(result);
 }
 res.status(200).json(result);
 } catch (error) {
 console.error('Error updating center:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // DELETE /api/centers/:id
 static async deleteCenter(req, res) {
 try {
 const { id } = req.params;

 if (!id || isNaN(id)) {
 return res.status(400).json({
 success: false,
 message: 'Valid center ID is required'
 });
 }
 const result = await CenterService.deleteCenter(id);

 if (!result.success) {
 return res.status(400).json(result);
 }
 res.status(200).json(result);
 } catch (error) {
 console.error('Error deleting center:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // GET /api/centers/dropdown
 static async getDropdownData(req, res) {
 try {
 const result = await CenterService.getDropdownData();
 res.status(200).json(result);
 } catch (error) {
 console.error('Error getting dropdown data:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // GET /api/centers/type/:centerType
 static async getCentersByType(req, res) {
 try {
 const { centerType } = req.params;

 if (!centerType) {
 return res.status(400).json({
 success: false,
 message: 'Center type is required'
 });
 }
 const result = await CenterService.getCentersByType(centerType);

 if (!result.success) {
 return res.status(400).json(result);
 }
 res.status(200).json(result);
 } catch (error) {
 console.error('Error getting centers by type:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // GET /api/centers/:id/permissions
 static async getCenterPermissions(req, res) {
 try {
 const { id } = req.params;

 if (!id || isNaN(id)) {
 return res.status(400).json({
 success: false,
 message: 'Valid center ID is required'
 });
 }
 const result = await CenterService.getCenterPermissions(id);

 if (!result.success) {
 return res.status(404).json(result);
 }
 res.status(200).json(result);
 } catch (error) {
 console.error('Error getting center permissions:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // GET /api/centers/main
 static async getMainCenter(req, res) {
 try {
 const result = await CenterService.getMainCenter();

 if (!result.success) {
 return res.status(404).json(result);
 }
 res.status(200).json(result);
 } catch (error) {
 console.error('Error getting main center:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
}