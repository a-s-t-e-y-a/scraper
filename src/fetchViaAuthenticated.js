const { launchBrowser } = require('./browser');
const { injectSession } = require('./auth');
const crypto = require('crypto');
const fs = require('fs');
const https = require('https');

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

async function fetchWithBrowserToken() {
  console.log('🚀 Initializing browser for authenticated session...\n');
  
  const browser = await launchBrowser();
  let token = null;
  
  try {
    const page = await browser.newPage();
    
    page.on('response', async (response) => {
      if (response.url().includes('LoadManufacturer')) {
        const text = await response.text();
        console.log('\n✅ Intercepted LoadManufacturer response');
        console.log('📦 Encrypted response length:', text.length);
        
        const decrypted = decrypt(text);
        if (decrypted) {
          console.log('✨ Decryption successful!');
          console.log('📊 Data keys:', Object.keys(decrypted));
          console.log('\n📋 Response:');
          console.log(JSON.stringify(decrypted, null, 2));
          
          fs.writeFileSync('/Users/apple/js_scrapper/data/manufacturers_from_browser.json', JSON.stringify(decrypted, null, 2));
          console.log('\n💾 Saved to: data/manufacturers_from_browser.json');
        }
      }
    });
    
    console.log('🌐 Navigating to Shriram website...');
    await page.goto('https://novaconnector.shriramgi.com/novaconnect/Dashboard/CreateNewQuotation', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('✅ Page loaded');
    console.log('⏳ Waiting for LoadManufacturer API call...');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await browser.close();
    console.log('\n✅ Browser session closed');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    try {
      await browser.close();
    } catch (e) {}
  }
}

fetchWithBrowserToken();
