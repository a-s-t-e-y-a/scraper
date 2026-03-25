const crypto = require('crypto');
const fs = require('fs');
const https = require('https');
const path = require('path');

const ENCRYPTION_KEY = 'b14ca5898a4e4133bbce2ea2315a1916';
const IV = Buffer.alloc(16, 0);
const CURRENT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJVc2VySWQiOiJFbCswTE1oUm83eEJwSFBNc2MxMmhnPT0iLCJEaXZpc2lvbiI6IjEwMjAxNSIsIkV4dGVybmFsIjoiZmFsc2UiLCJJZCI6ImNhMzI2ODU2LWU2NzgtNDc4Ni04ZGU2LTgwMDdlZjc5YThmMSIsIkRhdGVUaW1lIjoiMy8yNS8yMDI2IDg6MDE6NTQgQU0iLCJSZWZyZXNoVG9rZW4iOiJvNFk5bWFuWnJ6SUhPUVpZTC9EK1U2MHRaa3AxV1o4bkV5TFFLRWltUjdqRERmVmJJTUZhYW1vTlZEVXUwbWNHaHp4d21SV3crUTVaVXVPSVlQa0UzUT09IiwiUmVmcmVzaFRva2VuRXhwaXJlcyI6IjMvMjUvMjAyNiAxMDowMTo1NCBBTSIsIm5iZiI6MTc3NDQyNTcxNCwiZXhwIjoxNzc0NDI5MzE0LCJpYXQiOjE3NzQ0MjU3MTQsImlzcyI6IlNUQVRJTS5Db21tb24uV2ViQVBJIiwiYXVkIjoiaHR0cDovL2xvY2FsaG9zdDo4MDAxIn0.AwlMNJ06o2oiCNBq_UqV5Y1ol5wmoV_YQPTt8dj4CSs";

function encrypt(data) {
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), IV);
  let encrypted = cipher.update(data, 'utf-8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

function decrypt(encryptedData) {
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

function makeRequest(hostname, path, method, headers, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      port: 443,
      path,
      method,
      headers
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          data
        });
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

async function refreshToken() {
  const body = JSON.stringify({});
  
  const headers = {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Authorization': `Bearer ${CURRENT_TOKEN}`,
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  };

  try {
    const response = await makeRequest(
      'nsecureapi.shriramgi.com',
      '/StatimConnect/Token/RefreshToken',
      'POST',
      headers,
      body
    );

    if (response.statusCode !== 200) {
      return CURRENT_TOKEN;
    }

    const decrypted = decrypt(response.data);
    if (!decrypted || !decrypted.tokenValue) {
      return CURRENT_TOKEN;
    }

    return decrypted.tokenValue;
  } catch (error) {
    return CURRENT_TOKEN;
  }
}

async function fetchModels(token, vehManufCode, startIndex = 0, pageSize = 100) {
  const payload = {
    getModelDetailsRequest: {
      productCode: "MOT-PRD-001",
      productClass: "CLASS_3",
      vehManufCode: vehManufCode,
      startIndex: startIndex,
      pageEndNos: pageSize.toString(),
      pccvType: "0",
      userId: "LC288-370",
      divisionCode: "102015",
      company: "SGI"
    }
  };

  const encryptedPayload = encrypt(JSON.stringify(payload));
  
  const headers = {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(encryptedPayload),
    'Authorization': `Bearer ${token}`,
    'Origin': 'https://novaconnector.shriramgi.com',
    'Referer': 'https://novaconnector.shriramgi.com/',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  };

  try {
    const response = await makeRequest(
      'nsecureapi.shriramgi.com',
      '/StatimConnectProposal/Proposal/Vehicle/LoadModel',
      'POST',
      headers,
      encryptedPayload
    );

    if (response.statusCode !== 200) {
      return null;
    }

    const decrypted = decrypt(response.data);
    if (!decrypted || !decrypted.allModelResponse) {
      return null;
    }

    return decrypted.allModelResponse;
  } catch (error) {
    console.error('❌ Request error for', vehManufCode, ':', error.message);
    return null;
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Shriram API - Manufacturer & Models Combined Fetcher      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const manufacturersFile = '/Users/apple/js_scrapper/manufacturers_data/manufacturers_2026-03-25.json';
  
  if (!fs.existsSync(manufacturersFile)) {
    console.error('❌ Manufacturers file not found');
    process.exit(1);
  }

  const manufacturersData = JSON.parse(fs.readFileSync(manufacturersFile, 'utf-8'));
  const manufacturers = manufacturersData.data;

  console.log(`📥 Loaded ${manufacturers.length} manufacturers\n`);
  console.log('🔄 Refreshing token...');
  const token = await refreshToken();
  console.log('✅ Token refreshed\n');

  let combinedData = [];
  let failedCount = 0;

  for (let i = 0; i < manufacturers.length; i++) {
    const manufacturer = manufacturers[i];
    const manuCode = manufacturer.manfacturerCode;
    const manuName = manufacturer.manfacturerName;
    
    process.stdout.write(`[${i + 1}/${manufacturers.length}] ${manuName.padEnd(30)} ... `);

    let allModels = [];
    let pageIndex = 0;
    let hasMore = true;

    while (hasMore) {
      const result = await fetchModels(token, manuCode, pageIndex * 100, 100);
      
      if (!result || result.serviceResponse.result !== 'Success') {
        break;
      }

      if (result.getModelResponse && result.getModelResponse.length > 0) {
        allModels = allModels.concat(result.getModelResponse);
        
        if (result.getModelResponse.length < 100) {
          hasMore = false;
        } else {
          pageIndex++;
          await new Promise(r => setTimeout(r, 200));
        }
      } else {
        hasMore = false;
      }
    }

    if (allModels.length > 0) {
      combinedData.push({
        manufacturer: {
          id: manufacturer.manfacturerID,
          name: manufacturer.manfacturerName,
          code: manufacturer.manfacturerCode
        },
        modelsCount: allModels.length,
        models: allModels
      });
      console.log(`✓ ${allModels.length} models`);
    } else {
      console.log(`⚠️ 0 models`);
      failedCount++;
    }

    if ((i + 1) % 5 === 0) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.log(`\n✅ Fetch complete!\n`);
  console.log(`📊 Summary:`);
  console.log(`  Manufacturers with models: ${combinedData.length}`);
  console.log(`  Manufacturers without models: ${failedCount}`);

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `/Users/apple/js_scrapper/manufacturers_data/manufacturers_with_models_${timestamp}.json`;
  
  fs.writeFileSync(filename, JSON.stringify({
    fetchDate: new Date().toISOString(),
    manufacturersCount: combinedData.length,
    totalModels: combinedData.reduce((sum, m) => sum + m.modelsCount, 0),
    data: combinedData
  }, null, 2));

  console.log(`\n💾 Saved to: manufacturers_data/manufacturers_with_models_${timestamp}.json`);
  console.log('\n✨ All done!');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
