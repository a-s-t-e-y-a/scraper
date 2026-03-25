const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'index-key.js');
const content = fs.readFileSync(filePath, 'utf-8');

console.log('📊 Analyzing index-key.js\n');
console.log('File size:', (content.length / 1024 / 1024).toFixed(2), 'MB');

const searchPatterns = [
  {
    name: 'ZxV__ZA (Encryption Key)',
    patterns: [
      /ZxV__ZA\s*[:=]\s*["']([^"']{20,})["']/,
      /ZxV__ZA\s*[:=]\s*["']([^"']+)["']/
    ]
  },
  {
    name: 'API Endpoints',
    patterns: [
      /["'](https?:\/\/[^"']*api[^"']*)['"]/gi,
      /["'](\/[a-zA-Z0-9]*api[^"']*)['"]/gi,
      /LoadManufacturer/g,
      /nsecureapi/gi
    ]
  },
  {
    name: 'Encryption Variables',
    patterns: [
      /const.*encrypt.*=.*["']([^"']{20,})["']/gi,
      /const.*key.*=.*["']([^"']{20,})["']/gi,
      /const.*IV.*=.*["']([^"']+)["']/gi
    ]
  },
  {
    name: 'AES/Crypto References',
    patterns: [
      /aes-256/gi,
      /aes-128/gi,
      /createCipheriv/gi,
      /createDecipheriv/gi,
      /CryptoJS/g
    ]
  }
];

const results = {};

for (let search of searchPatterns) {
  console.log(`\n🔍 Searching for: ${search.name}`);
  results[search.name] = [];
  
  for (let pattern of search.patterns) {
    let matches;
    if (typeof pattern === 'string') {
      const regex = new RegExp(pattern, 'gi');
      matches = content.matchAll(regex);
    } else {
      matches = [content.match(pattern)];
    }
    
    for (let match of matches) {
      if (match) {
        const matchValue = match[1] || match[0];
        if (matchValue && matchValue.length > 5) {
          results[search.name].push(matchValue.substring(0, 100));
        }
      }
    }
  }
  
  if (results[search.name].length > 0) {
    console.log(`  Found ${results[search.name].length} matches`);
    results[search.name].slice(0, 3).forEach(m => {
      console.log(`    - ${m}`);
    });
  }
}

console.log('\n' + '='.repeat(80));

const keyMatch = content.match(/ZxV__ZA\s*[:=]\s*["']([^"']+)["']/);
if (keyMatch && keyMatch[1]) {
  const key = keyMatch[1];
  console.log('\n✅ ENCRYPTION KEY FOUND!');
  console.log('Key:', key);
  console.log('Length:', key.length);
  
  fs.writeFileSync(
    path.join(__dirname, 'encryption-key.txt'),
    key
  );
  console.log('\n✓ Key saved to encryption-key.txt');
}

const apiMatches = content.match(/nsecureapi[^"']*/gi);
if (apiMatches) {
  console.log('\n✅ API ENDPOINTS FOUND!');
  [...new Set(apiMatches)].slice(0, 5).forEach(api => {
    console.log(' -', api);
  });
}

const loadMfgMatches = content.match(/LoadManufacturer[^"']*/g);
if (loadMfgMatches) {
  console.log('\n✅ LOADMANUFACTURER REFERENCES!');
  [...new Set(loadMfgMatches)].slice(0, 3).forEach(m => {
    console.log(' -', m);
  });
}
