const puppeteer = require('puppeteer');
const fs = require('fs');

async function extractKeyFromNetwork() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  let capturedKey = null;
  let capturedResponses = [];

  page.on('response', async (response) => {
    const url = response.url();
    
    if (url.includes('api') || url.includes('Api')) {
      try {
        const text = await response.text();
        capturedResponses.push({
          url: url.substring(0, 100),
          length: text.length,
          isJson: text.startsWith('{'),
          sample: text.substring(0, 100)
        });
      } catch (e) {
        console.log('Could not read response');
      }
    }
  });

  try {
    console.log('🌐 Loading website...');
    await page.goto('https://novaconnector.shriramgi.com/novaconnect/Dashboard/CreateNewQuotation', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('✓ Page loaded\n');

    const allData = await page.evaluate(() => {
      const data = {
        rr: null,
        window: null,
        localStorage: null,
        sessionStorage: null,
        allWindowKeys: [],
        suspectKeys: []
      };

      try {
        data.rr = typeof Rr !== 'undefined' ? Object.keys(Rr).slice(0, 20) : null;
      } catch (e) {}

      try {
        data.localStorage = {
          keys: Object.keys(localStorage),
          values: {}
        };
        for (let key of Object.keys(localStorage)) {
          const val = localStorage[key];
          if (val && val.length < 100) {
            data.localStorage.values[key] = val;
          }
        }
      } catch (e) {}

      try {
        data.sessionStorage = {
          keys: Object.keys(sessionStorage),
          values: {}
        };
        for (let key of Object.keys(sessionStorage)) {
          const val = sessionStorage[key];
          if (val && val.length < 200) {
            data.sessionStorage.values[key] = val.substring(0, 100);
          }
        }
      } catch (e) {}

      data.allWindowKeys = Object.keys(window).filter(k => k.length < 30);
      
      data.suspectKeys = Object.keys(window).filter(k => 
        k.toLowerCase().includes('key') || 
        k.toLowerCase().includes('secret') || 
        k.toLowerCase().includes('cipher') ||
        k.toLowerCase().includes('encrypt')
      );

      return data;
    });

    console.log('📊 Extracted Data:\n');
    console.log('Window keys (Rr object):', allData.rr);
    console.log('\nLocalStorage:', allData.localStorage);
    console.log('\nSessionStorage:', allData.sessionStorage);
    console.log('\nSuspect window keys:', allData.suspectKeys);
    
    console.log('\n📡 Captured API Responses:');
    for (let resp of capturedResponses) {
      console.log(' -', resp);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

extractKeyFromNetwork();
