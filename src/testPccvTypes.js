const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const API_URL = 'https://nsecureapi.shriramgi.com/StatimConnectProposal/Proposal/Vehicle/LoadManufacturer';
let CURRENT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJVc2VySWQiOiJFbCswTE1oUm83eEJwSFBNc2MxMmhnPT0iLCJEaXZpc2lvbiI6IjEwMjAxNSIsIkV4dGVybmFsIjoiZmFsc2UiLCJJZCI6IjE1ZWNjMTIyLWIxODMtNDZlNS1hNTc2LTcyNDA0ZTBkMDg2MCIsIkRhdGVUaW1lIjoiMy8yNS8yMDI2IDExOjAzOjM2IEFNIiwiUmVmcmVzaFRva2VuIjoiNUdvWnlPWmZxeUJ5OEQ4UTlMRTRGZ3JBeFdWb09GOXc2TURKWFJCVk4yQW85ak1lL1QyeFZINEQxdnl6TEE2YzJMT1dSREo0bTBUTGNKMXp5QlJlQ3c9PSIsIlJlZnJlc2hUb2tlbkV4cGlyZXMiOiIzLzI1LzIwMjYgMTowMzozNiBQTSIsIm5iZiI6MTc3NDQzNjYxNiwiZXhwIjoxNzc0NDQwMjE2LCJpYXQiOjE3NzQ0MzY2MTYsImlzcyI6IlNUQVRJTS5Db21tb24uV2ViQVBJIiwiYXVkIjoiaHR0cDovL2xvY2FsaG9zdDo4MDAxIn0.1sGeBi7kKB6yYSpM9XPNpCotSyHwNNUw8jWbfmptS5g';
const ENCRYPTION_KEY = 'b14ca5898a4e4133bbce2ea2315a1916';
const IV = Buffer.alloc(16, 0);

const LOG_FILE = path.join(__dirname, '../data/pccvType_test_log.txt');
let logBuffer = '═'.repeat(70) + '\n';
logBuffer += 'PCCVTYPE TEST LOG\n';
logBuffer += '═'.repeat(70) + '\n\n';

const basePayload = {
  getManufacturerDetailsRequest: {
    productCode: 'MOT-PRD-005',
    productClass: 'CLASS_4C1A',
    vehManufCode: '',
    startIndex: 0,
    pageEndNos: '10',
    userId: 'LC288-370',
    divisionCode: '102015',
    company: 'SGI'
  }
};

function log(message) {
  console.log(message);
  logBuffer += message + '\n';
}

function encryptPayload(data) {
  try {
    const jsonString = JSON.stringify(data);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), IV);
    
    let encrypted = cipher.update(jsonString, 'utf-8', 'base64');
    encrypted += cipher.final('base64');
    
    return encrypted;
  } catch (error) {
    log(`❌ Encryption error: ${error.message}`);
    return null;
  }
}

function decryptResponse(encryptedData) {
  try {
    const buffer = Buffer.from(encryptedData, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), IV);
    
    let decrypted = decipher.update(buffer);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    let result = decrypted.toString('utf-8');
    result = result.replace(/\x00/g, '');
    
    return JSON.parse(result);
  } catch (error) {
    return null;
  }
}

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

async function testPccvType(pccvType) {
  return new Promise((resolve) => {
    const payload = JSON.parse(JSON.stringify(basePayload));
    payload.getManufacturerDetailsRequest.pccvType = String(pccvType);

    log(`\n${'─'.repeat(70)}`);
    log(`🔍 TEST: pccvType ${pccvType}`);
    log(`${'─'.repeat(70)}`);

    log(`\n📤 PAYLOAD TO SEND (Plain JSON):`);
    log(JSON.stringify(payload, null, 2));

    const encryptedPayload = encryptPayload(payload);
    if (!encryptedPayload) {
      log(`❌ Encryption failed`);
      console.log(`❌ pccvType ${pccvType}: Encryption failed`);
      resolve({ pccvType, status: 'error', error: 'encryption failed' });
      return;
    }

    log(`\n🔐 ENCRYPTED PAYLOAD (Base64):`);
    log(`Length: ${encryptedPayload.length} characters`);
    log(`First 100 chars: ${encryptedPayload.substring(0, 100)}...`);

    const postData = encryptedPayload;

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData, 'utf8'),
          'Authorization': `Bearer ${CURRENT_TOKEN}`,
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': '*/*',
          'Origin': 'https://novaconnector.shriramgi.com',
          'Referer': 'https://novaconnector.shriramgi.com/'
        }
      };

      log(`\n📨 REQUEST HEADERS:`);
      log(`  Method: ${options.method}`);
      log(`  URL: ${API_URL}`);
      log(`  Content-Length: ${options.headers['Content-Length']}`);
      log(`  Authorization: Bearer ${CURRENT_TOKEN.substring(0, 50)}...`);

    const req = https.request(API_URL, options, (res) => {
      let data = '';
      log(`\n📥 RESPONSE STATUS: ${res.statusCode}`);

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          log(`\n📝 RAW RESPONSE (Received):`);
          log(`  Response length: ${data.length} characters`);
          log(`  First 100 chars: ${data.substring(0, 100)}...`);

          let encryptedData = null;

          try {
            const parsedData = JSON.parse(data);
            
            if (typeof parsedData === 'string') {
              log(`  Format: JSON string (direct encrypted data)`);
              encryptedData = parsedData;
            } else if (parsedData.result && typeof parsedData.result === 'string') {
              log(`  Format: JSON object with 'result' field`);
              encryptedData = parsedData.result;
            } else {
              log(`  Format: JSON object without result field`);
              log(JSON.stringify(parsedData, null, 2).substring(0, 300));
            }
          } catch (e) {
            log(`  Format: Plain string (raw encrypted data)`);
            encryptedData = data;
          }

          if (res.statusCode === 200 && encryptedData) {
            log(`\n🔓 ATTEMPTING DECRYPTION...`);
            log(`  Encrypted data length: ${encryptedData.length} characters`);
            const decryptedData = decryptResponse(encryptedData);
            
            if (decryptedData) {
              log(`✅ DECRYPTION SUCCESSFUL!`);
              log(`\n📊 DECRYPTED RESPONSE:`);
              const decryptedJson = JSON.stringify(decryptedData, null, 2);
              log(decryptedJson.substring(0, 1000) + (decryptedJson.length > 1000 ? '\n... (truncated)' : ''));

              if (decryptedData.token) {
                log(`\n🔄 NEW TOKEN EXTRACTED FROM RESPONSE:`);
                log(`  Old: ${CURRENT_TOKEN.substring(0, 50)}...`);
                CURRENT_TOKEN = decryptedData.token;
                log(`  New: ${CURRENT_TOKEN.substring(0, 50)}...`);
              }

              const fileName = `pccvType_${pccvType}_response.json`;
              const filePath = path.join(dataDir, fileName);
              fs.writeFileSync(filePath, JSON.stringify(decryptedData, null, 2));
              
              log(`\n✅ pccvType ${pccvType}: SUCCESS`);
              log(`💾 File saved: ${fileName}`);
              console.log(`✅ pccvType ${pccvType}: SUCCESS - Decrypted & Saved`);
              resolve({ pccvType, status: 'success', fileName, decrypted: true });
            } else {
              log(`❌ DECRYPTION FAILED - Invalid encrypted data or wrong key`);
              console.log(`❌ pccvType ${pccvType}: Decryption failed`);
              resolve({ pccvType, status: 'error', error: 'decryption failed' });
            }
          } else {
            log(`❌ Status code ${res.statusCode} or no encrypted data found`);
            console.log(`❌ pccvType ${pccvType}: ERROR`);
            resolve({ pccvType, status: 'error', statusCode: res.statusCode, error: 'no encrypted data' });
          }
        } catch (error) {
          log(`❌ PARSE ERROR: ${error.message}`);
          console.log(`❌ pccvType ${pccvType}: PARSE ERROR`);
          resolve({ pccvType, status: 'error', error: error.message });
        }
      });
    });

    req.on('error', (error) => {
      log(`❌ REQUEST ERROR: ${error.message}`);
      console.log(`❌ pccvType ${pccvType}: REQUEST ERROR`);
      resolve({ pccvType, status: 'error', error: error.message });
    });

    req.setTimeout(15000, () => {
      req.destroy();
      log(`❌ REQUEST TIMEOUT`);
      console.log(`❌ pccvType ${pccvType}: TIMEOUT`);
      resolve({ pccvType, status: 'error', error: 'timeout' });
    });

    req.write(postData);
    req.end();
  });
}

async function runTests() {
  log('╔════════════════════════════════════════════════════════════════╗');
  log('║            PCCVTYPE COMPREHENSIVE TEST (1-30)                  ║');
  log('╚════════════════════════════════════════════════════════════════╝');
  log(`\n⏰ Started at: ${new Date().toISOString()}`);
  log(`🔑 Encryption Key: ${ENCRYPTION_KEY}`);
  log(`🎲 IV: 16 null bytes`);
  log(`🔐 Algorithm: AES-256-CBC`);
  
  console.log('🚀 Starting pccvType tests (1-30)...\n');
  
  const results = [];
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  for (let i = 1; i <= 30; i++) {
    const result = await testPccvType(i);
    results.push(result);
    await delay(800);
  }

  log(`\n\n${'═'.repeat(70)}`);
  log('📊 TEST SUMMARY');
  log('═'.repeat(70));
  
  const successful = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'error').length;
  
  log(`\n✅ Successful: ${successful}/30`);
  log(`❌ Failed: ${failed}/30`);
  log(`\nSuccess Rate: ${((successful/30)*100).toFixed(2)}%`);

  const successfulTypes = results.filter(r => r.status === 'success').map(r => r.pccvType);
  const failedTypes = results.filter(r => r.status === 'error').map(r => r.pccvType);

  if (successfulTypes.length > 0) {
    log(`\n✅ Working pccvTypes: ${successfulTypes.join(', ')}`);
  }
  
  if (failedTypes.length > 0) {
    log(`\n❌ Failed pccvTypes: ${failedTypes.join(', ')}`);
  }

  log(`\n⏰ Completed at: ${new Date().toISOString()}`);
  log(`\n${'═'.repeat(70)}`);

  fs.writeFileSync(LOG_FILE, logBuffer);
  
  const summaryPath = path.join(dataDir, 'pccvType_test_summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2));
  
  console.log(`\n📊 Test Summary:`);
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`\n📁 Files saved:`);
  console.log(`  - Data files: data/pccvType_[1-30]_response.json`);
  console.log(`  - Summary: data/pccvType_test_summary.json`);
  console.log(`  - Log file: data/pccvType_test_log.txt`);
}

runTests().catch(console.error);
