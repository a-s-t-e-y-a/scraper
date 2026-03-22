const fs = require('fs');
const path = require('path');

async function selectTwoWheelerTab(page) {
    console.log('🔘 Checking Two Wheeler tab...');
    await page.waitForSelector('.tabmenu, .tabmenuselected', { visible: true });
    const isSelected = await page.evaluate(() => {
        const selectedTab = document.querySelector('.tabmenuselected');
        return selectedTab && selectedTab.innerText.includes('Two Wheeler');
    });

    if (isSelected) {
        console.log('✅ Two Wheeler tab already selected.');
        return;
    }

    await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('.tabmenu'));
        const twoWheelerTab = tabs.find(tab => tab.innerText.includes('Two Wheeler'));
        if (twoWheelerTab) twoWheelerTab.click();
    });
    await new Promise(r => setTimeout(r, 2000));
}

async function selectVehicleType(page) {
    console.log('🔘 Selecting Vehicle Type...');
    await page.waitForSelector('#vehicleType', { visible: true });
    
    const currentValue = await page.evaluate(() => {
        const item = document.querySelector('.ant-select-selection-item');
        return item ? item.innerText.trim() : '';
    });

    if (currentValue === 'TWO WHEELER') {
        console.log('✅ Vehicle Type already set to TWO WHEELER.');
        return;
    }

    await page.click('#vehicleType');
    await page.waitForSelector('.ant-select-item-option-content', { visible: true });
    await page.evaluate(() => {
        const options = Array.from(document.querySelectorAll('.ant-select-item-option-content'));
        const twoWheelerOption = options.find(opt => opt.innerText.trim() === 'TWO WHEELER');
        if (twoWheelerOption) twoWheelerOption.click();
    });
    await new Promise(r => setTimeout(r, 2000));
}

async function openMakeLookup(page) {
    console.log('🔘 Opening Make lookup...');
    await page.waitForSelector('#manufacturer', { visible: true });
    const searchIconSelector = 'span.ant-input-suffix span[aria-label="search"]';
    await page.waitForSelector(searchIconSelector, { visible: true });
    await page.click(searchIconSelector);
    await page.waitForSelector('.ant-table-row', { visible: true });
}

async function scrapeManufacturers(page) {
    let allData = [];
    let hasNextPage = true;

    while (hasNextPage) {
        const pageData = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('.ant-table-row'));
            return rows.map(row => {
                const cells = Array.from(row.querySelectorAll('.ant-table-cell'));
                return {
                    code: cells[0]?.innerText.trim(),
                    id: cells[1]?.innerText.trim(),
                    name: cells[2]?.innerText.trim()
                };
            });
        });

        allData = allData.concat(pageData);

        const nextButton = await page.$('.ant-pagination-next:not(.ant-pagination-disabled)');
        if (nextButton) {
            await nextButton.click();
            await new Promise(r => setTimeout(r, 2000)); 
            await page.waitForSelector('.ant-table-row', { visible: true });
        } else {
            hasNextPage = false;
        }
    }

    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
    fs.writeFileSync(path.join(dataDir, 'manufacturers.json'), JSON.stringify(allData, null, 2));
    return allData;
}

module.exports = { selectTwoWheelerTab, selectVehicleType, openMakeLookup, scrapeManufacturers };
