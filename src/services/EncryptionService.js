import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();
export class EncryptionService {
 static ALGORITHM = 'aes-256-gcm';
 static KEY = process.env.ENCRYPTION_KEY || 'your-32-character-encryption-key';

 // Encrypt text
 static encrypt(text) {
 if (!text) return null;

 try {
 const iv = crypto.randomBytes(16);
 const cipher = crypto.createCipher(this.ALGORITHM, this.KEY);

 let encrypted = cipher.update(text, 'utf8', 'hex');
 encrypted += cipher.final('hex');

 const authTag = cipher.getAuthTag();

 return {
 encrypted: encrypted,
 iv: iv.toString('hex'),
 authTag: authTag.toString('hex')
 };
 } catch (error) {
 console.error('Encryption error:', error);
 throw new Error('Failed to encrypt data');
 }
 }

 // Decrypt text
 static decrypt(encryptedData) {
 if (!encryptedData) return null;

 try {
 let data = encryptedData;

 // Handle string format (backwards compatibility)
 if (typeof encryptedData === 'string') {
 try {
 data = JSON.parse(encryptedData);
 } catch {
 // Assume it's plain encrypted text for backwards compatibility
 const decipher = crypto.createDecipher(this.ALGORITHM, this.KEY);
 let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
 decrypted += decipher.final('utf8');
 return decrypted;
 }
 }

 const decipher = crypto.createDecipher(this.ALGORITHM, this.KEY);

 if (data.authTag){
 decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));
 }

 let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
 decrypted += decipher.final('utf8');

 return decrypted;
 } catch (error) {
 console.error('Decryption error:', error);
 throw new Error('Failed to decrypt data');
 }
 }

 // Encrypt and store as JSON string
 static encryptForStorage(text) {
 const encrypted = this.encrypt(text);
 return JSON.stringify(encrypted);
 }

 // Decrypt from JSON string storage
 static decryptFromStorage(encryptedString) {
 return this.decrypt(encryptedString);
 }

 // Generate secure key
 static generateKey() {
 return crypto.randomBytes(32).toString('hex');
 }
}
