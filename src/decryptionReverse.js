const puppeteer = require('puppeteer');
const fs = require('fs');

async function findDecryptionLogic() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  
  let scriptSources = [];
  let networkRequests = [];

  page.on('response', async (response) => {
    const url = response.url();
    const contentType = response.headers()['content-type'] || '';
    
    if (url.includes('/api/') || url.includes('/Api/')) {
      networkRequests.push({
        url,
        status: response.status(),
        contentType,
        method: response.request().method()
      });
    }
  });

  page.on('framenavigated', async (frame) => {
    try {
      const scripts = await page.$$eval('script', elements => 
        elements
          .filter(el => el.src)
          .map(el => el.src)
      );
      scriptSources = [...new Set([...scriptSources, ...scripts])];
    } catch (e) {
      console.log('Error extracting scripts:', e.message);
    }
  });

  await page.goto('https://novaconnector.shriramgi.com/novaconnect/Dashboard/CreateNewQuotation', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });

  console.log('=== EXTERNAL SCRIPTS LOADED ===');
  scriptSources.forEach(src => console.log(src));

  console.log('\n=== API ENDPOINTS DETECTED ===');
  networkRequests.forEach(req => {
    console.log(`${req.method} ${req.url} (${req.status})`);
  });

  const pageSource = await page.content();
  
  const cryptoLibMatches = pageSource.match(/crypto-js|aes|encrypt|decrypt|cipher/gi);
  console.log('\n=== CRYPTO REFERENCES ===');
  if (cryptoLibMatches) {
    console.log('Found crypto references:', [...new Set(cryptoLibMatches)]);
  }

  if (pageSource.includes('crypto-js')) {
    console.log('\n✓ crypto-js library is being used');
  }
  if (pageSource.includes('TweetNaCl') || pageSource.includes('nacl')) {
    console.log('\n✓ NaCl/TweetNaCl is being used');
  }

  fs.writeFileSync('/Users/apple/js_scrapper/debug/page_source.html', pageSource);
  console.log('\nFull page source saved to: debug/page_source.html');

  await browser.close();
}

findDecryptionLogic().catch(console.error);
