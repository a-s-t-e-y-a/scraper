/**
 * Multi-Product Scraper - Main Entry Point
 * CLI-based dispatcher for fetching data for different product types
 * 
 * Usage:
 *   node fetchData.js                 (defaults to TW)
 *   node fetchData.js --type=GCCV
 *   node fetchData.js --type=PC --verbose
 */

const { launchBrowser } = require('./browser');
const { injectSession } = require('./auth');
const { goToQuotation } = require('./navigation');
const { selectVehicleType } = require('./scraper');
const { parseArgs, validateType, printUsage } = require('./cli');
const { getHandler, getProductTypeInfo } = require('./router');
const fs = require('fs');
const path = require('path');

// Session data - update with your valid tokens
const SESSION_DATA = {
    "Menu": '[{"menuSINo":"","menuID":"","parentID":"","screenID":"0","screenCode":"S0317","menuName":"","link":"../../SGIENTITY.Common/Login.aspx","reactScrLink":"","description":"NOVALite Login","screenOperations":"","token":null},{"menuSINo":"","menuID":"","parentID":"","screenID":"0","screenCode":"S0323","menuName":"","link":"../../SGIENTITY.Reports/ReportsTray.aspx","reactScrLink":"/ReportTray","description":"NOVALite Reports Tray","screenOperations":"","token":null},{"menuSINo":"","menuID":"","parentID":"","screenID":"0","screenCode":"S0423","menuName":"","link":"../../GIM.Reports/ReportsTray.aspx","reactScrLink":"","description":"Report Tray","screenOperations":"","token":null},{"menuSINo":"","menuID":"","parentID":"","screenID":"0","screenCode":"S0517","menuName":"","link":"../../LOADER.Proposal/UploadStatus.aspx","reactScrLink":"","description":"Upload Status","screenOperations":"","token":null},{"menuSINo":"","menuID":"","parentID":"","screenID":"0","screenCode":"S0518","menuName":"","link":"../../LOADER.Proposal/PolicyUpload.aspx","reactScrLink":"","description":"Policy Upload","screenOperations":"","token":null},{"menuSINo":"","menuID":"","parentID":"","screenID":"0","screenCode":"S0519","menuName":"","link":"../../LOADER.Proposal/PolicySchedule.aspx","reactScrLink":"","description":"Policy Schedule","screenOperations":"","token":null},{"menuSINo":"1","menuID":"4","parentID":"0","screenID":"0","screenCode":"","menuName":"Admin","link":"","reactScrLink":"","description":"","screenOperations":"","token":null},{"menuSINo":"1","menuID":"208","parentID":"20","screenID":"314","screenCode":"S0328","menuName":"Motor","link":"../../SGIENTITY.Receipts/Proposalsearch.aspx","reactScrLink":"/Dashboard","description":"NOVALite Proposalsearch","screenOperations":"1,2,4,8,16,64","token":null},{"menuSINo":"1","menuID":"233","parentID":"4","screenID":"309","screenCode":"S0322","menuName":"Change Password","link":"../../SGIENTITY.Admin/ChangePassword.aspx","reactScrLink":"/ChangePassword","description":"NOVALite Change Password","screenOperations":"1,2,4,8,16","token":null},{"menuSINo":"2","menuID":"20","parentID":"0","screenID":"0","screenCode":"","menuName":"Proposal","link":"","reactScrLink":"","description":"","screenOperations":"","token":null},{"menuSINo":"2","menuID":"466","parentID":"20","screenID":"584","screenCode":"S0645","menuName":"EBike","link":"../../SGIENTITY.Receipts/EVehicleInsuranceSearch.aspx","reactScrLink":"/EBikeConnect","description":"EVehicle Insurance search","screenOperations":"1,2,8,16,64","token":null},{"menuSINo":"3","menuID":"207","parentID":"0","screenID":"0","screenCode":"","menuName":"Receipt","link":"","reactScrLink":"","description":"","screenOperations":"","token":null},{"menuSINo":"3","menuID":"335","parentID":"20","screenID":"414","screenCode":"S0469","menuName":"CPA","link":"../../SGIENTITY.Receipts/CompulsaryPersonalAccidentSearch.aspx","reactScrLink":"/Dashboard/CpaProposal","description":"Compulsory Personal Accident Search","screenOperations":"1,2,4,8,16,64","token":null},{"menuSINo":"4","menuID":"210","parentID":"212","screenID":"308","screenCode":"S0321","menuName":"Policy Reprint","link":"../../SGIENTITY.Receipts/PolicySchedule.aspx","reactScrLink":"/ConnectReprint","description":"NOVALite Policy Schedule","screenOperations":"1,2,4,8","token":null},{"menuSINo":"4","menuID":"212","parentID":"0","screenID":"0","screenCode":"","menuName":"Report","link":"","reactScrLink":"","description":"","screenOperations":"","token":null},{"menuSINo":"4","menuID":"213","parentID":"212","screenID":"306","screenCode":"S0319","menuName":"MIS","link":"../../SGIENTITY.Reports/CollabratorReport.aspx","reactScrLink":"/ConnectReport","description":"NOVALite Collabrator Report","screenOperations":"1,2,4,8","token":null},{"menuSINo":"4","menuID":"426","parentID":"207","screenID":"552","screenCode":"S0848","menuName":"CD CN Collection","link":"../../SGIENTITY.Receipts/CollectionReceipt.aspx","reactScrLink":"/CD-CnCollectionReceipt","description":"Collection Receipt","screenOperations":"1,2,8,16,32,64,128","token":null},{"menuSINo":"4","menuID":"464","parentID":"20","screenID":"606","screenCode":"S0655","menuName":"Legal Protection","link":"../../SGIENTITY.Receipts/LegalProtectionInsuranceDashboard.aspx","reactScrLink":"/LegalProtectionInsurance","description":"MotorLegalProtection Insurance","screenOperations":"1,2,4,8,16,32,64,128","token":null},{"menuSINo":"99","menuID":"523","parentID":"4","screenID":"689","screenCode":"S9999","menuName":"PreInspection SSO","link":"https://shrigenservice.shriramgi.com/PreinspectionApp/GI.Common/Home/Login.aspx?","reactScrLink":"","description":"PreInsSSO","screenOperations":"1,2,4,8,16,32,64,128","token":null}]',
    "refreshTokenValue": "ueq4nwvOjV6NAKVpFqRqZOuRwVpPjKc3PYTO58yffznIQCh1iW/EVN06kNrP+lOufgOYUYgfe7KFT2dLiHdvTg==",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJVc2VySWQiOiJFbCswTE1oUm83eEJwSFBNc2MxMmhnPT0iLCJEaXZpc2lvbiI6IjEwMjAxNSIsIkV4dGVybmFsIjoiZmFsc2UiLCJJZCI6Ijc0ZDcyMGM2LWNjNzQtNDdjYi1iMjBhLWMzZmJiZDczNjU4YSIsIkRhdGVUaW1lIjoiMy8yNS8yMDI2IDY6MjU6NTYgQU0iLCJSZWZyZXNoVG9rZW4iOiJ1ZXE0bnd2T2pWNk5BS1ZwRnFScVpPdVJ3VnBQaktjM1BZVE81OHlmZnpuSVFDaDFpVy9FVk4wNmtOclArbE91ZmdPWVVZZ2ZlN0tGVDJkTGlIZHZUZz09IiwiUmVmcmVzaFRva2VuRXhwaXJlcyI6IjMvMjUvMjAyNiA4OjI1OjU2IEFNIiwibmJmIjoxNzc0NDE5OTU2LCJleHAiOjE3NzQ0MjM1NTYsImlhdCI6MTc3NDQxOTk1NiwiaXNzIjoiU1RBVElNLkNvbW1vbi5XZWJBUEkiLCJhdWQiOiJodHRwOi8vbG9jYWxob3N0OjgwMDEifQ.m4o3_lVmaPYSXCGJCPoJSi9UKfKabNfAr4zHmv8SjCw",
    "url": '[{"urlLink":"NovaConnect","preInsSSOValidateURL":"https://shrigenservice.shriramgi.com/PreinspectionService/preinspection_services/"}]',
    "userDetails": '{"userId":"LC288-370","password":"Girnar@5160","divisionCode":"102015","agentCode":"LC0000000288","captcha":"VRCOAE","divisionId":"1073","divisionName":"102015 - GURGAON","userName":"M/S.GIRNAR INSURANCE BROKERS PVT. LTD.","token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJVc2VySWQiOiJFbCswTE1oUm83eEJwSFBNc2MxMmhnPT0iLCJEaXZpc2lvbiI6IjEwMjAxNSIsIkV4dGVybmFsIjoiZmFsc2UiLCJJZCI6Ijc0ZDcyMGM2LWNjNzQtNDdjYi1iMjBhLWMzZmJiZDczNjU4YSIsIkRhdGVUaW1lIjoiMy8yNS8yMDI2IDY6MjU6NTYgQU0iLCJSZWZyZXNoVG9rZW4iOiJ1ZXE0bnd2T2pWNk5BS1ZwRnFScVpPdVJ3VnBQaktjM1BZVE81OHlmZnpuSVFDaDFpVy9FVk4wNmtOclArbE91ZmdPWVVZZ2ZlN0tGVDJkTGlIZHZUZz09IiwiUmVmcmVzaFRva2VuRXhwaXJlcyI6IjMvMjUvMjAyNiA4OjI1OjU2IEFNIiwibmJmIjoxNzc0NDE5OTU2LCJleHAiOjE3NzQ0MjM1NTYsImlhdCI6MTc3NDQxOTk1NiwiaXNzIjoiU1RBVElNLkNvbW1vbi5XZWJBUEkiLCJhdWQiOiJodHRwOi8vbG9jYWxob3N0OjgwMDEifQ.m4o3_lVmaPYSXCGJCPoJSi9UKfKabNfAr4zHmv8SjCw","channelId":"7","roleId":"57","userFor":"B"}'
};

async function main() {
    // Parse command-line arguments
    const args = parseArgs(process.argv.slice(2));
    
    // Validate product type
    let productType;
    try {
        productType = validateType(args.type);
    } catch (err) {
        console.error('\n❌', err.message);
        printUsage();
        process.exit(1);
    }

    // Get product type info
    const typeInfo = getProductTypeInfo(productType);
    
    console.log(`\n╔════════════════════════════════════════════════════════════════════╗`);
    console.log(`║  Scraping: ${typeInfo.displayName.padEnd(55)}║`);
    console.log(`╚════════════════════════════════════════════════════════════════════╝\n`);

    const browser = await launchBrowser();
    const page = await browser.newPage();

    page.on('console', msg => {
        if (!msg.text().includes('X-Frame-Options') && args.verbose) {
            console.log('PAGE LOG:', msg.text());
        }
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

        console.log('🔘 Setting up form...');
        
        // Get the handler for this product type
        const handler = getHandler(productType);
        
        // Select the appropriate product type tab
        await handler.selectProductTypeTab(page);
        
        // Only select vehicle type if handler doesn't iterate over them
        // (Handlers that iterate will select vehicle types internally)
        if (!handler.shouldIterateVehicleTypes()) {
            console.log('🔘 Selecting Vehicle Type...');
            await selectVehicleType(page);
        } else {
            console.log('🔄 Handler will iterate over vehicle types...');
        }

        // Load manufacturers data
        const dataDir = path.join(__dirname, '../data');
        const manufacturersPath = path.join(dataDir, 'manufacturers.json');
        
        if (!fs.existsSync(manufacturersPath)) {
            throw new Error(`Manufacturers file not found: ${manufacturersPath}`);
        }

        const allManufacturers = JSON.parse(
            fs.readFileSync(manufacturersPath, 'utf-8')
        );

        console.log(`📊 Starting model extraction for ${allManufacturers.length} manufacturers...`);

        // Execute handler's scraping logic
        const result = await handler.execute(page, allManufacturers);

        const totalModels = result.reduce((sum, m) => sum + m.models.length, 0);
        console.log(`\n✅ Complete! Extracted ${totalModels} models across ${result.length} manufacturers.`);

    } catch (error) {
        console.error('\n❌ Error during execution:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await browser.close();
    }
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
