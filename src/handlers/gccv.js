const BaseHandler = require('./baseHandler');
const fs = require('fs');
const path = require('path');
const { getAvailableVehicleTypes, selectVehicleTypeByLabel } = require('../utils/vehicleTypeHelper');

const wait = (ms) => new Promise(r => setTimeout(r, ms));

class GCCVHandler extends BaseHandler {
    constructor() {
        super('GCCV', {
            outputDir: require('path').join(__dirname, '../../data')
        });

        this.selectors = {
            tabMenuSelector: '.tabmenu',
            tabDisplayText: 'GCCV',
            vehicleTypeSelector: '#vehicleType',
            vehicleTypeOption: 'GCCV',
            manufacturerSearchIcon: '#manufacturer',
            modelSearchIcon: '#model'
        };
    }

    shouldIterateVehicleTypes() {
        return true;
    }

    async getAvailableManufacturersFromPortal(page) {
        await wait(1500);
        
        await this.domClick(page, () => {
            const icon = document.querySelector('#manufacturer')?.closest('.ant-input-affix-wrapper')?.querySelector('.anticon-search');
            if (icon) {
                icon.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                return true;
            }
            return false;
        });
        
        await wait(2000);
        
        const manufacturers = [];
        let loopsLeft = 30;
        
        while (loopsLeft > 0) {
            loopsLeft--;
            
            const pageData = await page.evaluate(() => {
                const rows = Array.from(document.querySelectorAll('.ant-modal-body .ant-table-row'));
                return rows.map(row => {
                    const cells = Array.from(row.querySelectorAll('.ant-table-cell'));
                    return {
                        code: cells[0]?.innerText.trim(),
                        id: cells[1]?.innerText.trim(),
                        name: cells[2]?.innerText.trim()
                    };
                }).filter(m => m.code && m.name);
            });
            
            manufacturers.push(...pageData);
            
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
        }
        
        await page.evaluate(() => {
            const btn = document.querySelector('.ant-modal-close');
            if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        });
        await wait(1000);
        
        return manufacturers;
    }

    async execute(page, manufacturers) {
        console.log(`\n🚀 Starting ${this.getProductTypeName()} scraping...`);
        console.log(`\n📋 Iterating over Vehicle Type options...\n`);

        const vehicleTypes = await getAvailableVehicleTypes(page);
        console.log(`Found ${vehicleTypes.length} vehicle type options:`);
        vehicleTypes.forEach((vt, idx) => console.log(`  ${idx + 1}. ${vt.label}`));
        console.log();

        let allResults = [];

        for (let typeIdx = 1; typeIdx < vehicleTypes.length; typeIdx++) {
            const vehicleType = vehicleTypes[typeIdx];
            console.log(`\n${'='.repeat(70)}`);
            console.log(`🔄 Processing Vehicle Type [${typeIdx}/${vehicleTypes.length - 1}]: ${vehicleType.label}`);
            console.log(`${'='.repeat(70)}\n`);

            try {
                await selectVehicleTypeByLabel(page, vehicleType.label);
            } catch (err) {
                console.log(`  ❌ Failed to select vehicle type: ${err.message}`);
                continue;
            }

            console.log('📥 Fetching available manufacturers for this vehicle type...');
            const gccvManufacturers = await this.getAvailableManufacturersFromPortal(page);
            console.log(`✅ Found ${gccvManufacturers.length} manufacturers for this variant.\n`);

            let typeResult = [];
            const typeOutputFileName = this.getOutputFileNameForVehicleType(vehicleType);
            const typeOutputPath = path.join(this.config.outputDir, typeOutputFileName);

            if (fs.existsSync(typeOutputPath)) {
                try {
                    const fileData = fs.readFileSync(typeOutputPath, 'utf-8');
                    if (fileData.trim()) {
                        typeResult = JSON.parse(fileData);
                        console.log(`📂 Found existing data with ${typeResult.length} manufacturers. Resuming...\n`);
                    }
                } catch (e) {
                    console.log('⚠️ Could not parse existing JSON. Starting fresh.\n');
                }
            }

            const processedCodes = new Set(typeResult.map(m => m.code));

            for (let mIdx = 0; mIdx < gccvManufacturers.length; mIdx++) {
                const mfr = gccvManufacturers[mIdx];

                if (processedCodes.has(mfr.code)) {
                    console.log(`[${mIdx + 1}/${gccvManufacturers.length}] ⏭️  Skipping ${mfr.name} (Already scraped)`);
                    continue;
                }

                console.log(`[${mIdx + 1}/${gccvManufacturers.length}] 🔍 ${mfr.name}`);

                try {
                    const models = await this.scrapeModelsForManufacturer(page, mfr);
                    typeResult.push({ ...mfr, models, vehicleType: vehicleType.label });
                    console.log(`  ✅ Extracted ${models.length} models.`);

                    this.saveData(typeOutputPath, typeResult);
                } catch (err) {
                    console.log(`  ❌ ${err.message}`);
                    typeResult.push({ ...mfr, models: [], vehicleType: vehicleType.label });
                    
                    try {
                        await page.evaluate(() => {
                            const closeBtn = document.querySelector('.ant-modal-close');
                            if (closeBtn) closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                        });
                    } catch (_) {}
                    await wait(1500);
                }
            }

            console.log(`\n✅ Vehicle Type Complete: ${vehicleType.label} → ${typeOutputFileName}`);
            allResults.push({ vehicleType: vehicleType.label, count: typeResult.length });
        }

        console.log(`\n${'='.repeat(70)}`);
        console.log(`🎉 All Vehicle Types Processed!\n`);
        allResults.forEach(result => {
            console.log(`  • ${result.vehicleType}: ${result.count} manufacturers`);
        });
        console.log(`${'='.repeat(70)}\n`);

        return allResults;
    }

    async scrapeModelsForManufacturer(page, mfr) {
        const models = [];

        try {
            await this.openMakeModal(page);
            await wait(2000);

            await this.domClick(page, () => {
                const clearBtn = document.querySelector('.ant-modal-body button.ant-btn-default:nth-child(2)');
                if (clearBtn && clearBtn.innerText.includes('Clear')) {
                    clearBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                }
                return true;
            });
            await wait(1500);

            await this.pollForElements(page, '.ant-table-row');

            const found = await this.findAndSelectManufacturer(page, mfr.code);
            if (!found) {
                console.log(`  ⚠️ Make not found - skipping.`);
                await page.evaluate(() => {
                    const btn = document.querySelector('.ant-modal-close');
                    if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                });
                await wait(1000);
                return [];
            }

            await wait(2000);

            const modelOpened = await this.openModelModal(page);
            if (!modelOpened) {
                console.log(`  ⚠️ Model search icon click failed - skipping.`);
                return [];
            }

            await wait(2000);

            await this.domClick(page, () => {
                const activeModal = Array.from(document.querySelectorAll('.ant-modal-content')).pop();
                if (!activeModal) return false;
                const buttons = Array.from(activeModal.querySelectorAll('button'));
                const clearBtn = buttons.find(b => b.innerText.includes('Clear'));
                if (clearBtn) clearBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                return true;
            });
            await wait(1500);

            const rowCount = await page.evaluate(() => {
                const activeModal = Array.from(document.querySelectorAll('.ant-modal-content')).pop();
                return activeModal ? activeModal.querySelectorAll('.ant-table-row').length : 0;
            });

            if (rowCount === 0) {
                console.log(`  ⚠️ No models returned - skipping.`);
                await page.evaluate(() => {
                    const activeModal = Array.from(document.querySelectorAll('.ant-modal-content')).pop();
                    activeModal?.querySelector('.ant-modal-close')?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                });
                await wait(1000);
                return [];
            }

            await this.pollForElements(page, '.ant-table-row');

            const allModels = await this.scrapeAllModelPages(page);

            await page.evaluate(() => {
                const btn = document.querySelector('.ant-modal-close');
                if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            });
            await wait(1500);

            return allModels;
        } catch (err) {
            throw err;
        }
    }

    async openMakeModal(page) {
        await this.domClick(page, () => {
            const icon = document.querySelector('#manufacturer')?.closest('.ant-input-affix-wrapper')?.querySelector('.anticon-search');
            if (icon) {
                icon.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                return true;
            }
            return false;
        });
    }

    async findAndSelectManufacturer(page, code) {
        console.log(`  📱 Starting manufacturer lookup for: ${code}`);
        console.log(`  ─────────────────────────────────────────`);

        let mfrPagesDone = false;

        while (!mfrPagesDone) {
            found = await page.evaluate((mfrCode) => {
                const rows = Array.from(document.querySelectorAll('.ant-modal-body .ant-table-row'));
                const target = rows.find(r => {
                    const cell = r.querySelector('.ant-table-cell');
                    return cell && cell.innerText.trim() === mfrCode;
                });
                if (target) {
                    target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                    return true;
                }
                return false;
            }, code);

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

            mfrPagesDone = found;
            await this.pollForElements(page, '.ant-modal-body .ant-table-row');
        }

        return found;
    }

    async openModelModal(page) {
        return await this.domClick(page, () => {
            const icon = document.querySelector('#model')?.closest('.ant-input-affix-wrapper')?.querySelector('.anticon-search');
            if (icon) {
                icon.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                return true;
            }
            return false;
        });
    }

    async scrapeAllModelPages(page) {
        let allModels = [];
        let loops = 0;

        while (loops < 50) {
            loops++;

            const pageData = await page.evaluate(() => {
                const activeModal = Array.from(document.querySelectorAll('.ant-modal-content')).pop();
                if (!activeModal) return [];
                return Array.from(activeModal.querySelectorAll('.ant-table-row')).map(row => {
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
                }).filter(model => model.cubicCapacity && model.fuel && model.seatingCapacity);
            });

            allModels = allModels.concat(pageData);

            const isNextDisabled = await page.evaluate(() => {
                const activeModal = Array.from(document.querySelectorAll('.ant-modal-content')).pop();
                const nextLi = activeModal?.querySelector('.ant-pagination-next');
                return nextLi?.classList.contains('ant-pagination-disabled') || nextLi?.getAttribute('aria-disabled') === 'true';
            });

            if (isNextDisabled) break;

            await page.evaluate(() => {
                const activeModal = Array.from(document.querySelectorAll('.ant-modal-content')).pop();
                const btn = activeModal?.querySelector('.ant-pagination-next button');
                if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            });

            await wait(1500);
            await this.pollForElements(page, '.ant-modal-body .ant-table-row');
        }

        return allModels;
    }
}

module.exports = new GCCVHandler();
