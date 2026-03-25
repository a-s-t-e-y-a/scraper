const puppeteer = require('puppeteer');

async function findEncryptionKey() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();

  try {
    console.log('🌐 Loading website...');
    await page.goto('https://novaconnector.shriramgi.com/novaconnect/Dashboard/CreateNewQuotation', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('\n📜 Extracting from page content...\n');

    const result = await page.evaluate(() => {
      const pageSource = document.documentElement.outerHTML;
      
      console.log('Total page source length:', pageSource.length);

      const patterns = [
        /ZxV__ZA\s*[:=]\s*["']([A-Za-z0-9\+\/\=]{32,})["']/,
        /key\s*[:=]\s*["']([A-Za-z0-9]{32})["']/,
        /encryptionKey\s*[:=]\s*["']([^"']{32})["']/
      ];

      let foundKey = null;
      let matchDetails = [];

      for (let pattern of patterns) {
        const match = pageSource.match(pattern);
        if (match && match[1]) {
          matchDetails.push({
            pattern: pattern.toString(),
            match: match[1].substring(0, 50) + '...'
          });
          if (match[1].length >= 32 && !foundKey) {
            foundKey = match[1].substring(0, 32);
          }
        }
      }

      return {
        foundKey,
        matchDetails,
        windowKeys: Object.keys(window).filter(k => k.includes('crypto') || k.includes('key') || k.includes('Rr') || k.includes('ZxV'))
      };
    });

    console.log('🔑 Found Keys:');
    console.log('  - Key:', result.foundKey || 'NOT FOUND');
    console.log('  - Matches found:', result.matchDetails.length);
    console.log('  - Window keys with "crypto/key":', result.windowKeys);

    if (!result.foundKey) {
      console.log('\n🔍 Deep searching in scripts...');
      
      const deepResult = await page.evaluate(() => {
        const scripts = document.querySelectorAll('script');
        const allText = Array.from(scripts)
          .map(s => s.textContent)
          .join('\n');

        const searchPatterns = [
          { name: 'ZxV__ZA pattern', regex: /ZxV__ZA\s*[:=]\s*["']([^"']{20,})["']/ },
          { name: '32-char hex', regex: /["']([a-f0-9]{32})["']/ },
          { name: 'base64 32+', regex: /["']([A-Za-z0-9+\/]{32,})["']/ }
        ];

        const results = {};
        for (let pattern of searchPatterns) {
          const matches = allText.match(pattern.regex);
          if (matches) {
            results[pattern.name] = matches[1].substring(0, 50);
          }
        }

        return {
          allScriptLength: allText.length,
          results,
          firstKeyMatch: allText.match(/ZxV__ZA\s*[:=]\s*["']([^"']+)["']/)?.[1]
        };
      });

      console.log('Deep search results:');
      console.log(JSON.stringify(deepResult, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

findEncryptionKey();
