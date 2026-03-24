/**
 * Vehicle Type Helper
 * Utilities for working with Vehicle Type dropdowns
 */

const wait = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Extract all available vehicle type options from the dropdown
 */
async function getAvailableVehicleTypes(page) {
    // Click to open dropdown
    await page.click('#vehicleType');
    await wait(1500);

    // Extract all options (skip the first placeholder if any)
    const options = await page.evaluate(() => {
        const optionElements = Array.from(
            document.querySelectorAll('.ant-select-item-option-content')
        );
        return optionElements.map(el => ({
            label: el.innerText.trim(),
            value: el.getAttribute('data-value') || el.innerText.trim()
        }));
    });

    // Close dropdown by pressing Escape
    await page.keyboard.press('Escape');
    await wait(500);

    // Filter out empty/placeholder options
    return options.filter(opt => opt.label && opt.label.length > 0);
}

/**
 * Select a specific vehicle type by label
 */
async function selectVehicleTypeByLabel(page, label) {
    console.log(`  📌 Selecting Vehicle Type: ${label}`);
    
    // Click to open dropdown
    await page.click('#vehicleType');
    await wait(1500);

    // Find and click the matching option
    const found = await page.evaluate((targetLabel) => {
        const options = Array.from(
            document.querySelectorAll('.ant-select-item-option-content')
        );
        const option = options.find(opt => 
            opt.innerText.trim() === targetLabel
        );
        
        if (option) {
            option.click();
            return true;
        }
        return false;
    }, label);

    if (!found) {
        throw new Error(`Vehicle type option not found: ${label}`);
    }

    await wait(1500);
    return found;
}

/**
 * Get currently selected vehicle type
 */
async function getCurrentVehicleType(page) {
    return await page.evaluate(() => {
        const selected = document.querySelector('.ant-select-selection-item');
        return selected ? selected.innerText.trim() : null;
    });
}

/**
 * Check if Vehicle Type field is available/visible
 */
async function isVehicleTypeAvailable(page) {
    try {
        const field = await page.$('#vehicleType');
        return field !== null;
    } catch (err) {
        return false;
    }
}

module.exports = {
    getAvailableVehicleTypes,
    selectVehicleTypeByLabel,
    getCurrentVehicleType,
    isVehicleTypeAvailable
};
