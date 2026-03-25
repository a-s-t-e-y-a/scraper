const crypto = require('crypto');

const ENCRYPTION_KEY = 'ZxV__ZA_KEY_VALUE';

class APIDecryptor {
  static decrypt(encryptedData, key = ENCRYPTION_KEY) {
    try {
      const iv = Buffer.alloc(16, 0);
      const keyBuffer = this.normalizeKey(key);
      const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
      
      let decrypted = decipher.update(encryptedData, 'base64', 'utf-8');
      decrypted += decipher.final('utf-8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      return null;
    }
  }

  static encrypt(data, key = ENCRYPTION_KEY) {
    try {
      const iv = Buffer.alloc(16, 0);
      const keyBuffer = this.normalizeKey(key);
      const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);
      
      const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
      let encrypted = cipher.update(jsonStr, 'utf-8', 'base64');
      encrypted += cipher.final('base64');
      
      return encrypted;
    } catch (error) {
      return null;
    }
  }

  static normalizeKey(key) {
    if (Buffer.isBuffer(key)) {
      return key.length === 32 ? key : Buffer.concat([key, Buffer.alloc(32 - key.length)]);
    }
    const keyBuffer = Buffer.from(key, 'utf-8');
    return keyBuffer.length === 32 ? keyBuffer : Buffer.concat([keyBuffer, Buffer.alloc(32 - keyBuffer.length)]);
  }

  static tryAllKeys(encryptedData, keyList) {
    const results = [];
    
    for (let key of keyList) {
      const decrypted = this.decrypt(encryptedData, key);
      if (decrypted) {
        results.push({
          key,
          success: true,
          data: decrypted
        });
      }
    }
    
    return results;
  }
}

module.exports = APIDecryptor;
