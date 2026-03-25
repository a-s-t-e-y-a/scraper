const { launchBrowser } = require('./browser');
const { goToQuotation } = require('./navigation');
const { selectTwoWheelerTab, selectVehicleType } = require('./scraper');
const fs = require('fs');
const path = require('path');

const SESSION_DATA = {
    "Menu": '[{"menuSINo":"","menuID":"","parentID":"","screenID":"0","screenCode":"S0317","menuName":"","link":"../../SGIENTITY.Common/Login.aspx","reactScrLink":"","description":"NOVALite Login","screenOperations":"","token":null},{"menuSINo":"","menuID":"","parentID":"","screenID":"0","screenCode":"S0323","menuName":"","link":"../../SGIENTITY.Reports/ReportsTray.aspx","reactScrLink":"/ReportTray","description":"NOVALite Reports Tray","screenOperations":"","token":null},{"menuSINo":"","menuID":"","parentID":"","screenID":"0","screenCode":"S0423","menuName":"","link":"../../GIM.Reports/ReportsTray.aspx","reactScrLink":"","description":"Report Tray","screenOperations":"","token":null},{"menuSINo":"","menuID":"","parentID":"","screenID":"0","screenCode":"S0517","menuName":"","link":"../../LOADER.Proposal/UploadStatus.aspx","reactScrLink":"","description":"Upload Status","screenOperations":"","token":null},{"menuSINo":"","menuID":"","parentID":"","screenID":"0","screenCode":"S0518","menuName":"","link":"../../LOADER.Proposal/PolicyUpload.aspx","reactScrLink":"","description":"Policy Upload","screenOperations":"","token":null},{"menuSINo":"","menuID":"","parentID":"","screenID":"0","screenCode":"S0519","menuName":"","link":"../../LOADER.Proposal/PolicySchedule.aspx","reactScrLink":"","description":"Policy Schedule","screenOperations":"","token":null},{"menuSINo":"1","menuID":"4","parentID":"0","screenID":"0","screenCode":"","menuName":"Admin","link":"","reactScrLink":"","description":"","screenOperations":"","token":null},{"menuSINo":"1","menuID":"208","parentID":"20","screenID":"314","screenCode":"S0328","menuName":"Motor","link":"../../SGIENTITY.Receipts/Proposalsearch.aspx","reactScrLink":"/Dashboard","description":"NOVALite Proposalsearch","screenOperations":"1,2,4,8,16,64","token":null},{"menuSINo":"1","menuID":"233","parentID":"4","screenID":"309","screenCode":"S0322","menuName":"Change Password","link":"../../SGIENTITY.Admin/ChangePassword.aspx","reactScrLink":"/ChangePassword","description":"NOVALite Change Password","screenOperations":"1,2,4,8,16","token":null},{"menuSINo":"2","menuID":"20","parentID":"0","screenID":"0","screenCode":"","menuName":"Proposal","link":"","reactScrLink":"","description":"","screenOperations":"","token":null},{"menuSINo":"2","menuID":"466","parentID":"20","screenID":"584","screenCode":"S0645","menuName":"EBike","link":"../../SGIENTITY.Receipts/EVehicleInsuranceSearch.aspx","reactScrLink":"/EBikeConnect","description":"EVehicle Insurance search","screenOperations":"1,2,8,16,64","token":null},{"menuSINo":"3","menuID":"207","parentID":"0","screenID":"0","screenCode":"","menuName":"Receipt","link":"","reactScrLink":"","description":"","screenOperations":"","token":null},{"menuSINo":"3","menuID":"335","parentID":"20","screenID":"414","screenCode":"S0469","menuName":"CPA","link":"../../SGIENTITY.Receipts/CompulsaryPersonalAccidentSearch.aspx","reactScrLink":"/Dashboard/CpaProposal","description":"Compulsory Personal Accident Search","screenOperations":"1,2,4,8,16,64","token":null},{"menuSINo":"4","menuID":"210","parentID":"212","screenID":"308","screenCode":"S0321","menuName":"Policy Reprint","link":"../../SGIENTITY.Receipts/PolicySchedule.aspx","reactScrLink":"/ConnectReprint","description":"NOVALite Policy Schedule","screenOperations":"1,2,4,8","token":null},{"menuSINo":"4","menuID":"212","parentID":"0","screenID":"0","screenCode":"","menuName":"Report","link":"","reactScrLink":"","description":"","screenOperations":"","token":null},{"menuSINo":"4","menuID":"213","parentID":"212","screenID":"306","screenCode":"S0319","menuName":"MIS","link":"../../SGIENTITY.Reports/CollabratorReport.aspx","reactScrLink":"/ConnectReport","description":"NOVALite Collabrator Report","screenOperations":"1,2,4,8","token":null},{"menuSINo":"4","menuID":"426","parentID":"207","screenID":"552","screenCode":"S0848","menuName":"CD CN Collection","link":"../../SGIENTITY.Receipts/CollectionReceipt.aspx","reactScrLink":"/CD-CnCollectionReceipt","description":"Collection Receipt","screenOperations":"1,2,8,16,32,64,128","token":null},{"menuSINo":"4","menuID":"464","parentID":"20","screenID":"606","screenCode":"S0655","menuName":"Legal Protection","link":"../../SGIENTITY.Receipts/LegalProtectionInsuranceDashboard.aspx","reactScrLink":"/LegalProtectionInsurance","description":"MotorLegalProtection Insurance","screenOperations":"1,2,4,8,16,32,64,128","token":null},{"menuSINo":"99","menuID":"523","parentID":"4","screenID":"689","screenCode":"S9999","menuName":"PreInspection SSO","link":"https://shrigenservice.shriramgi.com/PreinspectionApp/GI.Common/Home/Login.aspx?","reactScrLink":"","description":"PreInsSSO","screenOperations":"1,2,4,8,16,32,64,128","token":null}]',
    refreshTokenValue: "T9eNeJtHLoP2/zUuWKUs4q99KAR1m64gXNVW/sVWM+yEesP10AQbHH2KcPvMR1usTDZxYj5m0vgR6Q6qiqkDIQ==",
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJVc2VySWQiOiJFbCswTE1oUm83eEJwSFBNc2MxMmhnPT0iLCJEaXZpc2lvbiI6IjEwMjAxNSIsIkV4dGVybmFsIjoiZmFsc2UiLCJJZCI6IjBmNTdjNTgwLTFhM2ItNDQ4Mi04ZjIwLWQwZmRjNjRlNTZkOCIsIkRhdGVUaW1lIjoiMy8yNS8yMDI2IDY6Mzg6MzQgQU0iLCJSZWZyZXNoVG9rZW4iOiJUOWVOZUp0SExvUDIvelV1V0tVczRxOTlLQVIxbTY0Z1hOVlcvc1ZXTSt5RWVzUDEwQVFiSEgyS2NQdk1SMXVzVERaeFlqNW0wdmdSNlE2cWlxa0RJUT09IiwiUmVmcmVzaFRva2VuRXhwaXJlcyI6IjMvMjUvMjAyNiA4OjM4OjM0IEFNIiwibmJmIjoxNzc0NDIwNzE0LCJleHAiOjE3NzQ0MjQzMTQsImlhdCI6MTc3NDQyMDcxNCwiaXNzIjoiU1RBVElNLkNvbW1vbi5XZWJBUEkiLCJhdWQiOiJodHRwOi8vbG9jYWxob3N0OjgwMDEifQ.GPYqN2VyE-WUsZRkIUSLHvbA0dhTtgR6PnOLii8I03Q",,
    "url": '[{"urlLink":"NovaConnect","preInsSSOValidateURL":"https://shrigenservice.shriramgi.com/PreinspectionService/preinspection_services/"}]',
    "userDetails": '{"userId":"LC288-370","password":"Girnar@5160","divisionCode":"102015","agentCode":"LC0000000288","captcha":"VRCOAE","divisionId":"1073","divisionName":"102015 - GURGAON","userName":"M/S.GIRNAR INSURANCE BROKERS PVT. LTD.","token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJVc2VySWQiOiJFbCswTE1oUm83eEJwSFBNc2MxMmhnPT0iLCJEaXZpc2lvbiI6IjEwMjAxNSIsIkV4dGVybmFsIjoiZmFsc2UiLCJJZCI6Ijc0ZDcyMGM2LWNjNzQtNDdjYi1iMjBhLWMzZmJiZDczNjU4YSIsIkRhdGVUaW1lIjoiMy8yNS8yMDI2IDY6MjU6NTYgQU0iLCJSZWZyZXNoVG9rZW4iOiJ1ZXE0bnd2T2pWNk5BS1ZwRnFScVpPdVJ3VnBQaktjM1BZVE81OHlmZnpuSVFDaDFpVy9FVk4wNmtOclArbE91ZmdPWVVZZ2ZlN0tGVDJkTGlIZHZUZz09IiwiUmVmcmVzaFRva2VuRXhwaXJlcyI6IjMvMjUvMjAyNiA4OjI1OjU2IEFNIiwibmJmIjoxNzc0NDE5OTU2LCJleHAiOjE3NzQ0MjM1NTYsImlhdCI6MTc3NDQxOTk1NiwiaXNzIjoiU1RBVElNLkNvbW1vbi5XZWJBUEkiLCJhdWQiOiJodHRwOi8vbG9jYWxob3N0OjgwMDEifQ.m4o3_lVmaPYSXCGJCPoJSi9UKfKabNfAr4zHmv8SjCw","channelId":"7","roleId":"57","userFor":"B"}'
};


const log = (msg) => console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function pollForRows(page, selector, timeout = 12000) {
    log(`⏳ Polling for: ${selector}`);
    const start = Date.now();
    while (Date.now() - start < timeout) {
        const count = await page.evaluate((sel) => document.querySelectorAll(sel).length, selector);
        log(`   → found ${count} rows`);
        if (count > 0) return count;
        await wait(600);
    }
    throw new Error(`Timeout: no rows found for ${selector}`);
}

async function domClick(page, description, evalFn) {
    log(`🖱️  Clicking: ${description}`);
    const result = await page.evaluate(evalFn);
    log(`   → result: ${result}`);
    return result;
}

async function run() {
    log('🚀 Launching browser...');
    const browser = await launchBrowser();
    const page = await browser.newPage();

    page.on('console', msg => {
        if (!msg.text().includes('X-Frame-Options')) log(`   PAGE: ${msg.text()}`);
    });

    await page.evaluateOnNewDocument((data) => {
        Object.keys(data).forEach(k => {
            sessionStorage.setItem(k, data[k]);
            localStorage.setItem(k, data[k]);
        });
    }, SESSION_DATA);

    page.setDefaultNavigationTimeout(0);

    log('🌐 Navigating to quotation page...');
    await goToQuotation(page);
    await wait(8000);

    log('🔘 Selecting Two Wheeler tab...');
    await selectTwoWheelerTab(page);
    log('🔘 Selecting Vehicle Type...');
    await selectVehicleType(page);
    await wait(1000);

    log('🔍 Opening Make lookup modal...');
    await domClick(page, 'Make search icon', () => {
        const input = document.querySelector('#manufacturer');
        const icon = input?.closest('.ant-input-affix-wrapper')?.querySelector('.anticon-search');
        if (icon) { icon.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); return 'clicked'; }
        return 'not found';
    });

    await wait(2000);
    const makeRowCount = await pollForRows(page, '.ant-modal-body .ant-table-row');
    log(`✅ Make modal open with ${makeRowCount} rows.`);

    const firstMfr = await page.evaluate(() => {
        const rows = document.querySelectorAll('.ant-modal-body .ant-table-row');
        const cells = rows[0]?.querySelectorAll('.ant-table-cell');
        return cells ? { code: cells[0]?.innerText.trim(), name: cells[2]?.innerText.trim() } : null;
    });
    log(`📋 First manufacturer: ${JSON.stringify(firstMfr)}`);

    log(`🖱️  Clicking first manufacturer row...`);
    await page.evaluate(() => {
        const row = document.querySelector('.ant-modal-body .ant-table-row');
        if (row) row.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    log('⏳ Waiting 2s for Make modal to close and form to update...');
    await wait(2000);

    const mfrValue = await page.evaluate(() => document.querySelector('#manufacturer')?.value || '');
    log(`📋 Manufacturer field value after selection: "${mfrValue}"`);

    await page.screenshot({ path: 'data/debug_after_mfr_select.png' });
    log('📸 Screenshot saved → data/debug_after_mfr_select.png');

    log('🔍 Opening Model lookup modal...');
    await domClick(page, 'Model search icon', () => {
        const input = document.querySelector('#model');
        const icon = input?.closest('.ant-input-affix-wrapper')?.querySelector('.anticon-search');
        if (icon) { icon.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); return 'clicked'; }
        return 'not found';
    });

    await wait(2500);
    await page.screenshot({ path: 'data/debug_model_modal.png' });
    log('📸 Screenshot saved → data/debug_model_modal.png');

    const modelRowCount = await pollForRows(page, '.ant-modal-body .ant-table-row');
    log(`✅ Model modal open with ${modelRowCount} rows.`);

    log('📊 Extracting model data...');
    let allModels = [];
    let pageNum = 1;

    while (true) {
        const currentActivePage = await page.evaluate(() => {
            const active = document.querySelector('.ant-modal-body .ant-pagination-item-active');
            return active ? parseInt(active.title || active.innerText) : 1;
        });

        const rows = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.ant-modal-body .ant-table-row')).map(row => {
                const cells = Array.from(row.querySelectorAll('.ant-table-cell'));
                return [
                    cells[0]?.innerText.trim(),
                    cells[1]?.innerText.trim(),
                    cells[2]?.innerText.trim(),
                    cells[3]?.innerText.trim(),
                    cells[4]?.innerText.trim(),
                    cells[5]?.innerText.trim(),
                    cells[6]?.innerText.trim(),
                    cells[7]?.innerText.trim(),
                    cells[8]?.innerText.trim(),
                ];
            });
        });

        log(`   → Page ${pageNum} (active: ${currentActivePage}): ${rows.length} model rows extracted`);
        allModels = allModels.concat(rows);

        const isNextDisabled = await page.evaluate(() => {
            const nextLi = document.querySelector('.ant-modal-body .ant-pagination-next');
            return nextLi?.classList.contains('ant-pagination-disabled') || nextLi?.getAttribute('aria-disabled') === 'true';
        });

        if (isNextDisabled) { log('   → Next button disabled. No more pages.'); break; }

        await page.evaluate(() => {
            const btn = document.querySelector('.ant-modal-body .ant-pagination-next button');
            if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        });

        await wait(1500);

        const newActivePage = await page.evaluate(() => {
            const active = document.querySelector('.ant-modal-body .ant-pagination-item-active');
            return active ? parseInt(active.title || active.innerText) : 1;
        });

        if (newActivePage === currentActivePage) { log('   → Page did not advance. Stopping.'); break; }

        pageNum++;
        await pollForRows(page, '.ant-modal-body .ant-table-row');
    }

    log(`✅ Total models extracted: ${allModels.length}`);

    const dataDir = path.join(__dirname, '../data');
    const header = 'vehicleCode,modelDescription,bodyDescription,cubicCapacity,fuel,gvw,noOfDrivers,seatingCapacity,vehicleWatt';
    const csv = [header, ...allModels.map(r => r.map(c => `"${(c||'').replace(/"/g,'""')}"`).join(','))].join('\n');
    fs.writeFileSync(path.join(dataDir, 'test_models.csv'), csv);
    log('💾 Saved → data/test_models.csv');

    log('❌ Closing model modal...');
    await page.evaluate(() => {
        const btn = document.querySelector('.ant-modal-close');
        if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    await wait(1000);

    log('🏁 Test complete! Browser staying open...');
    await new Promise(() => {});
}

run().catch(e => console.error('FATAL:', e.message));
