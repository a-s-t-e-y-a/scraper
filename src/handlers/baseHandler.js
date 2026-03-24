/**
 * BaseHandler: Shared logic for all product types
 * Subclasses override selectors and product-specific logic
 */

const fs = require('fs');
const path = require('path');
const { getAvailableVehicleTypes, selectVehicleTypeByLabel, getCurrentVehicleType } = require('../utils/vehicleTypeHelper');

const wait = (ms) => new Promise(r => setTimeout(r, ms));

class BaseHandler {
    constructor(productType, config = {}) {
        this.productType = productType;
        this.config = {
            outputDir: path.join(__dirname, '../data'),
            ...config
        };
        
        // Override these in subclasses
        this.selectors = {};
        this.outputFileName = `manufacturers_${productType.toLowerCase()}.json`;
    }

    /**
     * Override this to true if handler needs to iterate over vehicle type options
     */
    shouldIterateVehicleTypes() {
        return false;
    }

    /**
     * Main entry point for scraping
     */
    async execute(page, manufacturers) {
        console.log(`\n🚀 Starting ${this.getProductTypeName()} scraping...`);
        
        // Check if we should iterate vehicle types
        if (this.shouldIterateVehicleTypes()) {
            return await this.executeWithVehicleTypeIteration(page, manufacturers);
        } else {
            return await this.executeSingleVehicleType(page, manufacturers);
        }
    }

    /**
     * Execute for a single vehicle type (default behavior)
     */
    async executeSingleVehicleType(page, manufacturers) {
        let result = [];
        const outputPath = path.join(this.config.outputDir, this.outputFileName);

        // Load existing data if available
        if (fs.existsSync(outputPath)) {
            try {
                const fileData = fs.readFileSync(outputPath, 'utf-8');
                if (fileData.trim()) {
                    result = JSON.parse(fileData);
                    console.log(`\n📂 Found existing data with ${result.length} manufacturers. Resuming...`);
                }
            } catch (e) {
                console.log('⚠️ Could not parse existing JSON. Starting fresh.');
            }
        }

        const processedCodes = new Set(result.map(m => m.code));

        // Process each manufacturer
        for (let i = 0; i < manufacturers.length; i++) {
            const mfr = manufacturers[i];

            if (processedCodes.has(mfr.code)) {
                console.log(`[${i + 1}/${manufacturers.length}] ⏭️  Skipping ${mfr.name} (Already scraped)`);
                continue;
            }

            console.log(`[${i + 1}/${manufacturers.length}] 🔍 ${mfr.name}`);

            try {
                const models = await this.scrapeModelsForManufacturer(page, mfr);
                result.push({ ...mfr, models });
                console.log(`  ✅ Extracted ${models.length} models.`);

                // Save incrementally
                this.saveData(outputPath, result);
            } catch (err) {
                console.log(`  ❌ ${err.message}`);
                result.push({ ...mfr, models: [] });
                
                // Try to close any open modals
                try {
                    await page.evaluate(() => {
                        const closeBtn = document.querySelector('.ant-modal-close');
                        if (closeBtn) closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                    });
                } catch (_) {}
                await wait(1500);
            }
        }

        console.log(`\n✅ Done! Extracted data for ${result.length} manufacturers.`);
        console.log(`💾 Saved to ${this.outputFileName}`);
        return result;
    }

    /**
     * Execute with Vehicle Type iteration (for multi-variant product types like GCCV)
     */
    async executeWithVehicleTypeIteration(page, manufacturers) {
        console.log(`\n📋 Iterating over Vehicle Type options...\n`);

        // Get all available vehicle type options
        const vehicleTypes = await getAvailableVehicleTypes(page);
        console.log(`Found ${vehicleTypes.length} vehicle type options:`);
        vehicleTypes.forEach((vt, idx) => console.log(`  ${idx + 1}. ${vt.label}`));
        console.log();

        let allResults = [];

        // Process each vehicle type
        for (let typeIdx = 0; typeIdx < vehicleTypes.length; typeIdx++) {
            const vehicleType = vehicleTypes[typeIdx];
            console.log(`\n${'='.repeat(70)}`);
            console.log(`🔄 Processing Vehicle Type [${typeIdx + 1}/${vehicleTypes.length}]: ${vehicleType.label}`);
            console.log(`${'='.repeat(70)}\n`);

            // Select this vehicle type
            try {
                await selectVehicleTypeByLabel(page, vehicleType.label);
            } catch (err) {
                console.log(`  ❌ Failed to select vehicle type: ${err.message}`);
                continue;
            }

            // Scrape for this vehicle type
            let typeResult = [];
            const typeOutputFileName = this.getOutputFileNameForVehicleType(vehicleType);
            const typeOutputPath = path.join(this.config.outputDir, typeOutputFileName);

            // Load existing data for this vehicle type
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

            // Process each manufacturer for this vehicle type
            for (let mIdx = 0; mIdx < manufacturers.length; mIdx++) {
                const mfr = manufacturers[mIdx];

                if (processedCodes.has(mfr.code)) {
                    console.log(`[${mIdx + 1}/${manufacturers.length}] ⏭️  Skipping ${mfr.name} (Already scraped)`);
                    continue;
                }

                console.log(`[${mIdx + 1}/${manufacturers.length}] 🔍 ${mfr.name}`);

                try {
                    const models = await this.scrapeModelsForManufacturer(page, mfr);
                    typeResult.push({ ...mfr, models, vehicleType: vehicleType.label });
                    console.log(`  ✅ Extracted ${models.length} models.`);

                    // Save incrementally
                    this.saveData(typeOutputPath, typeResult);
                } catch (err) {
                    console.log(`  ❌ ${err.message}`);
                    typeResult.push({ ...mfr, models: [], vehicleType: vehicleType.label });
                    
                    // Try to close any open modals
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

        // Summary
        console.log(`\n${'='.repeat(70)}`);
        console.log(`🎉 All Vehicle Types Processed!\n`);
        allResults.forEach(result => {
            console.log(`  • ${result.vehicleType}: ${result.count} manufacturers`);
        });
        console.log(`${'='.repeat(70)}\n`);

        return allResults;
    }

    /**
     * Generate output filename for a specific vehicle type
     */
    getOutputFileNameForVehicleType(vehicleType) {
        // Create a slug from the vehicle type label
        const slug = vehicleType.label
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
        
        return `manufacturers_${this.productType.toLowerCase()}_${slug}.json`;
    }

    /**
     * Override this in subclasses with product-specific logic
     */
    async scrapeModelsForManufacturer(page, manufacturer) {
        throw new Error('scrapeModelsForManufacturer() must be implemented in subclass');
    }

    /**
     * Select the product type tab
     */
    async selectProductTypeTab(page) {
        console.log(`🔘 Selecting ${this.getProductTypeName()} tab...`);
        
        await page.waitForSelector(this.selectors.tabMenuSelector || '.tabmenu', { visible: true });
        
        const isSelected = await page.evaluate((tabText) => {
            const selectedTab = document.querySelector('.tabmenuselected');
            return selectedTab && selectedTab.innerText.includes(tabText);
        }, this.selectors.tabDisplayText);

        if (isSelected) {
            console.log(`✅ ${this.getProductTypeName()} tab already selected.`);
            return;
        }

        await page.evaluate((tabText) => {
            const tabs = Array.from(document.querySelectorAll('.tabmenu, .tabmenuselected'));
            const targetTab = tabs.find(tab => tab.innerText.includes(tabText));
            if (targetTab) targetTab.click();
        }, this.selectors.tabDisplayText);

        await wait(2000);
    }

    /**
     * Save data to JSON file
     */
    saveData(filePath, data) {
        try {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        } catch (err) {
            console.error('Error saving data:', err.message);
        }
    }

    /**
     * Helper: Poll for elements to appear
     */
    async pollForElements(page, selector, timeout = 12000) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const count = await page.evaluate((sel) => {
                const activeModal = Array.from(document.querySelectorAll('.ant-modal-content')).pop();
                return activeModal ? activeModal.querySelectorAll(sel).length : 0;
            }, selector);
            
            if (count > 0) return count;
            await wait(600);
        }
        throw new Error(`Timeout: no elements found for selector ${selector}`);
    }

    /**
     * Helper: Execute DOM click via page.evaluate
     */
    async domClick(page, evalFn) {
        return await page.evaluate(evalFn);
    }

    /**
     * Helper: Get product type display name
     */
    getProductTypeName() {
        const names = {
            'TW': 'Two Wheeler',
            'PC': 'Private Car',
            'PCCV': 'PCCV',
            'GCCV': 'GCCV',
            'MISCD': 'MISC-D'
        };
        return names[this.productType] || this.productType;
    }
}

module.exports = BaseHandler;
