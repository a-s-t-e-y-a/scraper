const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MANUFACTURER_API = 'https://nsecureapi.shriramgi.com/StatimConnectProposal/Proposal/Vehicle/LoadManufacturer';
const MODEL_API = 'https://nsecureapi.shriramgi.com/StatimConnectProposal/Proposal/Vehicle/LoadModel';
let CURRENT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJVc2VySWQiOiJFbCswTE1oUm83eEJwSFBNc2MxMmhnPT0iLCJEaXZpc2lvbiI6IjEwMjAxNSIsIkV4dGVybmFsIjoiZmFsc2UiLCJJZCI6ImExZWQzMzQ3LTRjOGYtNDgxYi04NzIzLTNhYmE4YTYyMDE3NCIsIkRhdGVUaW1lIjoiMy8yNS8yMDI2IDExOjEyOjQyIEFNIiwiUmVmcmVzaFRva2VuIjoickhMUjVPV3lxVE0zY2RKMjU0UU5ueEhkdmVkMFRnaElxUkthUzJDQXU3N09tVWZUMDBNQnczblgrTHJWTU1Kc1ozSUVQWWhLQms3YXVjZHplZnY4Y0E9PSIsIlJlZnJlc2hUb2tlbkV4cGlyZXMiOiIzLzI1LzIwMjYgMToxMjo0MiBQTSIsIm5iZiI6MTc3NDQzNzE2MiwiZXhwIjoxNzc0NDQwNzYyLCJpYXQiOjE3NzQ0MzcxNjIsImlzcyI6IlNUQVRJTS5Db21tb24uV2ViQVBJIiwiYXVkIjoiaHR0cDovL2xvY2FsaG9zdDo4MDAxIn0.UL0s0T5LfBRh-r93p0e0SdCZLK1oB2UsqVe3-Z_9AAE';
const ENCRYPTION_KEY = 'b14ca5898a4e4133bbce2ea2315a1916';
const IV = Buffer.alloc(16, 0);

const PRODUCT_CLASS = 'CLASS_4C2';
const PCCV_RANGE = { start: 1, end: 11 };
const OUTPUT_FILENAME = 'pccvTypes_1_11_CLASS_4C2_manufacturers_models_full.json';

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

async function makeRequest(apiUrl, encryptedPayload) {
  return new Promise((resolve) => {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(encryptedPayload, 'utf8'),
        'Authorization': `Bearer ${CURRENT_TOKEN}`,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': '*/*',
        'Origin': 'https://novaconnector.shriramgi.com',
        'Referer': 'https://novaconnector.shriramgi.com/'
      }
    };

    const req = https.request(apiUrl, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          let encryptedData = null;
          try {
            const parsedData = JSON.parse(data);
            encryptedData = typeof parsedData === 'string' ? parsedData : parsedData.result;
          } catch (e) {
            encryptedData = data;
          }

          if (res.statusCode === 200 && encryptedData) {
            const decrypted = decryptResponse(encryptedData);
            resolve({ success: true, data: decrypted, statusCode: res.statusCode });
          } else {
            resolve({ success: false, statusCode: res.statusCode });
          }
        } catch (error) {
          resolve({ success: false, error: error.message });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });

    req.setTimeout(20000, () => {
      req.destroy();
      resolve({ success: false, error: 'timeout' });
    });

    req.write(encryptedPayload);
    req.end();
  });
}

async function getModelsForManufacturer(pccvType, vehManufCode) {
  const payload = {
    getModelDetailsRequest: {
      productCode: 'MOT-PRD-005',
      productClass: PRODUCT_CLASS,
      vehManufCode,
      startIndex: 0,
      pageEndNos: '2000',
      pccvType: String(pccvType),
      userId: 'LC288-370',
      divisionCode: '102015',
      company: 'SGI'
    }
  };

  const encrypted = encryptPayload(payload);
  if (!encrypted) return null;

  const result = await makeRequest(MODEL_API, encrypted);
  if (result.success) {
    return result.data;
  }
  return null;
}

async function getManufacturers(pccvType) {
  const payload = {
    getManufacturerDetailsRequest: {
      productCode: 'MOT-PRD-005',
      productClass: PRODUCT_CLASS,
      vehManufCode: '',
      startIndex: 0,
      pageEndNos: '2000',
      pccvType: String(pccvType),
      userId: 'LC288-370',
      divisionCode: '102015',
      company: 'SGI'
    }
  };

  const encrypted = encryptPayload(payload);
  if (!encrypted) return null;

  const result = await makeRequest(MANUFACTURER_API, encrypted);
  if (result.success) {
    return result.data;
  }
  return null;
}

async function fetchAllData() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log(`║  FETCH ${PRODUCT_CLASS} (PCCV Types ${PCCV_RANGE.start}-${PCCV_RANGE.end})              ║`);
  console.log('║  4-wheelers capacity > 6 & 3-wheelers capacity > 17              ║');
  console.log('║  Models: PageEndNos 2000 (Full Data)                             ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const allData = {
    productClass: PRODUCT_CLASS,
    description: '4-wheelers capacity > 6 & 3-wheelers carrying passengers capacity > 17',
    timestamp: new Date().toISOString(),
    totalPccvTypes: PCCV_RANGE.end - PCCV_RANGE.start + 1,
    pccvTypeData: []
  };

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  for (let pccvType = PCCV_RANGE.start; pccvType <= PCCV_RANGE.end; pccvType++) {
    console.log(`\n📦 PCCV Type ${pccvType}/${PCCV_RANGE.end} - Fetching manufacturers...`);

    const manufacturersData = await getManufacturers(pccvType);
    if (!manufacturersData) {
      console.log(`❌ Failed to fetch manufacturers for PCCV Type ${pccvType}`);
      continue;
    }

    const manufacturers = manufacturersData.allManufacturerResponse?.getManufacturerResponse || [];
    console.log(`✅ Found ${manufacturers.length} manufacturers`);

    const pccvTypeObj = {
      pccvType,
      manufacturerCount: manufacturers.length,
      manufacturers: []
    };

    for (let i = 0; i < manufacturers.length; i++) {
      const mfg = manufacturers[i];
      process.stdout.write(`   └─ [${i + 1}/${manufacturers.length}] ${mfg.manfacturerName} - Fetching models... `);

      const modelsData = await getModelsForManufacturer(pccvType, mfg.manfacturerCode);
      const models = modelsData?.allModelResponse?.getModelResponse || [];

      console.log(`${models.length} models`);

      pccvTypeObj.manufacturers.push({
        manufacturerID: mfg.manfacturerID,
        manufacturerName: mfg.manfacturerName,
        manufacturerCode: mfg.manfacturerCode,
        modelCount: models.length,
        models
      });

      await delay(200);
    }

    allData.pccvTypeData.push(pccvTypeObj);
    await delay(500);
  }

  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('📊 COMBINING DATA...');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  const combinedFile = path.join(dataDir, OUTPUT_FILENAME);
  fs.writeFileSync(combinedFile, JSON.stringify(allData, null, 2));

  let totalManufacturers = 0;
  let totalModels = 0;
  
  allData.pccvTypeData.forEach(pccv => {
    totalManufacturers += pccv.manufacturerCount;
    pccv.manufacturers.forEach(mfg => {
      totalModels += mfg.modelCount;
    });
  });

  console.log(`✅ Combined file created: ${OUTPUT_FILENAME}`);
  console.log(`\n📊 SUMMARY:`);
  console.log(`   Product Class: ${PRODUCT_CLASS}`);
  console.log(`   Total PCCV Types: ${PCCV_RANGE.end - PCCV_RANGE.start + 1}`);
  console.log(`   Total Manufacturers: ${totalManufacturers}`);
  console.log(`   Total Models: ${totalModels}`);
  console.log(`\n📁 File location: data/${OUTPUT_FILENAME}`);
  console.log('\n✨ Done!\n');
}

fetchAllData().catch(console.error);
