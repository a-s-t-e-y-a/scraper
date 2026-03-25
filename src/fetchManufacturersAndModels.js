const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const API_URL = 'https://nsecureapi.shriramgi.com/StatimConnectProposal/Proposal/Vehicle/LoadManufacturer';
let CURRENT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJVc2VySWQiOiJFbCswTE1oUm83eEJwSFBNc2MxMmhnPT0iLCJEaXZpc2lvbiI6IjEwMjAxNSIsIkV4dGVybmFsIjoiZmFsc2UiLCJJZCI6IjE1ZWNjMTIyLWIxODMtNDZlNS1hNTc2LTcyNDA0ZTBkMDg2MCIsIkRhdGVUaW1lIjoiMy8yNS8yMDI2IDExOjAzOjM2IEFNIiwiUmVmcmVzaFRva2VuIjoiNUdvWnlPWmZxeUJ5OEQ4UTlMRTRGZ3JBeFdWb09GOXc2TURKWFJCVk4yQW85ak1lL1QyeFZINEQxdnl6TEE2YzJMT1dSREo0bTBUTGNKMXp5QlJlQ3c9PSIsIlJlZnJlc2hUb2tlbkV4cGlyZXMiOiIzLzI1LzIwMjYgMTowMzozNiBQTSIsIm5iZiI6MTc3NDQzNjYxNiwiZXhwIjoxNzc0NDQwMjE2LCJpYXQiOjE3NzQ0MzY2MTYsImlzcyI6IlNUQVRJTS5Db21tb24uV2ViQVBJIiwiYXVkIjoiaHR0cDovL2xvY2FsaG9zdDo4MDAxIn0.1sGeBi7kKB6yYSpM9XPNpCotSyHwNNUw8jWbfmptS5g';
const ENCRYPTION_KEY = 'b14ca5898a4e4133bbce2ea2315a1916';
const IV = Buffer.alloc(16, 0);

const basePayload = {
  getManufacturerDetailsRequest: {
    productCode: 'MOT-PRD-005',
    productClass: 'CLASS_4C1A',
    vehManufCode: '',
    startIndex: 0,
    pageEndNos: '2000',
    userId: 'LC288-370',
    divisionCode: '102015',
    company: 'SGI'
  }
};

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function encryptPayload(data) {
  try {
    const jsonString = JSON.stringify(data);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), IV);
    
    let encrypted = cipher.update(jsonString, 'utf-8', 'base64');
    encrypted += cipher.final('base64');
    
    return encrypted;
  } catch (error) {
    console.log(`❌ Encryption error: ${error.message}`);
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

async function fetchManufacturersAndModels(pccvType) {
  return new Promise((resolve) => {
    const payload = JSON.parse(JSON.stringify(basePayload));
    payload.getManufacturerDetailsRequest.pccvType = String(pccvType);

    console.log(`🔄 PCCV Type ${pccvType.toString().padStart(3, ' ')}/100 - Fetching manufacturers & models...`);

    const encryptedPayload = encryptPayload(payload);
    if (!encryptedPayload) {
      console.log(`❌ pccvType ${pccvType}: Encryption failed`);
      resolve({ pccvType, status: 'error', error: 'encryption failed' });
      return;
    }

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

    const req = https.request(API_URL, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          let encryptedData = null;

          try {
            const parsedData = JSON.parse(data);
            if (typeof parsedData === 'string') {
              encryptedData = parsedData;
            } else if (parsedData.result && typeof parsedData.result === 'string') {
              encryptedData = parsedData.result;
            }
          } catch (e) {
            encryptedData = data;
          }

          if (res.statusCode === 200 && encryptedData) {
            const decryptedData = decryptResponse(encryptedData);
            
            if (decryptedData) {
              const fileName = `pccvType_${pccvType.toString().padStart(3, '0')}_manufacturers_models_full.json`;
              const filePath = path.join(dataDir, fileName);
              fs.writeFileSync(filePath, JSON.stringify(decryptedData, null, 2));
              
              const manufacturerCount = decryptedData.allManufacturerResponse?.getManufacturerResponse?.length || 0;
              console.log(`✅ pccvType ${pccvType.toString().padStart(3, ' ')}: ${manufacturerCount} manufacturers found - Saved`);
              
              resolve({ pccvType, status: 'success', fileName, count: manufacturerCount });
            } else {
              console.log(`❌ pccvType ${pccvType}: Decryption failed`);
              resolve({ pccvType, status: 'error', error: 'decryption failed' });
            }
          } else {
            console.log(`❌ pccvType ${pccvType}: HTTP ${res.statusCode}`);
            resolve({ pccvType, status: 'error', statusCode: res.statusCode });
          }
        } catch (error) {
          console.log(`❌ pccvType ${pccvType}: ${error.message}`);
          resolve({ pccvType, status: 'error', error: error.message });
        }
      });
    });

    req.on('error', (error) => {
      console.log(`❌ pccvType ${pccvType}: REQUEST ERROR - ${error.message}`);
      resolve({ pccvType, status: 'error', error: error.message });
    });

    req.setTimeout(20000, () => {
      req.destroy();
      console.log(`❌ pccvType ${pccvType}: TIMEOUT`);
      resolve({ pccvType, status: 'error', error: 'timeout' });
    });

    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║      FETCH ALL MANUFACTURERS & MODELS (PCCV Types 1-11)        ║');
  console.log('║              PageEndNos: 2000 (All Data)                        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const results = [];
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  for (let i = 1; i <= 11; i++) {
    const result = await fetchManufacturersAndModels(i);
    results.push(result);
    await delay(600);
  }

  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('📊 FETCH SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════');
  
  const successful = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status === 'error');
  
  console.log(`\n✅ Successful: ${successful.length}/11`);
  if (successful.length > 0) {
    const totalManufacturers = successful.reduce((sum, r) => sum + (r.count || 0), 0);
    console.log(`   Total manufacturers fetched: ${totalManufacturers}`);
    console.log(`\n   PCCV Types with data:`);
    successful.forEach(r => {
      console.log(`   - Type ${r.pccvType}: ${r.count} manufacturers`);
    });
  }
  
  console.log(`\n❌ Failed: ${failed.length}/11`);
  if (failed.length > 0) {
    const failedTypes = failed.map(r => r.pccvType).slice(0, 10);
    console.log(`   Types: ${failedTypes.join(', ')}${failed.length > 10 ? '...' : ''}`);
  }

  const summaryPath = path.join(dataDir, 'manufacturers_models_fetch_summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2));
  
  console.log(`\n📁 Files saved:`);
  console.log(`   - Individual files: data/pccvType_[001-011]_manufacturers_models_full.json`);
  console.log(`   - Summary: data/manufacturers_models_fetch_summary.json`);
  console.log('\n✨ Done!\n');
}

main().catch(console.error);
