const BaseHandler = require('./baseHandler');
const fs = require('fs');
const path = require('path');
const { getAvailableVehicleTypes, selectVehicleTypeByLabel } = require('../utils/vehicleTypeHelper');

const wait = (ms) => new Promise(r => setTimeout(r, ms));

class PCCVHandler extends BaseHandler {
    constructor() {
        super('PCCV', {
            outputDir: require('path').join(__dirname, '../../data')
        });

        this.selectors = {
            tabMenuSelector: '.tabmenu',
            tabDisplayText: 'PCCV',
            vehicleTypeSelector: '#vehicleType',
            vehicleTypeOption: 'PCCV',
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
            
            await page.evaluate(() => {
                const virtualHolder = document.querySelector('.ant-table-tbody-virtual-holder');
                if (virtualHolder) {
                    virtualHolder.scrollTop = virtualHolder.scrollHeight;
                }
            });
            await wait(1500);
            
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

    async getDropdownOptionsCount(page, inputId) {
        await wait(1000);
        const isOpen = await page.evaluate((id) => {
            const input = document.querySelector(`#${id}`);
            const selector = input ? input.closest('.ant-select-selector') : null;
            if (selector) {
                selector.click();
                return true;
            }
            return false;
        }, inputId);

        if (!isOpen) return 0;
        await wait(2000);

        const count = await page.evaluate(() => {
            const activeDropdown = Array.from(document.querySelectorAll('.ant-select-dropdown:not(.ant-select-dropdown-hidden)'));
            if (!activeDropdown.length) return 0;
            return activeDropdown[activeDropdown.length - 1].querySelectorAll('.ant-select-item-option').length;
        });

        // Close dropdown
        await page.keyboard.press('Escape');
        await wait(1000);
        return count;
    }

    async selectDropdownOption(page, inputId, index) {
        await wait(1000);
        const isOpen = await page.evaluate((id) => {
            const input = document.querySelector(`#${id}`);
            const selector = input ? input.closest('.ant-select-selector') : null;
            if (selector) {
                selector.click();
                return true;
            }
            return false;
        }, inputId);

        if (!isOpen) throw new Error(`Could not find dropdown ${inputId}`);
        await wait(2000);

        const text = await page.evaluate((idx) => {
            const activeDropdown = Array.from(document.querySelectorAll('.ant-select-dropdown:not(.ant-select-dropdown-hidden)'));
            if (!activeDropdown.length) return null;
            const options = activeDropdown[activeDropdown.length - 1].querySelectorAll('.ant-select-item-option');
            if (idx < options.length) {
                const opt = options[idx];
                const text = opt.innerText.trim();
                opt.click();
                return text;
            }
            return null;
        }, index);

        if (!text) throw new Error(`Option at index ${index} not found in ${inputId}`);
        
        await wait(1500);
        return text;
    }

    async selectRegistrationType(page) {
        await wait(1000);

        const selected = await page.evaluate(() => {
            const radioGroup = document.querySelector('#alreadyRegistered');
            if (!radioGroup) return false;

            const inputs = Array.from(radioGroup.querySelectorAll('input[type="radio"]'));
            const noOption = inputs.find(input => input.value === '0');
            
            if (noOption) {
                noOption.click();
                return true;
            }
            return false;
        });

        if (!selected) throw new Error('Failed to select "No" for registration type');

        await wait(1500);
    }

    async execute(page, manufacturers) {
        console.log(`\n🚀 Starting ${this.getProductTypeName()} scraping...`);
        console.log(`\n📋 Extracting Vehicle Type options...\n`);

        const vehicleTypes = await getAvailableVehicleTypes(page);
        console.log(`Found ${vehicleTypes.length} vehicle type options:`);
        vehicleTypes.forEach((vt, idx) => console.log(`  ${idx + 1}. ${vt.label}`));
        console.log();

        const lastIdx = vehicleTypes.length - 1;
        const indicesToProcess = [0, 1, 2, lastIdx];

        let allResults = [];

        for (let typeIdx of indicesToProcess) {
            if (typeIdx >= vehicleTypes.length) continue;
            
            const vehicleType = vehicleTypes[typeIdx];
            const typeLabel = typeIdx === 0 ? '1st (index 0)' : typeIdx === 1 ? '2nd (index 1)' : typeIdx === 2 ? '3rd (index 2)' : 'Last (index ' + typeIdx + ')';
            
            console.log(`\n${'='.repeat(70)}`);
            console.log(`🔄 Processing Vehicle Type [${typeLabel}]: ${vehicleType.label}`);
            console.log(`${'='.repeat(70)}\n`);

            try {
                await selectVehicleTypeByLabel(page, vehicleType.label);
            } catch (err) {
                console.log(`  ❌ Failed to select vehicle type: ${err.message}`);
                continue;
            }

            const isFirstOrThird = typeIdx === 0 || typeIdx === 2;
            
            if (isFirstOrThird) {
                console.log('📝 Selecting form options via nested iteration for 1st/3rd variant...');
                
                try {
                    const propCount = await this.getDropdownOptionsCount(page, 'proposalType');
                    for (let p1 = 0; p1 < propCount; p1++) {
                        const propText = await this.selectDropdownOption(page, 'proposalType', p1);
                        console.log(`  → Proposal Type: ${propText}`);

                        const polCount = await this.getDropdownOptionsCount(page, 'policyType');
                        for (let p2 = 0; p2 < polCount; p2++) {
                            const polText = await this.selectDropdownOption(page, 'policyType', p2);
                            console.log(`    → Policy Type: ${polText}`);

                            const pccvCount = await this.getDropdownOptionsCount(page, 'pccvType');
                            for (let p3 = 0; p3 < pccvCount; p3++) {
                                const pccvText = await this.selectDropdownOption(page, 'pccvType', p3);
                                console.log(`      → PCCV Type: ${pccvText}`);

                                await this.selectRegistrationType(page);
                                console.log('        ✅ Registration Type "No" selected');

                                console.log('        📥 Fetching manufacturers for this combination...');
                                const pccvManufacturers = await this.getAvailableManufacturersFromPortal(page);
                                console.log(`        ✅ Found ${pccvManufacturers.length} manufacturers.`);

                                let typeResult = [];
                                let suffix = `_${propText}_${polText}_${pccvText}`.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                                const typeOutputFileName = this.getOutputFileNameForVehicleType(vehicleType).replace('.json', `${suffix}.json`);
                                const typeOutputPath = path.join(this.config.outputDir, typeOutputFileName);

                                if (fs.existsSync(typeOutputPath)) {
                                    try {
                                        const fileData = fs.readFileSync(typeOutputPath, 'utf-8');
                                        if (fileData.trim()) typeResult = JSON.parse(fileData);
                                    } catch (e) {}
                                }

                                const processedCodes = new Set(typeResult.map(m => m.code));

                                for (let mIdx = 0; mIdx < pccvManufacturers.length; mIdx++) {
                                    const mfr = pccvManufacturers[mIdx];
                                    if (processedCodes.has(mfr.code)) continue;

                                    console.log(`        [${mIdx + 1}/${pccvManufacturers.length}] 🔍 ${mfr.name}`);
                                    try {
                                        const models = await this.scrapeModelsForManufacturer(page, mfr);
                                        typeResult.push({ 
                                            ...mfr, 
                                            models, 
                                            vehicleType: vehicleType.label,
                                            proposalType: propText,
                                            policyType: polText,
                                            pccvType: pccvText
                                        });
                                        this.saveData(typeOutputPath, typeResult);
                                    } catch (err) {
                                        console.log(`          ❌ ${err.message}`);
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
                                allResults.push({ vehicleType: `${vehicleType.label}${suffix}`, count: typeResult.length });
                            }
                        }
                    }
                } catch (err) {
                    console.log(`  ❌ Failed during selection steps: ${err.message}`);
                    console.log('  ⏭️  Skipping this vehicle type variant.\n');
                    continue;
                }
            } else {
                console.log('📥 Fetching available manufacturers for this vehicle type...');
                const pccvManufacturers = await this.getAvailableManufacturersFromPortal(page);
                console.log(`✅ Found ${pccvManufacturers.length} manufacturers for this variant.\n`);

                let typeResult = [];
                const typeOutputFileName = this.getOutputFileNameForVehicleType(vehicleType);
                const typeOutputPath = path.join(this.config.outputDir, typeOutputFileName);

                if (fs.existsSync(typeOutputPath)) {
                    try {
                        const fileData = fs.readFileSync(typeOutputPath, 'utf-8');
                        if (fileData.trim()) typeResult = JSON.parse(fileData);
                    } catch (e) {}
                }

                const processedCodes = new Set(typeResult.map(m => m.code));

                for (let mIdx = 0; mIdx < pccvManufacturers.length; mIdx++) {
                    const mfr = pccvManufacturers[mIdx];
                    if (processedCodes.has(mfr.code)) continue;

                    console.log(`[${mIdx + 1}/${pccvManufacturers.length}] 🔍 ${mfr.name}`);
                    try {
                        const models = await this.scrapeModelsForManufacturer(page, mfr);
                        typeResult.push({ ...mfr, models, vehicleType: vehicleType.label });
                        this.saveData(typeOutputPath, typeResult);
                    } catch (err) {
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
                allResults.push({ vehicleType: vehicleType.label, count: typeResult.length });
            }
        }

        console.log(`\n${'='.repeat(70)}`);
        console.log(`🎉 PCCV Processing Complete!\n`);
        allResults.forEach(result => {
            console.log(`  • ${result.vehicleType}: ${result.count} manufacturers`);
        });
        console.log(`\n✅ Processing all vehicle types: 1st, 2nd, 3rd, and Last.`);
        console.log(`   • 1st & 3rd: Additional selections (Proposal/Policy/Registration Type)`);
        console.log(`   • 2nd & Last: Direct Make-Model scraping\n`);
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

module.exports = new PCCVHandler();
