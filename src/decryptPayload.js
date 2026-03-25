const crypto = require('crypto');

const ENCRYPTION_KEY = 'b14ca5898a4e4133bbce2ea2315a1916';
const IV = Buffer.alloc(16, 0);

const ENCRYPTED_PAYLOAD = '6yAf2K75MVeadgOHU8GWTJs3st3ks1dGxC5M5YLCp3xWhhC2n0+iUuUAfoXdtS/AIXyCvjbc/JDfJhEf7xyCvFyxy2V52XnnerLZBJbIjqt5ScndrV1CCmjUs+zeDM9XfBvxBJaC1ffUCUUBmnZ9oNwfO6xgSCjbXla2KxKCYypFAzlxayEwoj6Ja5k3CLLLGOJmiLUP9jmMy2LtsdR04pdaWHtmOfA0uDU2KXP49ADMJN0foWW+qSnwE83FFvx9aRKffeUW+FnIPdUqw3/cKXH2+bfvoxO8n62ITgxMXI6dGKFg3hM8bfusL2iio4L8qe+23CdFyia1kWXOtrrWeFTZopfaBegHLRfenXvvknsBVg+CXfScWuvg654N4OyF4CTprykfhE5+rzD2BqczT7E/MmeDrEHP11MIY1VMxEYPvOs79LJ6JE5QW2Ht9gsbzf4aQm2dYVZVx477/+PYl+3f/PowIPaSMwKHK5hm+vDo13uDw43ITjkSrN2Flo8jpQX29jE1tq4Tqp4kMWQsbCKYbJYrK5Q7mPQJGF7PsKCshznDC82F9mQ8QP3lpDlOmXs05Om2uhkc3Ti5f+TN0FHeSMFzRvC5Cu4lA+XHMc8QXjQslFjhmrPviU6OgHdaIu6UNRVQcSt9owJVAi47NweosYbEsyAybgyhY2Uq3Zkweg0G3vMAJiFiqX1OIaUzydscM/+lHh3t6dDCPg9xb23b2afnSsUmsAXnsKrmO01p/E6wAMUZ4/88yC7ugjbbGEvslnpXsrMV2xL4sItNNxJKUTpX6axnKotFPZ4fpqgzj5U9Pv3M0RtGYmjmUVi2upkwXmTbnewRzvbn4Y9+o5T9oWjTKeOdPEr2MyYc5avYHSylhqSo3c6jlnQOU6rqs1ivnvxyWZWk7KjwHfsG4u8hc5Hy8TJtNd9bZEITdul5U53wkKV3ou3Z8BsM56v9ck18f/g7Yd2xf5mY0m9Zij7HAonFlaARu4F0hKd/sN3cMGMBODTSfwpFL3r8MmkX';

function decrypt(encryptedData) {
  try {
    const buffer = Buffer.from(encryptedData, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), IV);
    
    let decrypted = decipher.update(buffer);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    let result = decrypted.toString('utf-8');
    result = result.replace(/\x00/g, '');
    
    return result;
  } catch (error) {
    console.error('❌ Decryption failed:', error.message);
    return null;
  }
}

console.log('🔓 Decrypting payload...\n');
const decrypted = decrypt(ENCRYPTED_PAYLOAD);

if (decrypted) {
  console.log('✨ Decryption successful!\n');
  console.log('📋 Decrypted payload:\n');
  console.log(decrypted);
  console.log('\n');
  
  try {
    const parsed = JSON.parse(decrypted);
    console.log('✅ Valid JSON!\n');
    console.log('📊 Parsed structure:');
    console.log(JSON.stringify(parsed, null, 2));
  } catch (e) {
    console.log('⚠️ Not JSON format, showing as raw string.');
  }
} else {
  console.error('❌ Failed to decrypt');
}
