const { launchBrowser } = require('./browser');
const { injectSession } = require('./auth');
const { goToQuotation } = require('./navigation');
const { selectTwoWheelerTab, selectVehicleType } = require('./scraper');
const { scrapeAllModels } = require('./modelScraper');
const fs = require('fs');
const path = require('path');

const SESSION_DATA = {
    "Menu": '[{"menuSINo":"","menuID":"","parentID":"","screenID":"0","screenCode":"S0317","menuName":"","link":"../../SGIENTITY.Common/Login.aspx","reactScrLink":"","description":"NOVALite Login","screenOperations":"","token":null},{"menuSINo":"","menuID":"","parentID":"","screenID":"0","screenCode":"S0323","menuName":"","link":"../../SGIENTITY.Reports/ReportsTray.aspx","reactScrLink":"/ReportTray","description":"NOVALite Reports Tray","screenOperations":"","token":null},{"menuSINo":"","menuID":"","parentID":"","screenID":"0","screenCode":"S0423","menuName":"","link":"../../GIM.Reports/ReportsTray.aspx","reactScrLink":"","description":"Report Tray","screenOperations":"","token":null},{"menuSINo":"","menuID":"","parentID":"","screenID":"0","screenCode":"S0517","menuName":"","link":"../../LOADER.Proposal/UploadStatus.aspx","reactScrLink":"","description":"Upload Status","screenOperations":"","token":null},{"menuSINo":"","menuID":"","parentID":"","screenID":"0","screenCode":"S0518","menuName":"","link":"../../LOADER.Proposal/PolicyUpload.aspx","reactScrLink":"","description":"Policy Upload","screenOperations":"","token":null},{"menuSINo":"","menuID":"","parentID":"","screenID":"0","screenCode":"S0519","menuName":"","link":"../../LOADER.Proposal/PolicySchedule.aspx","reactScrLink":"","description":"Policy Schedule","screenOperations":"","token":null},{"menuSINo":"1","menuID":"4","parentID":"0","screenID":"0","screenCode":"","menuName":"Admin","link":"","reactScrLink":"","description":"","screenOperations":"","token":null},{"menuSINo":"1","menuID":"208","parentID":"20","screenID":"314","screenCode":"S0328","menuName":"Motor","link":"../../SGIENTITY.Receipts/Proposalsearch.aspx","reactScrLink":"/Dashboard","description":"NOVALite Proposalsearch","screenOperations":"1,2,4,8,16,64","token":null},{"menuSINo":"1","menuID":"233","parentID":"4","screenID":"309","screenCode":"S0322","menuName":"Change Password","link":"../../SGIENTITY.Admin/ChangePassword.aspx","reactScrLink":"/ChangePassword","description":"NOVALite Change Password","screenOperations":"1,2,4,8,16","token":null},{"menuSINo":"2","menuID":"20","parentID":"0","screenID":"0","screenCode":"","menuName":"Proposal","link":"","reactScrLink":"","description":"","screenOperations":"","token":null},{"menuSINo":"2","menuID":"466","parentID":"20","screenID":"584","screenCode":"S0645","menuName":"EBike","link":"../../SGIENTITY.Receipts/EVehicleInsuranceSearch.aspx","reactScrLink":"/EBikeConnect","description":"EVehicle Insurance search","screenOperations":"1,2,8,16,64","token":null},{"menuSINo":"3","menuID":"207","parentID":"0","screenID":"0","screenCode":"","menuName":"Receipt","link":"","reactScrLink":"","description":"","screenOperations":"","token":null},{"menuSINo":"3","menuID":"335","parentID":"20","screenID":"414","screenCode":"S0469","menuName":"CPA","link":"../../SGIENTITY.Receipts/CompulsaryPersonalAccidentSearch.aspx","reactScrLink":"/Dashboard/CpaProposal","description":"Compulsory Personal Accident Search","screenOperations":"1,2,4,8,16,64","token":null},{"menuSINo":"4","menuID":"210","parentID":"212","screenID":"308","screenCode":"S0321","menuName":"Policy Reprint","link":"../../SGIENTITY.Receipts/PolicySchedule.aspx","reactScrLink":"/ConnectReprint","description":"NOVALite Policy Schedule","screenOperations":"1,2,4,8","token":null},{"menuSINo":"4","menuID":"212","parentID":"0","screenID":"0","screenCode":"","menuName":"Report","link":"","reactScrLink":"","description":"","screenOperations":"","token":null},{"menuSINo":"4","menuID":"213","parentID":"212","screenID":"306","screenCode":"S0319","menuName":"MIS","link":"../../SGIENTITY.Reports/CollabratorReport.aspx","reactScrLink":"/ConnectReport","description":"NOVALite Collabrator Report","screenOperations":"1,2,4,8","token":null},{"menuSINo":"4","menuID":"426","parentID":"207","screenID":"552","screenCode":"S0848","menuName":"CD CN Collection","link":"../../SGIENTITY.Receipts/CollectionReceipt.aspx","reactScrLink":"/CD-CnCollectionReceipt","description":"Collection Receipt","screenOperations":"1,2,8,16,32,64,128","token":null},{"menuSINo":"4","menuID":"464","parentID":"20","screenID":"606","screenCode":"S0655","menuName":"Legal Protection","link":"../../SGIENTITY.Receipts/LegalProtectionInsuranceDashboard.aspx","reactScrLink":"/LegalProtectionInsurance","description":"MotorLegalProtection Insurance","screenOperations":"1,2,4,8,16,32,64,128","token":null},{"menuSINo":"99","menuID":"523","parentID":"4","screenID":"689","screenCode":"S9999","menuName":"PreInspection SSO","link":"https://shrigenservice.shriramgi.com/PreinspectionApp/GI.Common/Home/Login.aspx?","reactScrLink":"","description":"PreInsSSO","screenOperations":"1,2,4,8,16,32,64,128","token":null}]',
    "refreshTokenValue": "TK16J7kqCzHyK7Hz/4s9XMlw81oPkkpr8dWcGTEnUUdgNYrP3fc+ObOCz4r0qsb1RaOzr3Fj/YiBmslITjtl6g==",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJVc2VySWQiOiJFbCswTE1oUm83eEJwSFBNc2MxMmhnPT0iLCJEaXZpc2lvbiI6IjEwMjAxNSIsIkV4dGVybmFsIjoiZmFsc2UiLCJJZCI6IjI5MjE2NjBmLTU4MTYtNDlhZi1hMmNmLWZkNTY4MTZkYzJlNyIsIkRhdGVUaW1lIjoiMy8yMi8yMDI2IDY6MDU6MzQgUE0iLCJSZWZyZXNoVG9rZW4iOiJUSzE2SjdrcUN6SHlLN0h6LzRzOVhNbHc4MW9Qa2twcjhkV2NHVEVuVVVkZ05ZclAzZmMrT2JPQ3o0cjBxc2IxUmFPenIzRmovWWlCbXNsSVRqdGw2Zz09IiwiUmVmcmVzaFRva2VuRXhwaXJlcyI6IjMvMjIvMjAyNiA4OjA1OjM0IFBNIiwibmJmIjoxNzc0MjAyNzM0LCJleHAiOjE3NzQyMDYzMzQsImlhdCI6MTc3NDIwMjczNCwiaXNzIjoiU1RBVElNLkNvbW1vbi5XZWJBUEkiLCJhdWQiOiJodHRwOi8vbG9jYWxob3N0OjgwMDEifQ.FQGKcY7sGROXteeZpKcIz3leBXTkGEcoFkr4PHROTTk",
    "url": '[{"urlLink":"NovaConnect","preInsSSOValidateURL":"https://shrigenservice.shriramgi.com/PreinspectionService/preinspection_services/"}]',
    "userDetails": '{"userId":"LC288-370","password":"Girnar@5160","divisionCode":"102015","agentCode":"LC0000000288","captcha":"JPHPYN","divisionId":"1073","divisionName":"102015 - GURGAON","userName":"M/S.GIRNAR INSURANCE BROKERS PVT. LTD.","token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJVc2VySWQiOiJFbCswTE1oUm83eEJwSFBNc2MxMmhnPT0iLCJEaXZpc2lvbiI6IjEwMjAxNSIsIkV4dGVybmFsIjoiZmFsc2UiLCJJZCI6IjZmZTU5MzdkLWUxYzItNDBmZS04NWRiLWFmOGY5ZmRkNWMxMiIsIkRhdGVUaW1lIjoiMy8yMi8yMDI2IDQ6NDE6MjkgUE0iLCJSZWZyZXNoVG9rZW4iOiJDM1VrdkwraTFmTW9wTTBtU3E2NG1vM0xpdFJrSnl4cXBEaXJreExDVkVpdFJ0M2lNcWVwaXBIQk5nOWlBY0dUVUpKUjhTSCtDUllsWW1FK051elAvZz09IiwiUmVmcmVzaFRva2VuRXhwaXJlcyI6IjMvMjIvMjAyNiA2OjQxOjI5IFBNIiwibmJmIjoxNzc0MTk3Njg5LCJleHAiOjE3NzQyMDEyODksImlhdCI6MTc3NDE5NzY4OSwiaXNzIjoiU1RBVElNLkNvbW1vbi5XZWJBUEkiLCJhdWQiOiJodHRwOi8vbG9jYWxob3N0OjgwMDEifQ.2zK_5xUoLm_rIhEo72f-my1o06Twd9fB8EP7Z_80Qiw","channelId":"7","roleId":"57","userFor":"B"}'
};

async function run() {
    const browser = await launchBrowser();
    const page = await browser.newPage();

    page.on('console', msg => {
        const text = msg.text();
        if (!text.includes('X-Frame-Options')) console.log('PAGE LOG:', text);
    });

    await page.evaluateOnNewDocument((data) => {
        Object.keys(data).forEach(key => {
            sessionStorage.setItem(key, data[key]);
            localStorage.setItem(key, data[key]);
        });
    }, SESSION_DATA);

    page.setDefaultNavigationTimeout(0);

    try {
        console.log('🏁 Navigating to quotation page...');
        await goToQuotation(page);
        await new Promise(r => setTimeout(r, 8000));

        console.log('🔘 Interacting with form...');
        await selectTwoWheelerTab(page);
        await selectVehicleType(page);

        const allManufacturers = JSON.parse(
            fs.readFileSync(path.join(__dirname, '../data/manufacturers.json'), 'utf-8')
        );
        const manufacturers = allManufacturers;

        console.log(`📊 Starting model extraction for ${manufacturers.length} manufacturers...`);
        const result = await scrapeAllModels(page, manufacturers);

        const totalModels = result.reduce((sum, m) => sum + m.models.length, 0);
        console.log(`✅ Done! Extracted ${totalModels} models across ${result.length} manufacturers.`);
        console.log('💾 Saved to data/manufacturers_with_models.json');

        await new Promise(() => {});
    } catch (error) {
        console.error('❌ Error during execution:', error.message);
    }
}

run();
