import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs/promises';
import dotenv from 'dotenv';
dotenv.config();
export class EmailService {
static transporter = null;
// Initialize email transporter
static initializeTransporter() {
if (!this.transporter) {
this.transporter = nodemailer.createTransporter({
host: process.env.SMTP_HOST || 'smtp.gmail.com',
port: process.env.SMTP_PORT || 587,
secure: false,
auth: {
user: process.env.SMTP_USER,
pass: process.env.SMTP_PASS
}
});
}
return this.transporter;
}
// Send LPO creation notification
static async sendLPOCreatedNotification(lpoData, recipients) {
try {
const transporter = this.initializeTransporter();
const subject = `New LPO Created - ${lpoData.lpo_number}`;
const html = this.generateLPOCreatedEmailTemplate(lpoData);
const attachments = [];
// Add LPO file as attachment if exists
if (lpoData.lpo_file_path && await this.fileExists(lpoData.lpo_file_path)) {
attachments.push({
filename: lpoData.lpo_file_name || `LPO-${lpoData.lpo_number}.pdf`,
path: lpoData.lpo_file_path
});
}
const mailOptions = {
from: process.env.SMTP_FROM || 'noreply@trainingcenter.ae',
to: recipients.join(','),
subject: subject,
html: html,
attachments: attachments
};
const result = await transporter.sendMail(mailOptions);
return {
success: true,
messageId: result.messageId,
recipients: recipients,
attachmentSent: attachments.length > 0
};
} catch (error) {
console.error('Email sending failed:', error);
return {
success: false,
error: error.message,
recipients: recipients,
attachmentSent: false
};
}
}
// Send LPO expiry notification
static async sendLPOExpiryNotification(lpoData, recipients, daysUntilExpiry) {
try {
const transporter = this.initializeTransporter();
const subject = `LPO Expiring Soon - ${lpoData.lpo_number} (${daysUntilExpiry} days remaining)`;
const html = this.generateLPOExpiryEmailTemplate(lpoData, daysUntilExpiry);
const attachments = [];
// Add LPO file as attachment if exists
if (lpoData.lpo_file_path && await this.fileExists(lpoData.lpo_file_path)) {
attachments.push({
filename: lpoData.lpo_file_name || `LPO-${lpoData.lpo_number}.pdf`,
path: lpoData.lpo_file_path
});
}
const mailOptions = {
from: process.env.SMTP_FROM || 'noreply@trainingcenter.ae',
to: recipients.join(','),
subject: subject,
html: html,
attachments: attachments
};
const result = await transporter.sendMail(mailOptions);
return {
success: true,
messageId: result.messageId,
recipients: recipients,
attachmentSent: attachments.length > 0
};
} catch (error) {
console.error('Email sending failed:', error);
return {
success: false,
error: error.message,
recipients: recipients,
attachmentSent: false
};
}
}
// Generate LPO created email template
static generateLPOCreatedEmailTemplate(lpoData) {
const lineItemsHtml = lpoData.line_items.map(item => `
<tr>
<td style="padding: 8px; border: 1px solid #ddd;">${item.category_name}</td>
<td style="padding: 8px; border: 1px solid #ddd;">${item.level_name}</td>
<td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.quantity_ordered}</td>
<td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.unit_price} ${item.currency}</td>
<td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.line_total} ${item.currency}</td>
</tr>
`).join('');
return `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<h2 style="color: #2e7d32;">New LPO Created Successfully</h2>
<div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
<h3 style="margin-top: 0;">LPO Details</h3>
<p><strong>LPO Number:</strong> ${lpoData.lpo_number}</p>
<p><strong>Customer:</strong> ${lpoData.customer_name}</p>
<p><strong>LPO Type:</strong> ${lpoData.lpo_type.charAt(0).toUpperCase() + lpoData.lpo_type.slice(1)}</p>
<p><strong>Order Date:</strong> ${lpoData.order_date}</p>
<p><strong>Valid Until:</strong> ${lpoData.valid_until}</p>
<p><strong>Total Amount:</strong> ${lpoData.total_amount} ${lpoData.currency}</p>
</div>
<div style="margin: 20px 0;">
<h3>Line Items</h3>
<table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
<thead>
<tr style="background-color: #f5f5f5;">
<th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Category</th>
<th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Level</th>
<th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Quantity</th>
<th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Unit Price</th>
<th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Total</th>
</tr>
</thead>
<tbody>
${lineItemsHtml}
</tbody>
</table>
</div>
${lpoData.notes ? `
<div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px;">
<h4>Notes:</h4>
<p>${lpoData.notes}</p>
</div>
` : ''}
<hr style="margin: 30px 0;">
<p style="color: #666; font-size: 12px;">
This LPO document is attached to this email. Please keep it for your records.<br>
This is an automated notification from Training Management System.
</p>
</div>
`;
}
// Generate LPO expiry email template
static generateLPOExpiryEmailTemplate(lpoData, daysUntilExpiry) {
return `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<h2 style="color: #d32f2f;">LPO Expiring Soon</h2>
<div style="background-color: #ffebee; padding: 20px; border-radius: 8px; margin: 20px 0;">
<h3 style="margin-top: 0; color: #d32f2f;">⚠️ Expiry Alert</h3>
<p><strong>LPO Number:</strong> ${lpoData.lpo_number}</p>
<p><strong>Customer:</strong> ${lpoData.customer_name}</p>
<p><strong>Expires On:</strong> ${lpoData.valid_until}</p>
<p><strong>Days Remaining:</strong> ${daysUntilExpiry} days</p>
<p><strong>Total Amount:</strong> ${lpoData.total_amount} ${lpoData.currency}</p>
</div>
<div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0;">
<h3 style="margin-top: 0;">Remaining Quantities</h3>
<p>Please review the remaining quantities and plan your training courses accordingly:</p>
<table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
<thead>
<tr style="background-color: #f5f5f5;">
<th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Category</th>
<th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Level</th>
<th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Remaining Qty</th>
</tr>
</thead>
<tbody>
${lpoData.line_items?.map(item => `
<tr>
<td style="padding: 8px; border: 1px solid #ddd;">${item.category_name}</td>
<td style="padding: 8px; border: 1px solid #ddd;">${item.level_name}</td>
<td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.quantity_remaining}</td>
</tr>
`).join('') || '<tr><td colspan="3" style="padding: 8px; text-align: center;">No line items available</td></tr>'}
</tbody>
</table>
</div>
<div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px;">
<h4 style="margin-top: 0;">Action Required</h4>
<p>Please contact us to:</p>
<ul>
<li>Utilize remaining quantities before expiry</li>
<li>Renew the LPO if needed</li>
<li>Discuss extension possibilities</li>
</ul>
</div>
<hr style="margin: 30px 0;">
<p style="color: #666; font-size: 12px;">
Original LPO document is attached for your reference.<br>
This is an automated notification from Training Management System.
</p>
</div>
`;
}
// Check if file exists
static async fileExists(filePath) {
try {
await fs.access(filePath);
return true;
} catch {
return false;
}
}
}