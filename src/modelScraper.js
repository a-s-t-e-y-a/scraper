const fs = require('fs');
const path = require('path');

const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function pollForRows(page, selector, timeout = 12000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        const count = await page.evaluate((sel) => document.querySelectorAll(sel).length, selector);
        if (count > 0) return count;
        await wait(600);
    }
    throw new Error(`Timeout: no rows found for ${selector}`);
}

async function domClick(page, evalFn) {
    return await page.evaluate(evalFn);
}

async function scrapeAllModels(page, manufacturers) {
    const result = [];
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
    const outputPath = path.join(dataDir, 'manufacturers_with_models.json');

    for (let i = 0; i < manufacturers.length; i++) {
        const mfr = manufacturers[i];
        console.log(`[${i + 1}/${manufacturers.length}] 🔍 ${mfr.name}`);

        try {
            // 1. OPEN MAKE MODAL
            await domClick(page, () => {
                const icon = document.querySelector('#manufacturer')?.closest('.ant-input-affix-wrapper')?.querySelector('.anticon-search');
                if (icon) { icon.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); return true; }
                return false;
            });
            await wait(2000);
            
            // CLEAR THE MAKE SEARCH FIELD (IF ANY)
            await domClick(page, () => {
                const clearBtn = document.querySelector('.ant-modal-body button.ant-btn-default:nth-child(2)'); // The Clear button next to Search
                if (clearBtn && clearBtn.innerText.includes('Clear')) clearBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                return true;
            });
            await wait(1500);
            
            await pollForRows(page, '.ant-modal-body .ant-table-row');

            // 2. FIND AND SELECT MANUFACTURER
            // ... (rest of the find manufacturer block remains unchanged) ...
            let found = false;
            let mfrPagesDone = false;

            while (!mfrPagesDone) {
                const currentActivePage = await page.evaluate(() => {
                    const active = document.querySelector('.ant-modal-body .ant-pagination-item-active');
                    return active ? parseInt(active.title || active.innerText) : 1;
                });

                found = await page.evaluate((code) => {
                    const rows = Array.from(document.querySelectorAll('.ant-modal-body .ant-table-row'));
                    const target = rows.find(r => {
                        const cell = r.querySelector('.ant-table-cell');
                        return cell && cell.innerText.trim() === code;
                    });
                    if (target) {
                        target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                        return true;
                    }
                    return false;
                }, mfr.code);

                if (found) break;

                const isNextDisabled = await page.evaluate(() => {
                    const nextLi = document.querySelector('.ant-modal-body .ant-pagination-next');
                    return nextLi?.classList.contains('ant-pagination-disabled') || nextLi?.getAttribute('aria-disabled') === 'true';
                });

                if (isNextDisabled) break;

                await page.evaluate(() => {
                    const btn = document.querySelector('.ant-modal-body .ant-pagination-next button');
                    if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                });
                await wait(1500);

                const newActivePage = await page.evaluate(() => {
                    const active = document.querySelector('.ant-modal-body .ant-pagination-item-active');
                    return active ? parseInt(active.title || active.innerText) : 1;
                });
                
                if (newActivePage === currentActivePage) { mfrPagesDone = true; break; }
                await pollForRows(page, '.ant-modal-body .ant-table-row');
            }

            if (!found) {
                console.log(`  ⚠️ Make not found - skipping.`);
                result.push({ ...mfr, models: [] });
                // Need to close Make modal since we didn't select
                await page.evaluate(() => {
                    const btn = document.querySelector('.ant-modal-close');
                    if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                });
                await wait(1000);
                continue;
            }

            // Wait for Make modal to close and form to absorb value
            await wait(2000);

            // 3. OPEN MODEL MODAL
            const modelOpened = await domClick(page, () => {
                const icon = document.querySelector('#model')?.closest('.ant-input-affix-wrapper')?.querySelector('.anticon-search');
                if (icon) { icon.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); return true; }
                return false;
            });

            if (!modelOpened) {
                console.log(`  ⚠️  Model search icon click failed - skipping.`);
                result.push({ ...mfr, models: [] });
                continue;
            }

            await wait(2000);

            // CLEAR THE MODEL SEARCH FIELD (USING THE 'Clear' BUTTON IN THE MODAL UI)
            await domClick(page, () => {
                // Find all buttons in the modal and click the one that has 'Clear' text
                const buttons = Array.from(document.querySelectorAll('.ant-modal-body button'));
                const clearBtn = buttons.find(b => b.innerText.includes('Clear'));
                if (clearBtn) clearBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                return true;
            });
            await wait(1500);
            
            // Check if Model Modal actually opened (sometimes it's empty and doesn't open)
            const count = await page.evaluate(() => document.querySelectorAll('.ant-modal-body .ant-table-row').length);
            if (count === 0) {
                console.log(`  ⚠️  No models returned (modal didn't open or empty) - skipping.`);
                result.push({ ...mfr, models: [] });
                await page.evaluate(() => document.querySelector('.ant-modal-close')?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));
                await wait(1000);
                continue;
            }

            await pollForRows(page, '.ant-modal-body .ant-table-row');

            // 4. SCRAPE ALL MODELS PAGES
            let allModels = [];
            let loops = 0;

            while (loops < 50) { // Safety break
                loops++;
                const currentActivePage = await page.evaluate(() => {
                    const active = document.querySelector('.ant-modal-body .ant-pagination-item-active');
                    return active ? parseInt(active.title || active.innerText) : 1;
                });

                const pageData = await page.evaluate(() => {
                    return Array.from(document.querySelectorAll('.ant-modal-body .ant-table-row')).map(row => {
                        const cells = Array.from(row.querySelectorAll('.ant-table-cell'));
                        return {
                            vehicleCode: cells[0]?.innerText.trim(),
                            modelDescription: cells[1]?.innerText.trim(),
                            bodyDescription: cells[2]?.innerText.trim(),
                            cubicCapacity: cells[3]?.innerText.trim(),
                            fuel: cells[4]?.innerText.trim(),
                            gvw: cells[5]?.innerText.trim(),
                            noOfDrivers: cells[6]?.innerText.trim(),
                            seatingCapacity: cells[7]?.innerText.trim(),
                            vehicleWatt: cells[8]?.innerText.trim()
                        };
                    }).filter(model => model.cubicCapacity && model.fuel && model.seatingCapacity); // 🚨 FILTER OUT MAKE ROWS
                });

                allModels = allModels.concat(pageData);

                const isNextDisabled = await page.evaluate(() => {
                    const nextLi = document.querySelector('.ant-modal-body .ant-pagination-next');
                    return nextLi?.classList.contains('ant-pagination-disabled') || nextLi?.getAttribute('aria-disabled') === 'true';
                });

                if (isNextDisabled) break;

                await page.evaluate(() => {
                    const btn = document.querySelector('.ant-modal-body .ant-pagination-next button');
                    if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                });

                await wait(1500);

                const newActivePage = await page.evaluate(() => {
                    const active = document.querySelector('.ant-modal-body .ant-pagination-item-active');
                    return active ? parseInt(active.title || active.innerText) : 1;
                });

                if (newActivePage === currentActivePage) break;

                await pollForRows(page, '.ant-modal-body .ant-table-row');
            }

            console.log(`  ✅ Extracted ${allModels.length} models.`);
            result.push({ ...mfr, models: allModels });

            // 5. CLOSE MODEL MODAL
            await page.evaluate(() => {
                const btn = document.querySelector('.ant-modal-close');
                if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            });
            await wait(1500);

            // SAVE INCREMENTALLY
            fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

        } catch (err) {
            console.log(`  ❌ ${err.message}`);
            result.push({ ...mfr, models: [] });
            try { 
                await page.evaluate(() => document.querySelector('.ant-modal-close')?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));
            } catch (_) {}
            await wait(1500);
        }
    }

    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    return result;
}

module.exports = { scrapeAllModels };
