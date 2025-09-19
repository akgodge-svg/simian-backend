import cron from 'node-cron';
import { LPOService } from '../services/LPOService.js';
export class LPOExpiryNotificationJob {
// Schedule daily check at 9:00 AM
static start() {
console.log('Starting LPO expiry notification cron job...');
cron.schedule('0 9 * * *', async () => {
console.log('Running LPO expiry notification check...');
try {
const result = await LPOService.checkExpiringLPOs();
console.log('LPO expiry check result:', result);
} catch (error) {
console.error('LPO expiry check failed:', error);
}
}, {
timezone: "Asia/Dubai" // Adjust timezone as needed
});
console.log('LPO expiry notification cron job scheduled successfully');
}
// Run manual check
static async runManualCheck() {
try {
console.log('Running manual LPO expiry check...');
const result = await LPOService.checkExpiringLPOs();
console.log('Manual LPO expiry check result:', result);
return result;
} catch (error) {
console.error('Manual LPO expiry check failed:', error);
throw error;
}
}
}