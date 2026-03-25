const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const APIDecryptor = require('./apiDecryptor');

class DirectAPIFetcher {
  constructor() {
    this.browser = null;
    this.page = null;
    this.encryptedResponses = [];
    this.dataDir = path.join(__dirname, '../data');
  }

  async init() {
    this.browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox']
    });
    this.page = await this.browser.newPage();
    
    await this.setupNetworkInterception();
  }

  async setupNetworkInterception() {
    await this.page.on('response', async (response) => {
      const url = response.url();
      
      if (url.includes('LoadManufacturer') || url.includes('loadManufacturer')) {
        console.log('\n🎯 INTERCEPTED TARGET API CALL');
        console.log('URL:', url);
        console.log('Status:', response.status());
        
        try {
          const text = await response.text();
          console.log('Response length:', text.length);
          console.log('First 100 chars:', text.substring(0, 100));
          
          this.encryptedResponses.push({
            url,
            encryptedData: text,
            timestamp: new Date().toISOString()
          });

          console.log('\n🔐 Encrypted data captured and stored');
        } catch (error) {
          console.error('Error reading response:', error.message);
        }
      }
    });
  }

  async goToWebsite() {
    console.log('🌐 Loading website...');
    await this.page.goto('https://novaconnector.shriramgi.com/novaconnect/Dashboard/CreateNewQuotation', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    console.log('✓ Website loaded');
  }

  async triggerAPICall() {
    console.log('\n⏳ Waiting for API call to be triggered...');
    console.log('Please interact with the page to trigger manufacturer loading');
    console.log('(Looking for LoadManufacturer API call...)\n');

    await new Promise(resolve => setTimeout(resolve, 5000));

    const triggered = await this.page.evaluate(() => {
      const elements = document.querySelectorAll('button, select, input[type="search"]');
      console.log('Found interactive elements:', elements.length);
      
      for (let el of elements) {
        if (el.textContent.toLowerCase().includes('manufacturer') || 
            el.id.toLowerCase().includes('manufacturer') ||
            el.name.toLowerCase().includes('manufacturer')) {
          console.log('Found manufacturer element:', el.tagName);
          return true;
        }
      }
      return false;
    });

    if (triggered) {
      console.log('✓ Found manufacturer-related elements on page');
    }
  }

  async makeDirectAPICall() {
    console.log('\n🚀 Making direct API call...');
    
    const result = await this.page.evaluate(async () => {
      try {
        const response = await fetch(
          'https://nsecureapi.shriramgi.com/StatimConnectProposal/Proposal/Vehicle/LoadManufacturer',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': '*/*',
              'Accept-Language': 'en-US,en;q=0.6'
            },
            credentials: 'include',
            body: JSON.stringify({})
          }
        );

        const text = await response.text();
        return {
          status: response.status,
          headers: Object.fromEntries(response.headers),
          body: text.substring(0, 500)
        };
      } catch (error) {
        return { error: error.message };
      }
    });

    return result;
  }

  async extractKeyFromResponse() {
    console.log('\n🔍 Analyzing intercepted responses...');
    
    if (this.encryptedResponses.length === 0) {
      console.log('⚠ No encrypted responses captured');
      return null;
    }

    const encryptedData = this.encryptedResponses[0].encryptedData;
    console.log('Encrypted data length:', encryptedData.length);

    const keyPatterns = [
      'pass123',
      'shriram123',
      'ZxV__ZA_KEY',
      Buffer.alloc(32, 'pass#1234').toString('hex')
    ];

    for (let key of keyPatterns) {
      console.log(`\nTrying key: ${key.substring(0, 20)}...`);
      const decrypted = APIDecryptor.decrypt(encryptedData, key);
      if (decrypted) {
        console.log('✓ DECRYPTED SUCCESSFULLY!');
        return { key, data: decrypted };
      }
    }

    return null;
  }

  async saveData(data, filename) {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }

      const filepath = path.join(this.dataDir, filename);
      fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
      console.log(`✓ Data saved to ${filepath}`);
    } catch (error) {
      console.error('Error saving data:', error.message);
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('\n👋 Browser closed');
    }
  }

  async run() {
    try {
      console.log('🚀 Starting Direct API Fetcher\n');
      
      await this.init();
      await this.goToWebsite();
      
      await this.triggerAPICall();

      const directResult = await this.makeDirectAPICall();
      console.log('\nDirect API Call Result:');
      console.log(JSON.stringify(directResult, null, 2));

      if (this.encryptedResponses.length > 0) {
        console.log('\n✓ Captured encrypted response');
        const extracted = await this.extractKeyFromResponse();
        
        if (extracted) {
          console.log('\n✅ Successfully decrypted data!');
          console.log('Found key:', extracted.key);
          await this.saveData(extracted.data, `manufacturers_decrypted_${Date.now()}.json`);
        } else {
          console.log('\n⚠ Could not decrypt with known keys');
          await this.saveData(
            { encryptedResponses: this.encryptedResponses },
            `encrypted_responses_${Date.now()}.json`
          );
        }
      }

    } catch (error) {
      console.error('💥 Error:', error.message);
      console.error(error.stack);
    } finally {
      await this.close();
    }
  }
}

const fetcher = new DirectAPIFetcher();
fetcher.run();
