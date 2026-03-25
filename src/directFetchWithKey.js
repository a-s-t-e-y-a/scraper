const crypto = require('crypto');
const fs = require('fs');
const https = require('https');

const API_KEY = 'b14ca5898a4e4133bbce2ea2315a1916';
const IV = Buffer.alloc(16, 0);

function decrypt(encryptedData) {
  try {
    const buffer = Buffer.from(encryptedData, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(API_KEY), IV);
    
    let decrypted = decipher.update(buffer);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    let result = decrypted.toString('utf-8');
    result = result.replace(/\x00/g, '');
    
    return JSON.parse(result);
  } catch (error) {
    console.error('Decryption failed:', error.message);
    return null;
  }
}

function fetchManufacturers() {
  return new Promise((resolve, reject) => {
    const tokenData = {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJVc2VySWQiOiJFbCswTE1oUm83eEJwSFBNc2MxMmhnPT0iLCJEaXZpc2lvbiI6IjEwMjAxNSIsIkV4dGVybmFsIjoiZmFsc2UiLCJJZCI6ImNhMzI2ODU2LWU2NzgtNDc4Ni04ZGU2LTgwMDdlZjc5YThmMSIsIkRhdGVUaW1lIjoiMy8yNS8yMDI2IDg6MDE6NTQgQU0iLCJSZWZyZXNoVG9rZW4iOiJvNFk5bWFuWnJ6SUhPUVpZTC9EK1U2MHRaa3AxV1o4bkV5TFFLRWltUjdqRERmVmJJTUZhYW1vTlZEVXUwbWNHaHp4d21SV3crUTVaVXVPSVlQa0UzUT09IiwiUmVmcmVzaFRva2VuRXhwaXJlcyI6IjMvMjUvMjAyNiAxMDowMTo1NCBBTSIsIm5iZiI6MTc3NDQyNTcxNCwiZXhwIjoxNzc0NDI5MzE0LCJpYXQiOjE3NzQ0MjU3MTQsImlzcyI6IlNUQVRJTS5Db21tb24uV2ViQVBJIiwiYXVkIjoiaHR0cDovL2xvY2FsaG9zdDo4MDAxIn0.AwlMNJ06o2oiCNBq_UqV5Y1ol5wmoV_YQPTt8dj4CSs"
    };

    const defaultPayload = {
      request: {
        StateCode: '00',
        DistrictCode: null,
        TalkerName: null,
        ModelId: null
      }
    };

    const postData = JSON.stringify(defaultPayload);

    const options = {
      hostname: 'nsecureapi.shriramgi.com',
      port: 443,
      path: '/StatimConnectProposal/Proposal/Vehicle/LoadManufacturer',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer ${tokenData.accessToken}`
      }
    };

    console.log('📡 Fetching manufacturer data from:', options.hostname + options.path);

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode !== 200) {
          console.log('❌ API Error - Status:', res.statusCode);
          console.log('Response:', data);
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }

        console.log('✅ Received encrypted response');
        console.log('📦 Response length:', data.length, 'characters');

        const decrypted = decrypt(data);
        if (!decrypted) {
          reject(new Error('Decryption failed'));
          return;
        }

        console.log('\n✨ Decrypted successfully!');
        console.log('📊 Data structure:', Object.keys(decrypted));
        console.log('\n📋 Sample data:');
        console.log(JSON.stringify(decrypted, null, 2).substring(0, 500) + '...\n');

        fs.writeFileSync('/Users/apple/js_scrapper/data/manufacturers_decrypted.json', JSON.stringify(decrypted, null, 2));
        console.log('💾 Saved to: data/manufacturers_decrypted.json');

        resolve(decrypted);
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error.message);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

fetchManufacturers()
  .then(() => {
    console.log('\n✅ Manufacturer fetch complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
