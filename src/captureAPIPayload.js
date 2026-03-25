const { launchBrowser } = require('./browser');
const crypto = require('crypto');
const fs = require('fs');

const ENCRYPTION_KEY = 'b14ca5898a4e4133bbce2ea2315a1916';
const IV = Buffer.alloc(16, 0);

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
    console.error('Decryption failed:', error.message);
    return null;
  }
}

async function captureAPICall() {
  console.log('🚀 Initializing browser...\n');
  
  const browser = await launchBrowser();
  
  try {
    const page = await browser.newPage();
    
    let apiPayload = null;
    let apiResponse = null;
    
    page.on('response', async (response) => {
      if (response.url().includes('LoadManufacturer')) {
        try {
          const text = await response.text();
          apiResponse = text;
          console.log('\n✅ Intercepted LoadManufacturer response');
          console.log('📦 Encrypted response length:', text.length);
          
          const decrypted = decrypt(text);
          if (decrypted) {
            console.log('✨ Decryption successful!');
            console.log('\n📋 Full decrypted response:');
            console.log(JSON.stringify(decrypted, null, 2));
          }
        } catch (e) {
          console.error('Error processing response:', e.message);
        }
      }
    });
    
    page.on('request', async (request) => {
      if (request.url().includes('LoadManufacturer')) {
        try {
          apiPayload = request.postData();
          console.log('\n📤 Captured API Request:');
          console.log('URL:', request.url());
          console.log('Method:', request.method());
          console.log('Headers:', JSON.stringify(request.headers(), null, 2));
          console.log('Payload:', apiPayload);
        } catch (e) {
          console.error('Error capturing request:', e.message);
        }
      }
    });
    
    console.log('🌐 Navigating to Shriram website...');
    await page.goto('https://novaconnector.shriramgi.com/novaconnect/Dashboard/CreateNewQuotation', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('✅ Page loaded');
    console.log('⏳ Waiting for page to fully initialize...');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
      console.log('📍 Attempting to trigger API call by interacting with dropdowns...');
      await page.waitForSelector('select, input[type="dropdown"]', { timeout: 5000 }).catch(() => null);
      
      const firstSelect = await page.$('select');
      if (firstSelect) {
        console.log('✓ Found a select dropdown, clicking to trigger options...');
        await page.click('select');
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (e) {
      console.log('⚠️ Could not interact with dropdowns:', e.message);
    }
    
    console.log('⏳ Waiting for API calls...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    if (apiPayload) {
      console.log('\n==================== CAPTURED PAYLOAD ====================');
      const parsed = JSON.parse(apiPayload);
      console.log(JSON.stringify(parsed, null, 2));
      console.log('==========================================================\n');
      
      fs.writeFileSync('/Users/apple/js_scrapper/debug/api-payload.json', JSON.stringify(parsed, null, 2));
      console.log('💾 Payload saved to debug/api-payload.json');
    }
    
    if (apiResponse) {
      fs.writeFileSync('/Users/apple/js_scrapper/debug/api-response-encrypted.txt', apiResponse);
      console.log('💾 Encrypted response saved to debug/api-response-encrypted.txt');
    }
    
    await browser.close();
    console.log('\n✅ Browser session closed');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    try {
      await browser.close();
    } catch (e) {}
  }
}

captureAPICall();
