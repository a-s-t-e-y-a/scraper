const puppeteer = require('puppeteer');
const APIDecryptor = require('./apiDecryptor');

class ShriramScraper {
  constructor(encryptionKey) {
    this.encryptionKey = encryptionKey;
    this.browser = null;
    this.page = null;
    this.interceptedRequests = [];
  }

  async init() {
    this.browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox']
    });
    this.page = await this.browser.newPage();
    
    await this.setupRequestInterception();
  }

  async setupRequestInterception() {
    await this.page.on('response', async (response) => {
      const url = response.url();
      
      if (url.includes('/api/') || url.includes('/Api/')) {
        const contentType = response.headers()['content-type'] || '';
        
        if (contentType.includes('application/json')) {
          try {
            const bodyText = await response.text();
            
            console.log(`\n📡 Intercepted: ${response.request().method()} ${url}`);
            console.log(`Status: ${response.status()}`);
            
            if (bodyText && bodyText.length > 0 && !bodyText.startsWith('{')) {
              console.log(`🔐 Response is encrypted (${bodyText.length} chars)`);
              
              const decrypted = APIDecryptor.decrypt(bodyText, this.encryptionKey);
              if (decrypted) {
                console.log('✓ Decryption successful!');
                console.log('Decrypted data:', JSON.stringify(decrypted, null, 2));
              } else {
                console.log('✗ Decryption failed - key might be incorrect');
              }
            } else if (bodyText) {
              console.log('📄 Response is plain JSON (not encrypted)');
              console.log(JSON.parse(bodyText));
            }
            
            this.interceptedRequests.push({
              url,
              method: response.request().method(),
              status: response.status(),
              encrypted: !bodyText.startsWith('{'),
              rawResponse: bodyText.substring(0, 100)
            });
          } catch (error) {
            console.error('Error processing response:', error.message);
          }
        }
      }
    });
  }

  async login(credentials) {
    console.log('🔐 Attempting login...');
    
    await this.page.goto('https://novaconnector.shriramgi.com/novaconnect/Dashboard/CreateNewQuotation', {
      waitUntil: 'networkidle2'
    });

    await this.page.type('[name="userId"]', credentials.userId);
    await this.page.type('[name="password"]', credentials.password);
    
    await this.page.click('button[type="submit"]');
    await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
  }

  async fetchManufacturers() {
    console.log('📦 Fetching manufacturers...');
    
    const response = await this.page.evaluate(() => {
      return fetch('https://nsecureapi.shriramgi.com/StatimConnectProposal/Proposal/Vehicle/LoadManufacturer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({})
      }).then(r => r.text());
    });

    return response;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  getInterceptedRequests() {
    return this.interceptedRequests;
  }
}

module.exports = ShriramScraper;
