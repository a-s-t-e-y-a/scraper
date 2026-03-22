const { launchBrowser } = require('./browser');
const { goToQuotation } = require('./navigation');
const { selectTwoWheelerTab, selectVehicleType } = require('./scraper');
const fs = require('fs');
const path = require('path');

const SESSION_DATA = {
    "Menu": '[{"menuSINo":"","menuID":"","parentID":"","screenID":"0","screenCode":"S0317","menuName":"","link":"../../SGIENTITY.Common/Login.aspx","reactScrLink":"","description":"NOVALite Login","screenOperations":"","token":null}]',
    "refreshTokenValue": "scUaan6y20uicfjl0G/fmRPdwGyrRW0zOJ3GyWF6ltmi4JvgWAF+xLrQwNHMHxK2DU9HGs52e5j+v+RBtEHORA==",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJVc2VySWQiOiJFbCswTE1oUm83eEJwSFBNc2MxMmhnPT0iLCJEaXZpc2lvbiI6IjEwMjAxNSIsIkV4dGVybmFsIjoiZmFsc2UiLCJJZCI6IjIyNmI1YWFiLWI0OWYtNDU3Zi1hOWEwLTAyMzRhZjllMWNkNyIsIkRhdGVUaW1lIjoiMy8yMi8yMDI2IDU6MDM6NTAgUE0iLCJSZWZyZXNoVG9rZW4iOiJzY1VhYW42eTIwdWljZmpsMEcvZm1SUGR3R3lyUlcwek9KM0d5V0Y2bHRtaTRKdmdXQUYreExyUXdOSE1IeEsyRFU5SEdzNTJlNWorditSQnRFSE9SQT09IiwiUmVmcmVzaFRva2VuRXhwaXJlcyI6IjMvMjIvMjAyNiA3OjAzOjUwIFBNIiwibmJmIjoxNzc0MTk5MDMwLCJleHAiOjE3NzQyMDI2MzAsImlhdCI6MTc3NDE5OTAzMCwiaXNzIjoiU1RBVElNLkNvbW1vbi5XZWJBUEkiLCJhdWQiOiJodHRwOi8vbG9jYWxob3N0OjgwMDEifQ.ALH5Kcih-j8Yw7rCltYvFxJQmiy92ur0cnCuYtEQHWE",
    "url": '[{"urlLink":"NovaConnect","preInsSSOValidateURL":"https://shrigenservice.shriramgi.com/PreinspectionService/preinspection_services/"}]',
    "userDetails": '{"userId":"LC288-370","password":"Girnar@5160","divisionCode":"102015","agentCode":"LC0000000288","captcha":"JPHPYN","divisionId":"1073","divisionName":"102015 - GURGAON","userName":"M/S.GIRNAR INSURANCE BROKERS PVT. LTD.","token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJVc2VySWQiOiJFbCswTE1oUm83eEJwSFBNc2MxMmhnPT0iLCJEaXZpc2lvbiI6IjEwMjAxNSIsIkV4dGVybmFsIjoiZmFsc2UiLCJJZCI6IjZmZTU5MzdkLWUxYzItNDBmZS04NWRiLWFmOGY5ZmRkNWMxMiIsIkRhdGVUaW1lIjoiMy8yMi8yMDI2IDQ6NDE6MjkgUE0iLCJSZWZyZXNoVG9rZW4iOiJDM1VrdkwraTFmTW9wTTBtU3E2NG1vM0xpdFJrSnl4cXBEaXJreExDVkVpdFJ0M2lNcWVwaXBIQk5nOWlBY0dUVUpKUjhTSCtDUllsWW1FK051elAvZz09IiwiUmVmcmVzaFRva2VuRXhwaXJlcyI6IjMvMjIvMjAyNiA2OjQxOjI5IFBNIiwibmJmIjoxNzc0MTk3Njg5LCJleHAiOjE3NzQyMDEyODksImlhdCI6MTc3NDE5NzY4OSwiaXNzIjoiU1RBVElNLkNvbW1vbi5XZWJBUEkiLCJhdWQiOiJodHRwOi8vbG9jYWxob3N0OjgwMDEifQ.2zK_5xUoLm_rIhEo72f-my1o06Twd9fB8EP7Z_80Qiw","channelId":"7","roleId":"57","userFor":"B"}'
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
