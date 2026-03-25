const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const APIDecryptor = require('./apiDecryptor');

class ManufacturerFetcher {
  constructor() {
    this.browser = null;
    this.page = null;
    this.encryptionKey = null;
    this.jwtToken = null;
    this.dataDir = path.join(__dirname, '../data');
  }

  async init() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox']
    });
    this.page = await this.browser.newPage();
  }

  async extractEncryptionKey() {
    console.log('🔍 Extracting encryption key...');
    
    await this.page.goto('https://novaconnector.shriramgi.com/novaconnect/Dashboard/CreateNewQuotation', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    const key = await this.page.evaluate(() => {
      let foundKey = null;

      try {
        if (typeof window.Rr !== 'undefined' && window.Rr.ZxV__ZA) {
          foundKey = window.Rr.ZxV__ZA;
        }
      } catch (e) {
        console.log('Rr object not found');
      }

      if (!foundKey) {
        const scripts = document.querySelectorAll('script');
        for (let script of scripts) {
          const content = script.textContent;
          const match = content.match(/ZxV__ZA\s*[:=]\s*["']([^"']+)["']/);
          if (match && match[1] && match[1].length >= 32) {
            foundKey = match[1].substring(0, 32);
            break;
          }
        }
      }

      return foundKey;
    });

    if (key) {
      this.encryptionKey = key;
      console.log('✓ Key extracted:', key);
      return key;
    } else {
      console.log('✗ Could not extract key from website');
      return null;
    }
  }

  async extractJWTToken() {
    console.log('🔑 Extracting JWT Token...');
    
    const token = await this.page.evaluate(() => {
      return sessionStorage.getItem('token') || localStorage.getItem('token');
    });

    if (token) {
      this.jwtToken = token;
      console.log('✓ JWT Token found');
      return token;
    } else {
      console.log('⚠ No JWT token found in storage');
      return null;
    }
  }

  async fetchManufacturerData() {
    if (!this.encryptionKey) {
      console.error('❌ Encryption key not available. Cannot decrypt responses.');
      return null;
    }

    console.log('\n📦 Fetching manufacturer... from API');

    try {
      const response = await this.page.evaluate(async () => {
        const headers = {
          'Content-Type': 'application/json',
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
        };

        const token = sessionStorage.getItem('token');
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const apiResponse = await fetch(
          'https://nsecureapi.shriramgi.com/StatimConnectProposal/Proposal/Vehicle/LoadManufacturer',
          {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({}),
            credentials: 'include'
          }
        );

        return await apiResponse.text();
      });

      console.log('✓ API Response received');
      
      if (response && response.length > 0) {
        console.log(`Response length: ${response.length} characters`);
        
        if (response.startsWith('{')) {
          console.log('📄 Response is plain JSON (not encrypted)');
          return JSON.parse(response);
        } else {
          console.log('🔐 Response is encrypted, attempting decryption...');
          const decrypted = APIDecryptor.decrypt(response, this.encryptionKey);
          
          if (decrypted) {
            console.log('✓ Decryption successful!');
            return decrypted;
          } else {
            console.log('✗ Decryption failed');
            return null;
          }
        }
      }
    } catch (error) {
      console.error('❌ API Error:', error.message);
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
      return filepath;
    } catch (error) {
      console.error('❌ Error saving data:', error.message);
      return null;
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
      console.log('🚀 Starting Manufacturer Fetcher\n');
      
      await this.init();
      console.log('✓ Browser initialized\n');

      const key = await this.extractEncryptionKey();
      if (!key) {
        console.log('\n⚠ Cannot proceed without encryption key');
        await this.close();
        return;
      }

      await this.extractJWTToken();

      const manufacturerData = await this.fetchManufacturerData();
      
      if (manufacturerData) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `manufacturers_${timestamp}.json`;
        await this.saveData(manufacturerData, filename);
        
        console.log('\n✅ Fetch successful!');
        console.log('Data structure:', JSON.stringify(manufacturerData, null, 2).substring(0, 500) + '...');
      } else {
        console.log('\n❌ Failed to fetch manufacturer data');
      }

      await this.close();
    } catch (error) {
      console.error('💥 Fatal error:', error.message);
      await this.close();
    }
  }
}

const fetcher = new ManufacturerFetcher();
fetcher.run().catch(console.error);
