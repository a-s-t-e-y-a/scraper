const crypto = require('crypto');
const fs = require('fs');
const https = require('https');

const ENCRYPTION_KEY = 'b14ca5898a4e4133bbce2ea2315a1916';
const IV = Buffer.alloc(16, 0);

const CURRENT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJVc2VySWQiOiJFbCswTE1oUm83eEJwSFBNc2MxMmhnPT0iLCJEaXZpc2lvbiI6IjEwMjAxNSIsIkV4dGVybmFsIjoiZmFsc2UiLCJJZCI6ImNhMzI2ODU2LWU2NzgtNDc4Ni04ZGU2LTgwMDdlZjc5YThmMSIsIkRhdGVUaW1lIjoiMy8yNS8yMDI2IDg6MDE6NTQgQU0iLCJSZWZyZXNoVG9rZW4iOiJvNFk5bWFuWnJ6SUhPUVpZTC9EK1U2MHRaa3AxV1o4bkV5TFFLRWltUjdqRERmVmJJTUZhYW1vTlZEVXUwbWNHaHp4d21SV3crUTVaVXVPSVlQa0UzUT09IiwiUmVmcmVzaFRva2VuRXhwaXJlcyI6IjMvMjUvMjAyNiAxMDowMTo1NCBBTSIsIm5iZiI6MTc3NDQyNTcxNCwiZXhwIjoxNzc0NDI5MzE0LCJpYXQiOjE3NzQ0MjU3MTQsImlzcyI6IlNUQVRJTS5Db21tb24uV2ViQVBJIiwiYXVkIjoiaHR0cDovL2xvY2FsaG9zdDo4MDAxIn0.AwlMNJ06o2oiCNBq_UqV5Y1ol5wmoV_YQPTt8dj4CSs";

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
    console.error('❌ Decryption failed:', error.message);
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
  console.log('🔄 Refreshing token...\n');
  
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
      console.error('❌ Token refresh failed - Status:', response.statusCode);
      console.error('Response:', response.data);
      return null;
    }

    const decrypted = decrypt(response.data);
    if (!decrypted) {
      console.error('❌ Could not decrypt token response');
      return null;
    }

    console.log('✅ Token refreshed successfully!');
    console.log(`📊 New token expires at: ${decrypted.RefreshTokenExpires}`);
    
    return decrypted.tokenValue || CURRENT_TOKEN;
  } catch (error) {
    console.error('❌ Token refresh error:', error.message);
    return null;
  }
}

async function fetchManufacturers(token) {
  console.log('\n📡 Fetching manufacturer data...\n');
  
  const payload = {
    request: {
      StateCode: '00',
      DistrictCode: null,
      TalkerName: null,
      ModelId: null
    }
  };

  const body = JSON.stringify(payload);
  
  const headers = {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
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
      body
    );

    if (response.statusCode !== 200) {
      console.error('❌ API call failed - Status:', response.statusCode);
      console.error('Response:', response.data);
      return false;
    }

    console.log('✅ Received encrypted response');
    console.log('📦 Response length:', response.data.length, 'characters\n');

    const decrypted = decrypt(response.data);
    if (!decrypted) {
      return false;
    }

    console.log('✨ Decryption successful!');
    console.log('📊 Data structure:', Object.keys(decrypted));
    
    if (decrypted.Result === 'Success') {
      console.log('\n✅ API returned success!');
      console.log('\n📋 Manufacturers found:', decrypted.Data ? decrypted.Data.length : 0);
      
      if (decrypted.Data && decrypted.Data.length > 0) {
        console.log('\n🚗 Sample manufacturers:');
        decrypted.Data.slice(0, 5).forEach((m, i) => {
          console.log(`  ${i + 1}. ${m.ManufacturerName || m.name || 'Unknown'} (ID: ${m.ManufacturerId || m.id})`);
        });
      }
    } else {
      console.log('\n⚠️ API returned:', decrypted.Result);
      console.log('Message:', decrypted.ResultMessage);
    }

    fs.writeFileSync('/Users/apple/js_scrapper/data/manufacturers_decrypted.json', JSON.stringify(decrypted, null, 2));
    console.log('\n💾 Full response saved to: data/manufacturers_decrypted.json');
    
    return true;
  } catch (error) {
    console.error('❌ Request error:', error.message);
    return false;
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Shriram API - Manufacturer Data Fetcher                   ║');
  console.log('║  Encryption Key: b14ca5898a4e4133bbce2ea2315a1916         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const newToken = await refreshToken();
  if (!newToken) {
    console.error('\n❌ Failed to refresh token. Cannot proceed.');
    process.exit(1);
  }

  const success = await fetchManufacturers(newToken);
  
  if (success) {
    console.log('\n✅ Operation completed successfully!');
    process.exit(0);
  } else {
    console.error('\n❌ Operation failed.');
    process.exit(1);
  }
}

main();
