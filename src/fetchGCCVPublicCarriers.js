const crypto = require('crypto');
const fs = require('fs');
const https = require('https');

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

async function fetchManufacturers(token, productCode, productClass, startIndex = 0, pageSize = 50) {
  const payload = {
    getManufacturerDetailsRequest: {
      productCode: productCode,
      productClass: productClass,
      vehManufCode: "",
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
      '/StatimConnectProposal/Proposal/Vehicle/LoadManufacturer',
      'POST',
      headers,
      encryptedPayload
    );

    if (response.statusCode !== 200) {
      return null;
    }

    const decrypted = decrypt(response.data);
    if (!decrypted || !decrypted.allManufacturerResponse) {
      return null;
    }

    return decrypted.allManufacturerResponse;
  } catch (error) {
    console.error('❌ Manufacturer fetch error:', error.message);
    return null;
  }
}

async function fetchModels(token, vehManufCode, productCode, productClass, startIndex = 0, pageSize = 100) {
  const payload = {
    getModelDetailsRequest: {
      productCode: productCode,
      productClass: productClass,
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
    return null;
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  GCCV - Public Carriers (Others) - Manufacturer & Models   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const productCode = 'MOT-PRD-003';
  const productClass = 'CLASS_4A1';
  const productName = 'GCCV-PUBLIC CARRIERS OTHER THAN THREE WHEELERS';

  console.log(`📦 Product: ${productName}`);
  console.log(`🔧 Code: ${productCode} / ${productClass}\n`);

  console.log('🔄 Refreshing token...');
  const token = await refreshToken();
  console.log('✅ Token refreshed\n');

  console.log('📥 Fetching manufacturers...');
  const manufacturerResult = await fetchManufacturers(token, productCode, productClass, 0, 100);
  
  if (!manufacturerResult || !manufacturerResult.getManufacturerResponse) {
    console.error('❌ Failed to fetch manufacturers');
    process.exit(1);
  }

  const manufacturers = manufacturerResult.getManufacturerResponse;
  console.log(`✅ Fetched ${manufacturers.length} manufacturers\n`);

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
      const result = await fetchModels(token, manuCode, productCode, productClass, pageIndex * 100, 100);
      
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
  console.log(`  Total models: ${combinedData.reduce((sum, m) => sum + m.modelsCount, 0)}`);

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `/Users/apple/js_scrapper/manufacturers_data/manufacturers_with_models_GCCV_PUBLIC_CARRIERS_OTHER_THAN_THREE_WHEELERS_${timestamp}.json`;
  
  fs.writeFileSync(filename, JSON.stringify({
    productType: productName,
    productCode: productCode,
    productClass: productClass,
    fetchDate: new Date().toISOString(),
    manufacturersCount: combinedData.length,
    totalModels: combinedData.reduce((sum, m) => sum + m.modelsCount, 0),
    data: combinedData
  }, null, 2));

  console.log(`\n💾 Saved to: manufacturers_data/manufacturers_with_models_GCCV_PUBLIC_CARRIERS_OTHER_THAN_THREE_WHEELERS_${timestamp}.json`);
  console.log('\n✨ All done!');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
