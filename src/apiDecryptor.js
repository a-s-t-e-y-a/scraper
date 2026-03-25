const crypto = require('crypto');

const ENCRYPTION_KEY = 'ZxV__ZA_KEY_VALUE';

class APIDecryptor {
  static decrypt(encryptedData, key = ENCRYPTION_KEY) {
    try {
      const iv = Buffer.alloc(16, 0);
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'utf-8').slice(0, 32), iv);
      
      let decrypted = decipher.update(encryptedData, 'base64', 'utf-8');
      decrypted += decipher.final('utf-8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error.message);
      return null;
    }
  }

  static encrypt(data, key = ENCRYPTION_KEY) {
    try {
      const iv = Buffer.alloc(16, 0);
      const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'utf-8').slice(0, 32), iv);
      
      const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
      let encrypted = cipher.update(jsonStr, 'utf-8', 'base64');
      encrypted += cipher.final('base64');
      
      return encrypted;
    } catch (error) {
      console.error('Encryption failed:', error.message);
      return null;
    }
  }
}

module.exports = APIDecryptor;
