const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const APIDecryptor = require('./apiDecryptor');

class ComprehensiveFetcher {
  constructor() {
    this.browser = null;
    this.page = null;
    this.debugDir = path.join(__dirname, '../debug');
    this.capturedResponses = [];
    this.jsFiles = [];
  }

  async init() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox']
    });
    this.page = await this.browser.newPage();
    
    this.setupInterception();
  }

  setupInterception() {
    this.page.on('response', async (response) => {
      const url = response.url();
      
      if (url.includes('.js')) {
        try {
          const text = await response.text();
          this.jsFiles.push({ url, size: text.length, content: text });
          console.log(`📦 Captured JS: ${url.split('/').pop()} (${text.length} bytes)`);
        } catch (e) {}
      }
      
      if (url.includes('LoadManufacturer') || url.includes('loadManufacturer')) {
        try {
          const text = await response.text();
          this.capturedResponses.push({
            url,
            data: text,
            isBase64: !text.startsWith('{')
          });
          console.log(`\n🎯 API Response: ${text.length} bytes (${text.startsWith('{') ? 'JSON' : 'Encrypted'})`);
        } catch (e) {}
      }
    });
  }

  async loadWebsite() {
    console.log('🌐 Loading website...\n');
    try {
      await this.page.goto('https://novaconnector.shriramgi.com/novaconnect/Dashboard/CreateNewQuotation', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      console.log('✓ Website loaded\n');
    } catch (error) {
      console.error('Load error:', error.message);
    }
  }

  async extractKeyFromJS() {
    console.log('🔍 Searching for encryption key in JavaScript files...\n');
    
    const keyPatterns = [
      /ZxV__ZA\s*[:=]\s*["']([^"']{20,})["']/,
      /encryptionKey\s*[:=]\s*["']([^"']{20,})["']/,
      /["']([a-zA-Z0-9+/=]{40,})["'].*encrypt/i,
      /const\s+\w+\s*=\s*["']([A-Za-z0-9]{32})["']/
    ];

    for (let jsFile of this.jsFiles) {
      if (jsFile.url.includes('index') && jsFile.size > 100000) {
        console.log(`\n📄 Analyzing ${jsFile.url.split('/').pop()}...`);
        
        for (let pattern of keyPatterns) {
          const match = jsFile.content.match(pattern);
          if (match && match[1]) {
            const key = match[1].substring(0, 32);
            console.log(`✓ Found potential key: ${key}`);
            return key;
          }
        }
      }
    }

    return null;
  }

  async makeAPICall() {
    console.log('\n📡 Making API call...');
    
    const result = await this.page.evaluate(async () => {
      const resp = await fetch(
        'https://nsecureapi.shriramgi.com/StatimConnectProposal/Proposal/Vehicle/LoadManufacturer',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': '*/*'
          },
          body: JSON.stringify({})
        }
      );
      return await resp.text();
    });

    console.log(`Response: ${result.length} bytes`);
    return result;
  }

  async decryptResponse(encryptedData, possibleKey) {
    console.log('\n🔐 Attempting decryption...');
    
    const keyCandidates = [
      possibleKey,
      'pass123',
      'shriram',
      'Shriram@123',
      Buffer.alloc(32, 'key').toString('hex'),
      Buffer.from('12345678901234567890123456789012').toString('hex')
    ].filter(k => k);

    for (let key of keyCandidates) {
      console.log(`Trying: ${typeof key === 'string' ? key.substring(0, 20) : 'binary'}...`);
      const result = APIDecryptor.decrypt(encryptedData, key);
      if (result) {
        console.log('✓ DECRYPTED!');
        return result;
      }
    }

    console.log('✗ Decryption failed with all candidates');
    return null;
  }

  async saveLogs() {
    if (!fs.existsSync(this.debugDir)) {
      fs.mkdirSync(this.debugDir, { recursive: true });
    }

    if (this.jsFiles.length > 0) {
      const indexJS = this.jsFiles.find(f => f.url.includes('index'));
      if (indexJS) {
        fs.writeFileSync(
          path.join(this.debugDir, 'index-bundle.js'),
          indexJS.content
        );
        console.log('✓ Saved index bundle to debug folder');
      }
    }

    if (this.capturedResponses.length > 0) {
      fs.writeFileSync(
        path.join(this.debugDir, 'api-responses.json'),
        JSON.stringify(this.capturedResponses, null, 2)
      );
      console.log('✓ Saved API responses');
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      console.log('🚀 Comprehensive Fetcher\n');
      
      await this.init();
      await this.loadWebsite();
      
      await new Promise(r => setTimeout(r, 3000));
      
      const foundKey = await this.extractKeyFromJS();
      
      const apiResponse = await this.makeAPICall();
      
      if (apiResponse && !apiResponse.startsWith('{')) {
        const decrypted = await this.decryptResponse(apiResponse, foundKey);
        
        if (decrypted) {
          console.log('\n✅ SUCCESS!');
          console.log(JSON.stringify(decrypted, null, 2).substring(0, 500));
        }
      } else if (apiResponse && apiResponse.startsWith('{')) {
        console.log('Response is plain JSON:');
        console.log(JSON.stringify(JSON.parse(apiResponse), null, 2).substring(0, 500));
      }

      await this.saveLogs();
      
    } catch (error) {
      console.error('Error:', error.message);
    } finally {
      await this.close();
    }
  }
}

const fetcher = new ComprehensiveFetcher();
fetcher.run().catch(console.error);
