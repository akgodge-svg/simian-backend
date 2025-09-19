import { InstructorService } from '../services/InstructorService.js';
import { Instructor } from '../models/Instructor.js';
import path from 'path';
export class InstructorController {
 // GET /api/instructors
 static async getAllInstructors(req, res) {
 try {
 const result = await InstructorService.getAllInstructors();
 res.status(200).json(result);
 } catch (error) {
 console.error('Error getting instructors:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // GET /api/instructors/:id
 static async getInstructorById(req, res) {
 try {
 const { id } = req.params;

 if (!id || isNaN(id)) {
 return res.status(400).json({
 success: false,
 message: 'Valid instructor ID is required'
 });
 }
 const result = await InstructorService.getInstructorById(id);

 if (!result.success) {
 return res.status(404).json(result);
 }
 res.status(200).json(result);
 } catch (error) {
 console.error('Error getting instructor by ID:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // POST /api/instructors
 static async createInstructor(req, res) {
 try {
 const { instructor, qualifications, earnings } = req.body;

 if (!instructor) {
 return res.status(400).json({
 success: false,
 message: 'Instructor data is required'
 });
 }
 const result = await InstructorService.createInstructor(
 instructor,
 qualifications || [],
 earnings || []
 );

 if (!result.success) {
 return res.status(400).json(result);
 }
 res.status(201).json(result);
 } catch (error) {
 console.error('Error creating instructor:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // PUT /api/instructors/:id
 static async updateInstructor(req, res) {
 try {
 const { id } = req.params;
 const { instructor, qualifications, earnings } = req.body;

 if (!id || isNaN(id)) {
 return res.status(400).json({
 success: false,
 message: 'Valid instructor ID is required'
 });
 }

 if (!instructor) {
 return res.status(400).json({
 success: false,
 message: 'Instructor data is required'
 });
 }
 const result = await InstructorService.updateInstructor(
 id,
 instructor,
 qualifications || [],
 earnings || []
 );

 if (!result.success) {
 return res.status(400).json(result);
 }
 res.status(200).json(result);
 } catch (error) {
 console.error('Error updating instructor:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // DELETE /api/instructors/:id
 static async deleteInstructor(req, res) {
 try {
 const { id } = req.params;

 if (!id || isNaN(id)) {
 return res.status(400).json({
 success: false,
 message: 'Valid instructor ID is required'
 });
 }
 const result = await InstructorService.deleteInstructor(id);

 if (!result.success) {
 return res.status(400).json(result);
 }
 res.status(200).json(result);
 } catch (error) {
 console.error('Error deleting instructor:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // POST /api/instructors/:id/documents (File upload)
 static async uploadDocument(req, res) {
 // Configure multer for this specific route
 const upload = Instructor.getDocumentUploadConfig();

 upload.single('document')(req, res, async (err) => {
 if (err) {
 return res.status(400).json({
 success: false,
 message: err.message
 });
 }
 try {
 const { id } = req.params;

 if (!id || isNaN(id)) {
 return res.status(400).json({
 success: false,
 message: 'Valid instructor ID is required'
 });
 }
 if (!req.file) {
 return res.status(400).json({
 success: false,
 message: 'Document file is required'
 });
 }
 // Get document data from request body
 const documentData = {
 category_id: req.body.category_id,
 document_type: req.body.document_type, // 'card' or 'certificate'
 document_name: req.body.document_name || req.file.originalname,
 card_certificate_number: req.body.card_certificate_number,
 issue_date: req.body.issue_date,
 expiry_date: req.body.expiry_date,
 certifying_body: req.body.certifying_body
 };
 const result = await InstructorService.uploadDocument(id, documentData, req.file);

 if (!result.success) {
 return res.status(400).json(result);
 }
 res.status(201).json(result);
 } catch (error) {
 console.error('Error uploading document:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 });
 }
 // GET /api/instructors/:id/documents
 static async getInstructorDocuments(req, res) {
 try {
 const { id } = req.params;

 if (!id || isNaN(id)) {
 return res.status(400).json({
 success: false,
 message: 'Valid instructor ID is required'
 });
 }
 const result = await InstructorService.getInstructorDocuments(id);
 res.status(200).json(result);
 } catch (error) {
 console.error('Error getting instructor documents:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // GET /api/instructors/dropdown
 static async getDropdownData(req, res) {
 try {
 const result = await InstructorService.getDropdownData();
 res.status(200).json(result);
 } catch (error) {
 console.error('Error getting dropdown data:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // GET /api/instructors/smart-match
 static async smartMatch(req, res) {
 try {
 const filters = req.query;

 // Convert string parameters to appropriate types
 if (filters.category_id) filters.category_id = parseInt(filters.category_id);
 if (filters.level_number) filters.level_number = parseInt(filters.level_number);
 if (filters.center_id) filters.center_id = parseInt(filters.center_id);
 const result = await InstructorService.smartMatch(filters);

 if (!result.success) {
 return res.status(400).json(result);
 }
 res.status(200).json(result);
 } catch (error) {
 console.error('Error in smart matching:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // GET /api/instructors/:id/booking-status
 static async getBookingStatus(req, res) {
 try {
 const { id } = req.params;

 if (!id || isNaN(id)) {
 return res.status(400).json({
 success: false,
 message: 'Valid instructor ID is required'
 });
 }
 const result = await InstructorService.getBookingStatus(id);
 res.status(200).json(result);
 } catch (error) {
 console.error('Error getting booking status:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // GET /api/instructors/check-expiry (Cron job endpoint)
 static async checkDocumentExpiry(req, res) {
 try {
 const result = await InstructorService.checkDocumentExpiry();
 res.status(200).json(result);
 } catch (error) {
 console.error('Error checking document expiry:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
}