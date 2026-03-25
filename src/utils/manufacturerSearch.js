const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function searchAndSelectManufacturer(page, code) {
    try {
        const searchInput = await page.waitForSelector(
            'input#value[placeholder*="Search"], input[id="value"]',
            { visible: true, timeout: 3000 }
        ).catch(() => null);

        if (!searchInput) {
            console.log('  ⚠️ No search input found');
            return false;
        }

        await page.evaluate((code) => {
            const input = document.querySelector('input#value');
            if (input) {
                input.value = code;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }, code);

        await wait(500);

        const searchButtonClicked = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('.ant-btn'));
            const searchBtn = buttons.find(btn => 
                btn.innerText.includes('Search') || btn.textContent.includes('Search')
            );
            
            if (searchBtn) {
                searchBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                return true;
            }
            return false;
        });

        if (!searchButtonClicked) {
            console.log('  ⚠️ Search button not found');
            return false;
        }

        await wait(2000);

        const found = await page.evaluate((code) => {
            const rows = Array.from(document.querySelectorAll('.ant-table-row'));
            if (rows.length === 0) return false;

            const target = rows.find(row => {
                const firstCell = row.querySelector('.ant-table-cell');
                return firstCell && firstCell.innerText.trim() === code;
            });

            if (target) {
                target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                return true;
            }
            return false;
        }, code);

        return found;
    } catch (err) {
        console.log(`  ⚠️ Search failed: ${err.message}`);
        return false;
    }
}

async function clearSearchInput(page) {
    try {
        await page.evaluate(() => {
            const input = document.querySelector('input#value');
            if (input) {
                input.value = '';
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }

            const buttons = Array.from(document.querySelectorAll('.ant-btn'));
            const clearBtn = buttons.find(btn => 
                btn.innerText.includes('Clear') || btn.textContent.includes('Clear')
            );
            
            if (clearBtn) {
                clearBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            }
        });
        await wait(1000);
    } catch (err) {
        console.log(`  ⚠️ Failed to clear search: ${err.message}`);
    }
}

module.exports = {
    searchAndSelectManufacturer,
    clearSearchInput
};
