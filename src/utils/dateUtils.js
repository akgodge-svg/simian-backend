export class DateUtils {
    // Calculate end date excluding weekends
    static calculateEndDate(startDate, durationDays) {
    const start = new Date(startDate);
    let currentDate = new Date(start);
    let remainingDays = durationDays - 1; // Start date counts as day 1
    // Add remaining days, skipping weekends
    while (remainingDays > 0) {
    currentDate.setDate(currentDate.getDate() + 1);
    // Skip weekends (Saturday = 6, Sunday = 0)
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
    remainingDays--;
    }
    }
    return currentDate.toISOString().split('T')[0]; // Return YYYY-MM-DD format
    }
    // Check if date is weekend
    static isWeekend(date) {
    const dayOfWeek = new Date(date).getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
    }
    // Get working days between two dates (excluding weekends)
    static getWorkingDaysBetween(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let workingDays = 0;
    let currentDate = new Date(start);
    while (currentDate <= end) {
    if (!this.isWeekend(currentDate)) {
    workingDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
    }
    return workingDays;
    }
    // Validate date range
    static validateDateRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start < today) {
    return { isValid: false, message: 'Start date cannot be in the past' };
    }
    if (end <= start) {
    return { isValid: false, message: 'End date must be after start date' };
    }
    if (this.isWeekend(start)) {
    return { isValid: false, message: 'Start date cannot be on weekend' };
    }
    return { isValid: true };
    }
    // Format date for display
    static formatDate(date) {
    return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
    });
    }
    }