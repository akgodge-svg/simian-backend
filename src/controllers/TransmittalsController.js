import { TransmittalsService } from '../services/TransmittalsService.js';
export class TransmittalsController {
 // GET /api/transmittals
 static async getAllTransmittals(req, res) {
 try {
 const filters = {
 transmittal_number: req.query.transmittal_number,
 course_number: req.query.course_number,
 company_id: req.query.company_id,
 delivery_status: req.query.delivery_status,
 delivery_type: req.query.delivery_type,
 payment_status: req.query.payment_status,
 center_id: req.query.center_id,
 created_by_user: req.query.created_by_user,
 date_from: req.query.date_from,
 date_to: req.query.date_to,
 delivery_date_from: req.query.delivery_date_from,
 delivery_date_to: req.query.delivery_date_to,
 sort_by: req.query.sort_by,
 sort_order: req.query.sort_order
 };
 const pagination = {
 limit: req.query.limit,
 offset: req.query.offset
 };
 const userContext = {
 userName: req.userName || 'system',
 userRole: req.userRole || 'admin',
 centerContext: req.centerContext
 };
 const result = await TransmittalsService.getAllTransmittals(filters, pagination);
 res.status(200).json(result);
 } catch (error) {
 console.error('Error getting transmittals:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // GET /api/transmittals/:id
 static async getTransmittalById(req, res) {
 try {
 const { id } = req.params;
 if (!id || isNaN(id)) {
 return res.status(400).json({
 success: false,
 message: 'Valid transmittal ID is required'
 });
 }
 const result = await TransmittalsService.getTransmittalById(id);
 if (!result.success) {
 return res.status(404).json(result);
 }
 res.status(200).json(result);
 } catch (error) {
 console.error('Error getting transmittal by ID:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // PUT /api/transmittals/:id/status
 static async updateTransmittalStatus(req, res) {
 try {
 const { id } = req.params;
 const statusData = req.body;
 if (!id || isNaN(id)) {
 return res.status(400).json({
 success: false,
 message: 'Valid transmittal ID is required'
 });
 }
 const userContext = {
 userName: req.userName || 'system',
 userRole: req.userRole || 'admin',
 centerContext: req.centerContext
 };
 const result = await TransmittalsService.updateTransmittalStatus(id, statusData, userContext);
 res.status(200).json(result);
 } catch (error) {
 console.error('Error updating transmittal status:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // GET /api/transmittals/dashboard
 static async getDashboardStats(req, res) {
 try {
 const userContext = {
 userName: req.userName || 'system',
 userRole: req.userRole || 'admin',
 centerContext: req.centerContext
 };
 const result = await TransmittalsService.getDashboardStats(userContext);
 res.status(200).json(result);
 } catch (error) {
 console.error('Error getting dashboard stats:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // GET /api/transmittals/search
 static async searchTransmittals(req, res) {
 try {
 const { q: searchTerm } = req.query;
 const filters = {
 company_id: req.query.company_id,
 delivery_status: req.query.delivery_status,
 delivery_type: req.query.delivery_type
 };
 const result = await TransmittalsService.searchTransmittals(searchTerm, filters);
 res.status(200).json(result);
 } catch (error) {
 console.error('Error searching transmittals:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // GET /api/transmittals/export
 static async exportTransmittals(req, res) {
 try {
 const filters = {
 transmittal_number: req.query.transmittal_number,
 course_number: req.query.course_number,
 company_id: req.query.company_id,
 delivery_status: req.query.delivery_status,
 delivery_type: req.query.delivery_type,
 payment_status: req.query.payment_status,
 date_from: req.query.date_from,
 date_to: req.query.date_to
 };
 const userContext = {
 userName: req.userName || 'system',
 userRole: req.userRole || 'admin',
 centerContext: req.centerContext
 };
 const result = await TransmittalsService.exportToExcel(filters, userContext);
 if (!result.success) {
 return res.status(400).json(result);
 }
 res.setHeader('Content-Type', result.data.contentType);
 res.setHeader('Content-Disposition', `attachment; filename="${result.data.filename}"`);
 res.send(result.data.buffer);
 } catch (error) {
 console.error('Error exporting transmittals:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // POST /api/transmittals/bulk-update
 static async bulkUpdateStatus(req, res) {
 try {
 const { transmittal_ids, status_data } = req.body;
 if (!transmittal_ids || !Array.isArray(transmittal_ids) || transmittal_ids.length === 0) {
 return res.status(400).json({
 success: false,
 message: 'Transmittal IDs array is required'
 });
 }
 if (!status_data || Object.keys(status_data).length === 0) {
 return res.status(400).json({
 success: false,
 message: 'Status data is required'
 });
 }
 const userContext = {
 userName: req.userName || 'system',
 userRole: req.userRole || 'admin',
 centerContext: req.centerContext
 };
 const result = await TransmittalsService.bulkUpdateStatus(transmittal_ids, status_data, userContext);
 res.status(200).json(result);
 } catch (error) {
 console.error('Error in bulk update:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // GET /api/transmittals/by-course/:courseNumber
 static async getByCourseName(req, res) {
 try {
 const { courseNumber } = req.params;
 if (!courseNumber){
 return res.status(400).json({
 success: false,
 message: 'Course number is required'
 });
 }
 const filters = { course_number: courseNumber };
 const pagination = {
 limit: req.query.limit || 50,
 offset: req.query.offset || 0
 };
 const result = await TransmittalsService.getAllTransmittals(filters, pagination);
 res.status(200).json(result);
 } catch (error) {
 console.error('Error getting transmittals by course:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // GET /api/transmittals/by-company/:companyId
 static async getByCompany(req, res) {
 try {
 const { companyId } = req.params;
 if (!companyId || isNaN(companyId)) {
 return res.status(400).json({
 success: false,
 message: 'Valid company ID is required'
 });
 }
 const filters = { company_id: parseInt(companyId) };
 const pagination = {
 limit: req.query.limit || 50,
 offset: req.query.offset || 0
 };
 const result = await TransmittalsService.getAllTransmittals(filters, pagination);
 res.status(200).json(result);
 } catch (error) {
 console.error('Error getting transmittals by company:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // GET /api/transmittals/pending
 static async getPendingTransmittals(req, res) {
 try {
 const filters = { delivery_status: 'pending' };
 const pagination = {
 limit: req.query.limit || 100,
 offset: req.query.offset || 0
 };
 const result = await TransmittalsService.getAllTransmittals(filters, pagination);
 res.status(200).json(result);
 } catch (error) {
 console.error('Error getting pending transmittals:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
}
