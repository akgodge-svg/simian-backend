import { CertificatePrintingService } from '../services/CertificatePrintingService.js';
export class CertificatePrintingController {
 // GET /api/certificate-printing/completed-courses
 static async getCompletedCourses(req, res) {
 try {
 const result = await CertificatePrintingService.getCompletedCoursesForPrinting();
 res.status(200).json(result);
 } catch (error) {
 console.error('Error getting completed courses:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // GET /api/certificate-printing/candidates/:courseId
 static async getPassedCandidates(req, res) {
 try {
 const { courseId } = req.params;
 if (!courseId || isNaN(courseId)) {
 return res.status(400).json({
 success: false,
 message: 'Valid course ID is required'
 });
 }
 const result = await CertificatePrintingService.getPassedCandidatesForPrinting(courseId);
 res.status(200).json(result);
 } catch (error) {
 console.error('Error getting passed candidates:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // POST /api/certificate-printing/generate
 static async generatePrintables(req, res) {
 try {
 const { course_booking_id, candidate_ids, print_type } = req.body;
 if (!course_booking_id || !candidate_ids || !Array.isArray(candidate_ids) || !print_type) {
 return res.status(400).json({
 success: false,
 message: 'Course booking ID, candidate IDs array, and print type are required'
 });
 }
 if (!['card', 'certificate'].includes(print_type)) {
 return res.status(400).json({
 success: false,
 message: 'Print type must be either "card" or "certificate"'
 });
 }
 const userContext = {
 userName: req.userName || 'system'
 };
 const printRequest = {
 course_booking_id,
 candidate_ids,
 print_type
 };
 const result = await CertificatePrintingService.generatePrintables(printRequest, userContext);
 res.status(200).json(result);
 } catch (error) {
 console.error('Error generating printables:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
}
