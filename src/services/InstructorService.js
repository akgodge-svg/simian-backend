import { Instructor } from '../models/Instructor.js';
import fs from 'fs/promises';
export class InstructorService {

 // Get all instructors with complete data
 static async getAllInstructors() {
 try {
 const instructors = await Instructor.findAll();

 return {
 success: true,
 data: instructors,
 message: 'Instructors retrieved successfully',
 count: instructors.length
 };
 } catch (error) {
 throw new Error(`Failed to get instructors: ${error.message}`);
 }
 }
 // Get single instructor with complete details
 static async getInstructorById(id) {
 try {
 const instructor = await Instructor.findById(id);

 if (!instructor) {
 return {
 success: false,
 message: 'Instructor not found'
 };
 }
 // Get all related data
 const qualifications = await Instructor.getQualifications(id);
 const earnings = await Instructor.getEarnings(id);
 const documents = await Instructor.getDocuments(id);
 const bookingStatus = await Instructor.getBookingStatus(id);
 // Group documents by category and type
 const documentsByCategory = documents.reduce((acc, doc) => {
 if (!acc[doc.category_id]) {
 acc[doc.category_id] = {
 category_name: doc.category_name,
 card: null,
 certificate: null
 };
 }
 acc[doc.category_id][doc.document_type] = doc;
 return acc;
 }, {});
 return {
 success: true,
 data: {
 ...instructor,
 qualifications,
 earnings,
 documents: documentsByCategory,
 current_bookings: bookingStatus
 },
 message: 'Instructor retrieved successfully'
 };
 } catch (error) {
 throw new Error(`Failed to get instructor: ${error.message}`);
 }
 }
 // Create instructor with qualifications and earnings
 static async createInstructor(instructorData, qualifications = [], earnings = []) {
 try {
 // Validate instructor data
 const validation = this.validateInstructorData(instructorData);
 if (!validation.isValid) {
 return {
 success: false,
 message: validation.message
 };
 }
 // Check if email exists
 const emailExists = await Instructor.emailExists(instructorData.email);
 if (emailExists) {
 return {
 success: false,
 message: 'Email address already exists'
 };
 }
 // Generate username from email
 const username = instructorData.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');

 // Check if username exists
 const usernameExists = await Instructor.usernameExists(username);
 if (usernameExists){
 instructorData.username = `${username}${Date.now()}`;
 } else {
 instructorData.username = username;
 }
 // Set default password if not provided
 if (!instructorData.password_hash){
 instructorData.password_hash = 'TempPass123!';
 }
 // Create instructor
 const instructor = new Instructor(instructorData);
 await instructor.save();
 // Save qualifications if provided
 if (qualifications.length > 0) {
 await Instructor.saveQualifications(instructor.id, qualifications);
 }
 // Save earnings if provided
 if (earnings.length > 0) {
 await Instructor.saveEarnings(instructor.id, earnings);
 }
 // Get complete instructor data
 const result = await this.getInstructorById(instructor.id);
 return {
 success: true,
 data: result.data,
 message: 'Instructor created successfully. You can now upload documents for each category.',
 next_step: 'Upload required documents (Card and/or Certificate) for each qualification category'
 };
 } catch (error) {
 throw new Error(`Failed to create instructor: ${error.message}`);
 }
 }
 // Update instructor
 static async updateInstructor(id, instructorData, qualifications = [], earnings = []) {
 try {
 const instructor = await Instructor.findById(id);
 if (!instructor) {
 return {
 success: false,
 message: 'Instructor not found'
 };
 }
 // Validate data
 const validation = this.validateInstructorData(instructorData);
 if (!validation.isValid) {
 return {
 success: false,
 message: validation.message
 };
 }
 // Check email uniqueness (exclude current instructor)
 const emailExists = await Instructor.emailExists(instructorData.email, id);
 if (emailExists) {
 return {
 success: false,
 message: 'Email address already exists'
 };
 }
 // Update instructor
 Object.assign(instructor, instructorData);
 await instructor.update();
 // Update qualifications if provided
 if (qualifications.length > 0) {
 await Instructor.saveQualifications(id, qualifications);
 }
 // Update earnings if provided
 if (earnings.length > 0) {
 await Instructor.saveEarnings(id, earnings);
 }
 // Get updated data
 const result = await this.getInstructorById(id);
 return {
 success: true,
 data: result.data,
 message: 'Instructor updated successfully'
 };
 } catch (error) {
 throw new Error(`Failed to update instructor: ${error.message}`);
 }
 }
 // Delete instructor
 static async deleteInstructor(id) {
 try {
 const instructor = await Instructor.findById(id);
 if (!instructor) {
 return {
 success: false,
 message: 'Instructor not found'
 };
 }
 // Check if instructor has active bookings
 const activeBookings = await Instructor.getBookingStatus(id);
 if (activeBookings.length > 0) {
 return {
 success: false,
 message: 'Cannot delete instructor with active course bookings'
 };
 }
 await instructor.delete();
 return {
 success: true,
 message: 'Instructor deleted successfully'
 };
 } catch (error) {
 throw new Error(`Failed to delete instructor: ${error.message}`);
 }
 }
 // Upload document for instructor
 static async uploadDocument(instructorId, documentData, fileInfo) {
 try {
 // Validate required fields
 if (!documentData.category_id || !documentData.document_type ||
!documentData.card_certificate_number) {
 return {
 success: false,
 message: 'Category, document type, and certificate number are required'
 };
 }
 // Validate document type
 if (!['card', 'certificate'].includes(documentData.document_type)) {
 return {
 success: false,
 message: 'Document type must be either "card" or "certificate"'
 };
 }
 // Validate dates
 if (!documentData.issue_date || !documentData.expiry_date){
 return {
 success: false,
 message: 'Issue date and expiry date are required'
 };
 }
 // Check if expiry date is after issue date
 if (new Date(documentData.expiry_date) <= new Date(documentData.issue_date)){
 return {
 success: false,
 message: 'Expiry date must be after issue date'
 };
 }
 // Upload document
 const documentId = await Instructor.uploadDocument(instructorId, documentData, fileInfo);
 return {
 success: true,
 data: { document_id: documentId },
 message: `${documentData.document_type.charAt(0).toUpperCase() +
documentData.document_type.slice(1)} uploaded successfully`
 };
 } catch (error) {
 // Clean up uploaded file if something went wrong
 if (fileInfo && fileInfo.path) {
 try {
 await fs.unlink(fileInfo.path);
 } catch (unlinkError){
 console.warn('Could not delete uploaded file:', unlinkError.message);
 }
 }

 if (error.code === 'ER_DUP_ENTRY'){
 return {
 success: false,
 message: `${documentData.document_type.charAt(0).toUpperCase() +
documentData.document_type.slice(1)} already exists for this category. Please delete the existing one first.`
 };
 }

 throw new Error(`Failed to upload document: ${error.message}`);
 }
 }
 // Get instructor documents
 static async getInstructorDocuments(instructorId) {
 try {
 const documents = await Instructor.getDocuments(instructorId);

 // Group documents by category
 const documentsByCategory = documents.reduce((acc, doc) => {
 if (!acc[doc.category_id]) {
 acc[doc.category_id] = {
 category_name: doc.category_name,
 documents: []
 };
 }
 acc[doc.category_id].documents.push(doc);
 return acc;
 }, {});
 return {
 success: true,
 data: documentsByCategory,
 message: 'Documents retrieved successfully',
 count: documents.length
 };
 } catch (error) {
 throw new Error(`Failed to get documents: ${error.message}`);
 }
 }
 // Smart matching for course assignment
 static async smartMatch(filters) {
 try {
 const {
 category_id,
 level_number,
 center_id,
 course_start_date,
 course_end_date
 } = filters;
 // Validate required filters
 if (!category_id || !level_number){
 return {
 success: false,
 message: 'Category ID and level number are required'
 };
 }
 const matches = await Instructor.smartMatch(filters);
 return {
 success: true,
 data: matches,
 message: 'Available instructors found successfully',
 count: matches.length,
 filters_applied: filters,
 note: 'Admin can manually assign these instructors as Actual/Document during course booking'
 };
 } catch (error) {
 throw new Error(`Smart matching failed: ${error.message}`);
 }
 }
 // Get dropdown data
 static async getDropdownData() {
 try {
 const instructors = await Instructor.getDropdownList();

 return {
 success: true,
 data: instructors,
 message: 'Instructor dropdown data retrieved successfully'
 };
 } catch (error) {
 throw new Error(`Failed to get dropdown data: ${error.message}`);
 }
 }
 // Get instructor booking status
 static async getBookingStatus(id) {
 try {
 const bookings = await Instructor.getBookingStatus(id);

 return {
 success: true,
 data: bookings,
 message: 'Booking status retrieved successfully',
 count: bookings.length
 };
 } catch (error) {
 throw new Error(`Failed to get booking status: ${error.message}`);
 }
 }
 // Check and send expiry notifications
 static async checkDocumentExpiry() {
 try {
 const expiringDocuments = await Instructor.getExpiringDocuments(30);
 let notificationsSent = 0;
 for (const document of expiringDocuments) {
 const daysToExpiry = document.days_to_expiry;

 // Send notifications at 30, 15, 7, and 1 days before expiry
 if ([30, 15, 7, 1].includes(daysToExpiry)) {
 const success = await Instructor.sendExpiryNotification(document, daysToExpiry);
 if (success) {
 notificationsSent++;
 }
 }
 }
 return {
 success: true,
 message: `Expiry check completed. ${notificationsSent} notifications sent.`,
 documents_checked: expiringDocuments.length,
 notifications_sent: notificationsSent
 };
 } catch (error) {
 throw new Error(`Failed to check document expiry: ${error.message}`);
 }
 }
 // Validate instructor data
 static validateInstructorData(data) {
 if (!data.name || data.name.trim().length === 0) {
 return { isValid: false, message: 'Instructor name is required' };
 }
 if (!data.email || data.email.trim().length === 0) {
 return { isValid: false, message: 'Email address is required' };
 }
 // Email format validation
 const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
 if (!emailRegex.test(data.email)) {
 return { isValid: false, message: 'Invalid email format' };
 }
 if (!data.primary_center_id || isNaN(data.primary_center_id)) {
 return { isValid: false, message: 'Valid primary center ID is required' };
 }
 return { isValid: true };
 }
}
