# 🔐 Shriram API Decryption Guide

## How the API Encryption Works

- **Cipher**: AES-256-CBC
- **Key**: 32-character string (`ZxV__ZA`)
- **IV**: 16 null bytes
- **Padding**: PKCS7
- **Library**: CryptoJS (client-side)

---

## Step 1: Extract the Encryption Key

### Method A: Browser DevTools (Recommended)

1. Open: `https://novaconnector.shriramgi.com/novaconnect/Dashboard/CreateNewQuotation`
2. Press `F12` to open DevTools → Go to **Console** tab
3. Run this code:

```javascript
// Extract from window object
console.log(window.__CONFIG__.ZxV__ZA);  // or similar

// Or search through all scripts
const scripts = document.querySelectorAll('script');
for (let script of scripts) {
  const match = script.textContent.match(/ZxV__ZA\s*:\s*["']([^"']{32})["']/);
  if (match) {
    console.log('Found key:', match[1]);
    break;
  }
}
```

4. Copy the 32-character key value

### Method B: Network Tab

1. In DevTools, go to **Network** tab
2. Go to **Application** → **Local Storage**
3. Look for stored configuration or API keys
4. Check request/response headers for encryption metadata

---

## Step 2: Update Your Scraper

Edit `apiDecryptor.js` and replace:

```javascript
const ENCRYPTION_KEY = 'YOUR_32_CHAR_KEY_HERE';
```

With the actual key you found.

---

## Step 3: Test Decryption

Create `test_decrypt.js`:

```javascript
const APIDecryptor = require('./src/apiDecryptor');

// Test with the encrypted response from API
const encryptedResponse = 'XblHaCsmqj5oz8feR2gQKBn5pSKWbjAaUI9F26ULv2smtMlhY7f3ccXF7A8sTpz9nDaEgwBVf//o6yQtk8fgGMcVbrFj6FUByb4h+bxYE1u4nwjo762gfdXYBZBuCt+P0GhthNn2hgiS+y0sFsZzBH8Ff79iSzWcXFwGgy/OTGU91BWBHaOZubhM8oPiUHo0TE+uFNJkWFxR/NeyDccuUwu/TsLLt/RxZU807ms9JTrpAEEuexwKayNLXWv1YlCuG5SwEhbWVG/fr2/yHShXOfetvfwjI1bqNMOueRnJwRQTTFaW9TjopVQhd+1oCqFOZTtezsH6IPzEKJpfufb8wqBsRpYJSEppcXQtVQF0+kHkHz06nVyvhCM4f6HTVLBytAtvFrP+u7UMB1UpT01pZ5n6EtgMaAyUt6G63TxcfF5hK8HQDoIj1KdQe6ehArrNCdH43nDGM9RuaXjSmScgPMRfWe0DJoDqmyCZ4Wco/Gb5I4y88BraEHhl9svRmRqbWqXwc4Bu+JzM30rM1Lt8uweHoIrlc6tMAsLQha++f5+enls7Y9iImLqCIRWMi2JkclIM7w+dX2Cxe8pGmXuMB5jPFkFugUz/ivUmqtAjkssPehibxDbpEin3VH2BTDy2Ey5uI+Z7hz4m+P5UXK/RNmnotnxUUorqkrA7/HJXLJFN3KbxJ1ThYOzXXbcnBMtdnaNKlf7ifDooTQJ0Fdl63m0K8zVUO4KLhdiGPD0IAjGOH1Abx69KveLwh5jYRuWU00S/rSlR/g+04YjcaCVwiIeX5vmUqPNb9JM8r96Ys4evqxCGGUypSkLseBxX/9Yq71nkQ2bNJH90BeIXpZdaMzO/4aV1w0XHfZckUAlQqS0U8LTL4MxGTzj6e3xZ1FYsQ8uMs8MjoSjGYGV1dkz6lBAPaWE9B0y6uMzlvpFpO6JgM4Tgi5NCpNCZysW1KILlRErNlJrxcA3NJvPW3S/xNFSn6RlOn0EZhwgQs4AgSNW0IXtv8ZWTa8/X00OePC9euxVkYDQji0OWOmKWox3kCrywqykgMrHT0OP85QZU+bc8zRSQKtkiU0n8jN4YT1Xi+s0SHQpWRGUj9WopZkzQ6o56nlXqEKJS3ZkV/+vxFBIxwCftTHNz4+2lL0b/8NnEEOSm1ukWZvuea1efKpWrVG082VyA5pgJyqqvWisUp8WcVNEHQnWB6+/ykxcCHYjVFGc75B5IZ5IWkUSjaKpQe6I888S93GT91PHLm+2/8EjLtqR08LY5MumrL8aMADhmu96SsHI5e7jiNFPNsubyBpME0KPIsH3ys9tUJ20rdEuhrXh+EFMAgBF55d4d+h2TPdyuK7eii2xC1OfDow5GiW6yib5NeTd9OqFx2KsdyIv+M9mhuc2ODQcd0Mc/Aj1HEogkizupM5gAdErchHlzyWk3eRkCb5oiE+gYnFw1DsfxaxjEzu3/qU3xjnrqRa0kB1ahEzEMxeBgNavpThUBhG8nIx4Zj2BwGx6YINUzNS6cbyzLCT8XbOLZOw66S4q8rpTYDuCitNtOZX/FMWGv//jWMpG49pQhR3Xa7Pk/fOLHrOywcVGWQA/3+FOgjSJEOagxWnO26BsH0g3p5OvuizC0DttyIvQRA/P6m/y7g7jN/A67QJq0L+UzeHC+sd4fI3772vmXUwzSdgpu3pylH1EW1P4mUwMCIs3l9MoVfhwKfuCAEGcsCFXGZ0EQgaAtBdGn5ZExSz0jiIylOklibOpahscMVM+d8vTEXX3DuO+WHlaFbM8RvKvCbzi+f1kIdhxp95OtqOzBSeJKGcDYxuJXzTL945Y/BYXjQ59kznFiF0o5bxSaYhIHtzjaDD0mxDr8IzOk90uuJe39hcU9wgLfASDroJ/Tnbgli1hISpeacKOfLE+Nu4N6vT61Rd52VQ6GZb95aMbyb9WGqRY5Fw==';

const decrypted = APIDecryptor.decrypt(encryptedResponse);
console.log(decrypted);
```

Run: `node test_decrypt.js`

---

## Step 4: Use in Your Scraper

```javascript
const ShriramScraper = require('./src/shriramScraper');
const APIDecryptor = require('./src/apiDecryptor');

(async () => {
  const scraper = new ShriramScraper('YOUR_32_CHAR_KEY');
  await scraper.init();
  
  await scraper.login({
    userId: 'your_user_id',
    password: 'your_password'
  });

  // Scrape manufacturers
  const manufacturers = await scraper.fetchManufacturers();
  
  await scraper.close();
})();
```

---

## 🔍 Key Findings from Page Source

From the minified JS, the API uses:

```javascript
const KEY = 'ZxV__ZA_VALUE';  // 32 characters
const IV = Buffer.alloc(16, 0);  // 16 null bytes

// Decryption pattern:
CryptoJS.AES.decrypt(encrypted, key, {
  iv: IV,
  mode: CryptoJS.mode.CBC,
  padding: CryptoJS.pad.Pkcs7
})
```

---

## 📝 Next Steps

1. **Find the key** using DevTools → Console
2. **Update** `apiDecryptor.js` with the real key
3. **Test** with `test_decrypt.js`
4. **Integrate** into your scraper
