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
  console.log('🔄 Refreshing token...');
  
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
      console.error('❌ Token refresh failed');
      return CURRENT_TOKEN;
    }

    const decrypted = decrypt(response.data);
    if (!decrypted || !decrypted.tokenValue) {
      return CURRENT_TOKEN;
    }

    console.log('✅ Token refreshed\n');
    return decrypted.tokenValue;
  } catch (error) {
    console.error('⚠️ Token refresh error:', error.message);
    return CURRENT_TOKEN;
  }
}

async function fetchManufacturers(token, startIndex = 0, pageSize = 50) {
  const payload = {
    getManufacturerDetailsRequest: {
      productCode: "MOT-PRD-001",
      productClass: "CLASS_3",
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
      console.error(`❌ API error - Status: ${response.statusCode}`);
      return null;
    }

    const decrypted = decrypt(response.data);
    if (!decrypted || !decrypted.allManufacturerResponse) {
      return null;
    }

    return decrypted.allManufacturerResponse;
  } catch (error) {
    console.error('❌ Request error:', error.message);
    return null;
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Shriram API - Complete Manufacturer Data Fetcher          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const token = await refreshToken();
  let allManufacturers = [];
  let pageIndex = 0;
  const pageSize = 100;
  let hasMore = true;
  let pageCount = 0;

  console.log('📥 Fetching manufacturers...\n');

  while (hasMore) {
    pageCount++;
    const startIndex = pageIndex * pageSize;
    
    console.log(`  Page ${pageCount} (offset: ${startIndex})...`);
    
    const result = await fetchManufacturers(token, startIndex, pageSize);
    
    if (!result) {
      console.log('  ⚠️ Failed to fetch page');
      break;
    }

    const serviceResponse = result.serviceResponse;
    if (serviceResponse.result !== 'Success') {
      console.log(`  ⚠️ API returned: ${serviceResponse.result} - ${serviceResponse.resultMessage}`);
      if (allManufacturers.length === 0) {
        break;
      }
    }

    if (result.getManufacturerResponse && result.getManufacturerResponse.length > 0) {
      const manufacturers = result.getManufacturerResponse;
      allManufacturers = allManufacturers.concat(manufacturers);
      
      const totalRows = manufacturers.length > 0 ? manufacturers[0].totalRows : 0;
      console.log(`    ✓ Retrieved ${manufacturers.length} manufacturers (Total available: ${totalRows})`);
      
      if (manufacturers.length < pageSize) {
        hasMore = false;
      } else {
        pageIndex++;
        await new Promise(r => setTimeout(r, 500));
      }
    } else {
      hasMore = false;
    }
  }

  if (allManufacturers.length > 0) {
    console.log(`\n✅ Fetch complete!\n`);
    console.log(`📊 Summary:`);
    console.log(`  Total manufacturers: ${allManufacturers.length}`);
    console.log(`  Pages fetched: ${pageCount}`);

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `/Users/apple/js_scrapper/manufacturers_data/manufacturers_${timestamp}.json`;
    
    fs.writeFileSync(filename, JSON.stringify({
      fetchDate: new Date().toISOString(),
      totalCount: allManufacturers.length,
      pagesCount: pageCount,
      data: allManufacturers
    }, null, 2));

    console.log(`\n💾 Saved to: manufacturers_data/manufacturers_${timestamp}.json`);

    const summaryFile = `/Users/apple/js_scrapper/manufacturers_data/summary.json`;
    fs.writeFileSync(summaryFile, JSON.stringify({
      lastFetch: new Date().toISOString(),
      totalManufacturers: allManufacturers.length,
      files: [`manufacturers_${timestamp}.json`]
    }, null, 2));

    console.log(`📋 Summary saved to: manufacturers_data/summary.json`);

    const csvContent = [
      ['Row Num', 'Manufacturer ID', 'Manufacturer Name', 'Manufacturer Code'].join(','),
      ...allManufacturers.map(m => [
        m.row_num || '',
        m.manfacturerID || '',
        `"${(m.manfacturerName || '').replace(/"/g, '""')}"`,
        m.manfacturerCode || ''
      ].join(','))
    ].join('\n');

    const csvFile = `/Users/apple/js_scrapper/manufacturers_data/manufacturers_${timestamp}.csv`;
    fs.writeFileSync(csvFile, csvContent);
    console.log(`📊 CSV saved to: manufacturers_data/manufacturers_${timestamp}.csv`);

    console.log('\n✨ All done!');
  } else {
    console.error('\n❌ No manufacturers fetched');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
