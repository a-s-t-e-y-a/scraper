# NovaConnect Two-Wheeler Scraper Guide 🛵

Yeh document aapko step-by-step batayega ki is Puppeteer scraper ko apne system pe kaise setup karein, kaise run karein, aur agar koi error aaye to usko kaise fix karein. 

**Iska main kaam kya hai?** 
Yeh script automate karke NovaConnect motor quotation portal se saare two-wheeler "Manufacturers" aur unke andhar aane waale sabhi "Models" ka data nikalegi aur usko `data/manufacturers_with_models.json` file mein save karegi.

---

## 🚀 1. Setup Kaise Karein (Installation)

Is code ko run karne ke liye aapke paas Node.js install hona zaruri hai. Agar Node.js nahi hai, toh pehle usko [nodejs.org](https://nodejs.org) se download aur install kar lijiye.

### Steps:
1. Apna terminal (ya command prompt) open karein.
2. Us folder mein jaayein jahan par yeh code rakha hai. Example:
   ```bash
   cd path/to/js_scrapper
   ```
3. Packages install karne ke liye yeh command run karein:
   ```bash
   pnpm install
   ```
   *(Note: Agar aapke paas `pnpm` nahi hai toh pehle `npm install -g pnpm` run kar lijiye. Ya fir aap simply `npm install` bhi use kar sakte hain).*

---

## 🔑 2. Login & Token Setup (Sabse Important Step)

Kyunki yeh portal bina login ke access nahi hota, isliye run karne se pehle humein apna **active session data** script ko dena padega taki woh directly portal mein ghus sake.

### Token kaise nikalein:
1. Apna browser open karein (Google Chrome/Brave).
2. Shriram General Insurance portal par normally login karein apna User ID aur Password daal kar.
3. Login hone ke baad, keyboard pe **F12** dabake **Developer Tools** open karein.
4. Upar tabs mein **Console** par click karein.
5. Yeh niche diya hua code exact copy karke Console mein paste karein aur **Enter** dabayein:

   ```javascript
   JSON.stringify(Object.fromEntries(
       ['Menu', 'refreshTokenValue', 'token', 'url', 'userDetails'].map(k => [k, sessionStorage.getItem(k)])
   ))
   ```

6. Aapko ek ghumta-firta lamba sa result milega curly brackets `{ ... }` ke andar. Uss poore output ko **copy kar lijiye**. (Dhyan rahe aage-peeche ke extra quotes `'` copy mat karna, sirf `{` se leke `}` tak).

### Token script mein kahan daalein:
1. Apne code editor (VS Code) mein `src/index.js` file open karein.
2. File ke bilkul upar aapko `SESSION_DATA` naam ka object dikhega (around line 9).
3. Us puraane `SESSION_DATA = { ... }` ko hataiye aur apna naya copy kiya hua result yahan chipka dijiye.
   *Example dictniory aisa thoda lamba dikhna chahiye:*
   ```javascript
   const SESSION_DATA = {
       "Menu": "[...]",
       "refreshTokenValue": "...",
       "token": "...",
       "url": "[...]",
       "userDetails": "{...}"
   };
   ```
4. File **save** kar dijiye (`Ctrl + S`).

---

## ▶️  3. Script Kaise Run Karein

Tokens setup hone ke baad, code ready hai udne ke liye.
Terminal mein bas yeh command type karein:

```bash
node src/index.js
```

### Script chalne par kya hoga?
1. Ek Chromium browser window open hogi.
2. Woh automatically "Quotation" page par jayegi.
3. "Two Wheeler" tab aur vehicle type select karegi.
4. "Make" (Manufacturer) dropdown pe click karke Modal kholegi.
5. Har manufacturer ke liye:
   - Make row ko search karke select karegi.
   - Uska "Model" lookup select karke modal open karegi.
   - Har ek page browse karke Model ka saara data fetch karegi.
   - JSON file mein save karke aage badh jayegi.
6. Progress aapko terminal logs mein live dikhayi degi jaise:  `[1/479] 🔍 G BYKE` -> `✅ Extracted 2 models.`

Data achanak crash hone pe udh na jaye, isliye har manufacturer ka models scrape hone ke baad file live-overwrite hoke save hoti rehti hai `data/manufacturers_with_models.json` mein.

---

## 🛠 4. Troubleshooting & Errors (Error Aaye Toh Kya Karein?)

### Problem 1: Token Expired! (Browser Login Screen Pe Atak Gaya Hai)
- **Kyu hota hai:** Security features ke hisaab se tokens har thodi der mein (approx 30 mins) expire ya timeout ho jate hain. Ya portal ne detect kar liya ki naya session open hua hai.
- **Kya karein:**
  1. Terminal mein chal rahi script ko rok dein (`Ctrl + C` dabayein).
  2. Apne normal web browser (Chrome) mein portal ko refresh karein, portal aapse dobaara login mange ga.
  3. Apna username/password daalke wapas fresh login karein.
  4. Wapas se Step 2 (🔑 Login & Token Setup) wala process follow karein (Console mein code daal ke naya token nikal ke index.js mein daalna).
  5. Script dobaara `node src/index.js` run kardein!  

### Problem 2: Timeout: no rows found for `.ant-modal-body` (Script atki hui hai)
- **Kyu hota hai:** Internet slow ho sakta hai jisse portal load nahi ho pa raha, ya portal temporary band he ya respond nahi kar raha. Agar page poori tareeke se load na hon, toh scraper timeout marta hai.
- **Kya karein:**
  1. Script rok ke dobaara run karein `node src/index.js`.
  2. Apne Chrome window mein portal check karein manual testing ke through ki kya unka server normal chal raha hai. Agar site down hai manual browser pe, toh scraper bhi usko wait hi karega and timeout kha ke fail ho jayega.

### Problem 3: `Error: net::ERR_CONNECTION_REFUSED`
- **Kyu hota hai:** Network level error hai. Internet connection drop ho gaya hoga.
- **Kya karein:** Apna Wi-Fi thik kijiye aur re-run karein!

### Problem 4: Mujhe isko specific/kam Manufacturers ke liye test/run karna hai?
- Agar 479 items bohot zyada hai test karne ke liye aur aapko starting ke bas 5 items test karne hain.
- `src/index.js` file kholo.
- Line number 47 ke aas-paas dekho:
  ```javascript
  const manufacturers = allManufacturers;
  ```
- Isko temporarily change kar do slice karke:
  ```javascript
  const manufacturers = allManufacturers.slice(0, 5); // Sirf pehle 5 items run karega
  ```
- Jab fully satisfied ho jaaye test results se test run ho jaane ke baad, is slice ko delete karke dobaara `allManufacturers` kardijiye and full data extraction chalu karein.

---

### Aur koi madad chahiye?
Aap `src/modelScraper.js` file dekh sakte hain. Code modular hai and steps clearly labelled comments se divided hain (`// 1. OPEN MAKE MODAL`, `// 3. OPEN MODEL MODAL`, etc.). All logic safe wait intervals, polling, and auto-scrolling fallback code ke saath hai.
