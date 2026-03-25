const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function searchAndSelectManufacturer(page, code) {
    try {
        const searchInput = await page.waitForSelector(
            'input[placeholder*="search"], input[placeholder*="Search"], input[placeholder*="Filter"]',
            { visible: true, timeout: 3000 }
        ).catch(() => null);

        if (!searchInput) {
            console.log('  ⚠️ No search input found');
            return false;
        }

        await page.evaluate((code) => {
            const inputs = Array.from(document.querySelectorAll('input'));
            const searchInput = inputs.find(input =>
                input.placeholder.toLowerCase().includes('search') ||
                input.placeholder.toLowerCase().includes('filter') ||
                input.id === 'searchInput'
            );

            if (searchInput) {
                searchInput.value = code;
                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                searchInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }, code);

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
            const inputs = Array.from(document.querySelectorAll('input'));
            const searchInput = inputs.find(input =>
                input.placeholder.toLowerCase().includes('search') ||
                input.placeholder.toLowerCase().includes('filter')
            );

            if (searchInput) {
                searchInput.value = '';
                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                searchInput.dispatchEvent(new Event('change', { bubbles: true }));
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
