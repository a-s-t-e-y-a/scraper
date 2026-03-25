const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function searchAndSelectManufacturer(page, code) {
    try {
        console.log(`    🔍 Attempting search for: ${code}`);
        
        const searchInput = await page.waitForSelector(
            'input#value[placeholder*="Search"], input[id="value"]',
            { visible: true, timeout: 3000 }
        ).catch(() => null);

        if (!searchInput) {
            console.log(`    ❌ Search input NOT found with selector: input#value`);
            console.log(`    📋 Checking what inputs exist on page...`);
            
            const allInputs = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('input')).map(inp => ({
                    id: inp.id,
                    placeholder: inp.placeholder,
                    type: inp.type,
                    value: inp.value,
                    visible: inp.offsetHeight > 0
                }));
            });
            
            console.log(`    Found inputs:`, JSON.stringify(allInputs, null, 2));
            return false;
        }

        console.log(`    ✅ Search input FOUND (id="value")`);

        await page.evaluate((code) => {
            const input = document.querySelector('input#value');
            if (input) {
                console.log(`[PAGE] Setting input value to: ${code}`);
                input.value = code;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }, code);

        console.log(`    ✅ Typed manufacturer code: ${code}`);
        await wait(500);

        const searchButtonClicked = await page.evaluate(() => {
            console.log(`[PAGE] Looking for Search button...`);
            const buttons = Array.from(document.querySelectorAll('.ant-btn'));
            console.log(`[PAGE] Found ${buttons.length} buttons total`);
            
            buttons.forEach((btn, idx) => {
                console.log(`[PAGE] Button ${idx}: "${btn.innerText || btn.textContent}"`);
            });
            
            const searchBtn = buttons.find(btn => 
                btn.innerText.includes('Search') || btn.textContent.includes('Search')
            );
            
            if (searchBtn) {
                console.log(`[PAGE] Search button found! Clicking it...`);
                searchBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                return true;
            }
            
            console.log(`[PAGE] Search button NOT found`);
            return false;
        });

        if (!searchButtonClicked) {
            console.log(`    ❌ Search button NOT found or not clicked`);
            return false;
        }

        console.log(`    ✅ Search button clicked`);
        await wait(2000);

        console.log(`    🔍 Searching for result row with code: ${code}`);
        
        const found = await page.evaluate((code) => {
            const rows = Array.from(document.querySelectorAll('.ant-table-row'));
            console.log(`[PAGE] Found ${rows.length} table rows`);
            
            if (rows.length === 0) {
                console.log(`[PAGE] No rows found!`);
                return false;
            }

            rows.slice(0, 5).forEach((row, idx) => {
                const firstCell = row.querySelector('.ant-table-cell');
                const cellText = firstCell ? firstCell.innerText.trim() : 'N/A';
                console.log(`[PAGE] Row ${idx}: "${cellText}"`);
            });

            const target = rows.find(row => {
                const firstCell = row.querySelector('.ant-table-cell');
                const cellText = firstCell ? firstCell.innerText.trim() : '';
                return cellText === code;
            });

            if (target) {
                console.log(`[PAGE] ✅ Found matching row! Clicking...`);
                target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                return true;
            }
            
            console.log(`[PAGE] ❌ No matching row found for code: ${code}`);
            return false;
        }, code);

        if (found) {
            console.log(`    ✅ Manufacturer found and clicked via search!`);
        } else {
            console.log(`    ❌ Manufacturer NOT found in results`);
        }
        
        return found;
    } catch (err) {
        console.log(`    ❌ Search failed with error: ${err.message}`);
        console.log(`    Stack: ${err.stack}`);
        return false;
    }
}

async function clearSearchInput(page) {
    try {
        console.log(`    🧹 Clearing search input...`);
        
        const cleared = await page.evaluate(() => {
            const input = document.querySelector('input#value');
            if (input) {
                console.log(`[PAGE] Clearing input field`);
                input.value = '';
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }

            const buttons = Array.from(document.querySelectorAll('.ant-btn'));
            console.log(`[PAGE] Looking for Clear button among ${buttons.length} buttons`);
            
            const clearBtn = buttons.find(btn => 
                btn.innerText.includes('Clear') || btn.textContent.includes('Clear')
            );
            
            if (clearBtn) {
                console.log(`[PAGE] Clear button found and clicked`);
                clearBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                return true;
            }
            
            console.log(`[PAGE] Clear button NOT found`);
            return false;
        });

        if (cleared) {
            console.log(`    ✅ Search input cleared`);
        }
        await wait(1000);
    } catch (err) {
        console.log(`    ❌ Failed to clear search: ${err.message}`);
    }
}

module.exports = {
    searchAndSelectManufacturer,
    clearSearchInput
};
