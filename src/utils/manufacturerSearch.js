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
                console.log(`[PAGE] Button ${idx}: text="${btn.innerText || btn.textContent}" class="${btn.className}"`);
            });
            
            const searchBtn = buttons.find(btn => 
                btn.innerText.includes('Search') || btn.textContent.includes('Search')
            );
            
            if (searchBtn) {
                console.log(`[PAGE] ✅ Search button found! Current page state:`);
                const rowsBefore = Array.from(document.querySelectorAll('.ant-table-row'));
                console.log(`[PAGE] Rows visible BEFORE click: ${rowsBefore.length}`);
                
                console.log(`[PAGE] Clicking Search button...`);
                searchBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                return true;
            }
            
            console.log(`[PAGE] ❌ Search button NOT found`);
            return false;
        });

        if (!searchButtonClicked) {
            console.log(`    ❌ Search button NOT found or not clicked`);
            return false;
        }

        console.log(`    ✅ Search button clicked, waiting for results (1s)...`);
        await wait(1000);
        
        console.log(`    📊 Checking page load status...`);
        const loadingStatus = await page.evaluate(() => {
            const loadingOverlay = document.querySelector('.ant-spin');
            const loadingVisible = loadingOverlay && loadingOverlay.offsetHeight > 0;
            console.log(`[PAGE] Loading spinner visible: ${loadingVisible}`);
            
            const rows = Array.from(document.querySelectorAll('.ant-table-row'));
            console.log(`[PAGE] Rows after 1s wait: ${rows.length}`);
            
            return { loadingVisible, rowCount: rows.length };
        });
        
        if (loadingStatus.loadingVisible) {
            console.log(`    ⏳ Still loading, waiting additional 2s...`);
            await wait(2000);
        } else {
            console.log(`    ✅ Page appears loaded, waiting 1s more for safety...`);
            await wait(1000);
        }

        console.log(`    🔍 Searching for result row with code: ${code}`);
        
        const found = await page.evaluate((code) => {
            console.log(`[PAGE] ===== POST-SEARCH DOM ANALYSIS =====`);
            
            console.log(`[PAGE] Searching for all possible table structures...`);
            
            const structures = {
                'table-row': Array.from(document.querySelectorAll('.ant-table-row')),
                'tbody-row': Array.from(document.querySelectorAll('.ant-table-tbody .ant-table-row')),
                'data-row-key': Array.from(document.querySelectorAll('[data-row-key]')),
                'flex-row': Array.from(document.querySelectorAll('div[style*="flex"]')),
                'modal-body': document.querySelector('.ant-modal-body'),
                'container': document.querySelector('.container')
            };
            
            console.log(`[PAGE] Structure summary:`);
            console.log(`[PAGE]   .ant-table-row: ${structures['table-row'].length}`);
            console.log(`[PAGE]   .ant-table-tbody .ant-table-row: ${structures['tbody-row'].length}`);
            console.log(`[PAGE]   [data-row-key]: ${structures['data-row-key'].length}`);
            console.log(`[PAGE]   Modal body present: ${!!structures['modal-body']}`);
            console.log(`[PAGE]   Container present: ${!!structures['container']}`);
            
            console.log(`[PAGE] Checking if modal structure changed...`);
            const modalBody = document.querySelector('.ant-modal-body');
            if (modalBody) {
                const allText = modalBody.innerText;
                const lines = allText.split('\n').slice(0, 10);
                console.log(`[PAGE] Modal content (first 10 lines):`);
                lines.forEach((line, idx) => {
                    console.log(`[PAGE]   ${idx}: "${line.substring(0, 80)}"`);
                });
            }
            
            const rows = Array.from(document.querySelectorAll('.ant-table-row'));
            console.log(`[PAGE] Using .ant-table-row (found ${rows.length})`);
            
            if (rows.length === 0) {
                console.log(`[PAGE] ⚠️ No rows found with .ant-table-row, trying alternatives...`);
                
                const altRows = Array.from(document.querySelectorAll('[data-row-key]'));
                console.log(`[PAGE] Trying [data-row-key]: found ${altRows.length}`);
                if (altRows.length > 0) {
                    console.log(`[PAGE] Using alternative selector [data-row-key]`);
                    
                    let altTarget = null;
                    for (const row of altRows) {
                        const cells = Array.from(row.querySelectorAll('.ant-table-cell'));
                        if (cells.length > 0) {
                            const firstCell = cells[0];
                            const cellText = firstCell ? firstCell.innerText.trim() : '';
                            if (cellText === code) {
                                altTarget = row;
                                console.log(`[PAGE] Found match in alt rows: "${cellText}"`);
                                break;
                            }
                        }
                    }
                    
                    if (altTarget) {
                        console.log(`[PAGE] ✅ Found matching row in alt structure! Clicking...`);
                        altTarget.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                        return true;
                    }
                    console.log(`[PAGE] ❌ No match found in alternative rows`);
                    return false;
                }
                console.log(`[PAGE] ❌ No rows found with any selector`);
                return false;
            }
            

            console.log(`[PAGE] Found ${rows.length} rows, inspecting first 5...`);
            rows.slice(0, 5).forEach((row, idx) => {
                const cells = Array.from(row.querySelectorAll('.ant-table-cell'));
                if (cells.length === 0) {
                    console.log(`[PAGE] Row ${idx}: NO .ant-table-cell, using innerText: "${row.innerText.substring(0, 100)}"`);
                } else {
                    console.log(`[PAGE] Row ${idx}: ${cells.length} cells`);
                    cells.forEach((cell, cidx) => {
                        const text = cell.innerText.trim();
                        console.log(`[PAGE]   Cell ${cidx}: "${text}"`);
                    });
                }
            });

            console.log(`[PAGE] Searching for match with code: "${code}"`);
            const target = rows.find((row, idx) => {
                let cells = Array.from(row.querySelectorAll('.ant-table-cell'));
                let cellText = '';
                
                if (cells.length > 0) {
                    cellText = cells[0].innerText.trim();
                } else {
                    cellText = row.innerText.trim().split('\n')[0];
                }
                
                const isMatch = cellText === code;
                if (idx < 3 || isMatch) {
                    console.log(`[PAGE]   Row ${idx}: "${cellText}" vs "${code}" = ${isMatch}`);
                }
                return isMatch;
            });

            if (target) {
                console.log(`[PAGE] ✅ Found matching row! Clicking...`);
                target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                return true;
            }
            
            console.log(`[PAGE] ❌ No matching row found for code: ${code}`);
            console.log(`[PAGE] Checking if modal structure is different...`);
            
            const modalBody = document.querySelector('.ant-modal-body');
            if (modalBody) {
                console.log(`[PAGE] Modal body found, checking inner structure:`);
                const innerTables = modalBody.querySelectorAll('.ant-table-row');
                console.log(`[PAGE] Found ${innerTables.length} rows inside modal body`);
            }
            
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
