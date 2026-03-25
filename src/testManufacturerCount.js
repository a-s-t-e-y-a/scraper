const crypto = require('crypto');
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
  const buffer = Buffer.from(encryptedData, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), IV);
  let decrypted = decipher.update(buffer);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  let result = decrypted.toString('utf-8');
  return result.replace(/\x00/g, '');
}

function makeRequest(body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'nsecureapi.shriramgi.com',
      port: 443,
      path: '/StatimConnectProposal/Proposal/Vehicle/LoadManufacturer',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Authorization': `Bearer ${CURRENT_TOKEN}`,
        'Origin': 'https://novaconnector.shriramgi.com',
        'Referer': 'https://novaconnector.shriramgi.com/',
        'User-Agent': 'Mozilla/5.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => { resolve(data); });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function test() {
  console.log('Testing API with different page sizes...\n');
  
  for (let pageSize of [100, 200, 500]) {
    console.log(`\n📋 Testing with pageEndNos: ${pageSize}`);
    
    const payload = {
      getManufacturerDetailsRequest: {
        productCode: 'MOT-PRD-005',
        productClass: 'CLASS_4C1B',
        vehManufCode: '',
        startIndex: 0,
        pageEndNos: pageSize.toString(),
        pccvType: '0',
        userId: 'LC288-370',
        divisionCode: '102015',
        company: 'SGI'
      }
    };

    const encrypted = encrypt(JSON.stringify(payload));
    const response = await makeRequest(encrypted);
    const decrypted = JSON.parse(decrypt(response));
    
    console.log(`Request payload:`);
    console.log(JSON.stringify(payload, null, 2));
    console.log(`\nAPI Response - Manufacturers count: ${decrypted.allManufacturerResponse.getManufacturerResponse.length}`);
    console.log('First 3 manufacturers:');
    decrypted.allManufacturerResponse.getManufacturerResponse.slice(0, 3).forEach((m, i) => {
      console.log(`  [${i+1}] ${m.manfacturerName}`);
    });
  }
}

test().catch(console.error);
