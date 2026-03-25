const puppeteer = require('puppeteer');

async function extractEncryptionKey() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();

  try {
    await page.goto('https://novaconnector.shriramgi.com/novaconnect/Dashboard/CreateNewQuotation', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    const encryptionKey = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script');
      let keyValue = null;

      for (let script of scripts) {
        const content = script.textContent;
        
        if (content.includes('ZxV__ZA')) {
          try {
            const match = content.match(/ZxV__ZA\s*:\s*["']([^"']+)["']/);
            if (match && match[1]) {
              keyValue = match[1];
              break;
            }
          } catch (e) {
            continue;
          }
        }
      }

      if (!keyValue) {
        try {
          eval(content);
          if (typeof Rr !== 'undefined' && Rr.ZxV__ZA) {
            keyValue = Rr.ZxV__ZA;
          }
        } catch (e) {
          console.log('Could not extract from eval');
        }
      }

      return keyValue;
    });

    if (encryptionKey) {
      console.log('✓ Encryption Key Found:', encryptionKey);
      console.log('Key Length:', encryptionKey.length, 'characters');
    } else {
      console.log('✗ Could not extract encryption key from the website');
      console.log('Check the page source manually or use browser DevTools');
    }

  } catch (error) {
    console.error('Error extracting key:', error.message);
  } finally {
    await browser.close();
  }
}

extractEncryptionKey().catch(console.error);
