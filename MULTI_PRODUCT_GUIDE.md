# Multi-Product Scraper Architecture

## Overview

This system allows you to scrape vehicle data for **multiple product types** using a single codebase with a clean, extensible **dispatcher/router pattern**.

## Supported Product Types

| Code | Name | File | Iterates Vehicle Types |
|------|------|------|------------------------|
| `TW` | Two Wheeler | `src/handlers/tw.js` | ❌ No |
| `PC` | Private Car | `src/handlers/privatecar.js` | ❌ No |
| `PCCV` | Private Commercial Cart Vehicle | `src/handlers/pccv.js` | ❌ No |
| `GCCV` | Good Carrying Commercial Vehicle | `src/handlers/gccv.js` | ✅ Yes |
| `MISCD` | Miscellaneous – Dual Purpose | `src/handlers/miscd.js` | ❌ No |

## Quick Start

### Default (Two Wheeler)
```bash
node src/fetchData.js
```

### Specific Product Type
```bash
node src/fetchData.js --type=GCCV
node src/fetchData.js --type=PC
node src/fetchData.js --type=PCCV
```

### Verbose Logging
```bash
node src/fetchData.js --type=GCCV --verbose
```

## Architecture

### File Structure
```
src/
├── fetchData.js              ← Main entry point (CLI dispatcher)
├── cli.js                    ← Argument parsing & validation
├── router.js                 ← Routes type → handler
├── utils/
│   └── vehicleTypeHelper.js  ← Vehicle type dropdown extraction
├── handlers/
│   ├── baseHandler.js        ← Abstract base class (shared logic)
│   ├── tw.js                 ← Two Wheeler (fully implemented)
│   ├── privatecar.js         ← Private Car (needs customization)
│   ├── pccv.js               ← PCCV (needs customization)
│   ├── gccv.js               ← GCCV (vehicle type iteration enabled)
│   └── miscd.js              ← MISC-D (needs customization)
└── ... (existing auth.js, browser.js, etc.)
```

### Data Flow

```
fetchData.js (entry point)
    ↓
cli.js (parse --type=GCCV)
    ↓
router.js (getHandler('GCCV'))
    ↓
handlers/gccv.js (shouldIterateVehicleTypes=true)
    ↓
BaseHandler.executeWithVehicleTypeIteration()
    ├─ getAvailableVehicleTypes()
    ├─ Loop: For each vehicle type option:
    │   ├─ selectVehicleTypeByLabel(vehicleType)
    │   └─ scrapeModelsForManufacturer() for all manufacturers
    └─ Save separate file per vehicle type
    ↓
data/manufacturers_gccv_*.json
```

## Vehicle Type Iteration (Multi-Variant Types)

Some product types have multiple **vehicle type sub-categories**. This is especially true for **GCCV**:

Example GCCV variants:
- GCCV – Private Carriers Other Than Three Wheelers
- Goods Carrying Motorised Three Wheelers – Public Carriers
- Goods Carrying Motorised Three Wheelers – Private Carriers

### How It Works

1. **Automatic Detection** → System extracts all dropdown options
2. **Loop Through** → For each option, select and scrape
3. **Separate Files** → Data saved per variant

### Enable in Your Handler

```javascript
class GCCVHandler extends BaseHandler {
    shouldIterateVehicleTypes() {
        return true;  // ← Enable multi-variant mode
    }

    async scrapeModelsForManufacturer(page, mfr) {
        // Your scraping logic
        // Gets called once per vehicle type variant
    }
}
```

### Output for Multi-Variant Types

```
data/
├── manufacturers_gccv_gccv_private_carriers.json
├── manufacturers_gccv_goods_carrying_three_wheelers_public.json
├── manufacturers_gccv_goods_carrying_three_wheelers_private.json
```

Each file contains:
```json
[
  {
    "code": "M_161717",
    "name": "G BYKE",
    "vehicleType": "GCCV – Private Carriers Other Than Three Wheelers",
    "models": [
      { "vehicleCode": "...", "modelDescription": "...", ... }
    ]
  }
]
```

## How to Add a New Product Type

### 1. Create Handler File
Create `src/handlers/mynewtype.js`:

```javascript
const BaseHandler = require('./baseHandler');

class MyNewTypeHandler extends BaseHandler {
    constructor() {
        super('MYNEWTYPE', {
            outputDir: require('path').join(__dirname, '../data')
        });

        this.selectors = {
            tabMenuSelector: '.tabmenu',
            tabDisplayText: 'MY NEW TYPE',  // ← Exact tab name
            vehicleTypeSelector: '#vehicleType',
            vehicleTypeOption: 'MY NEW TYPE OPTION',
            manufacturerSearchIcon: '#manufacturer',
            modelSearchIcon: '#model'
        };
    }

    // Optional: Enable vehicle type iteration
    shouldIterateVehicleTypes() {
        return false;  // or true if type has multiple variants
    }

    async scrapeModelsForManufacturer(page, mfr) {
        // Implement your custom scraping logic here
        return [];
    }
}

module.exports = new MyNewTypeHandler();
```

### 2. Register in Router
Update `src/router.js`:

```javascript
function getHandler(productType) {
    const handlers = {
        'TW': () => require('./handlers/tw'),
        'PC': () => require('./handlers/privatecar'),
        'PCCV': () => require('./handlers/pccv'),
        'GCCV': () => require('./handlers/gccv'),
        'MISCD': () => require('./handlers/miscd'),
        'MYNEWTYPE': () => require('./handlers/mynewtype'),  // ← Add this
    };
    // ...
}

function getProductTypeInfo(productType) {
    const typeInfo = {
        // ... existing types
        'MYNEWTYPE': {
            displayName: 'My New Type',
            shortCode: 'mynewtype',
            tabSelector: '.tabmenu',
            tabText: 'MY NEW TYPE'
        }
    };
    // ...
}
```

### 3. Use It
```bash
node src/fetchData.js --type=MYNEWTYPE
```

## Key Classes

### BaseHandler
Abstract base class providing:
- **`execute(page, manufacturers)`** - Main workflow orchestrator
  - Detects if handler needs to iterate vehicle types
  - Automatically branches to single or multi-variant logic
- **`shouldIterateVehicleTypes()`** - Override to `return true` for multi-variant types (default: `false`)
- **`scrapeModelsForManufacturer(page, mfr)`** - Override this in subclasses
- **`selectProductTypeTab(page)`** - Select the product type tab
- **`pollForElements(page, selector)`** - Wait for modal rows
- **`domClick(page, evalFn)`** - Execute DOM clicks safely
- **`saveData(filePath, data)`** - Incremental JSON saving

All subclasses **must override** `scrapeModelsForManufacturer()`.

### VehicleTypeHelper Utilities
Located in `src/utils/vehicleTypeHelper.js`:
- **`getAvailableVehicleTypes(page)`** - Extract all dropdown options
- **`selectVehicleTypeByLabel(page, label)`** - Select a specific option
- **`getCurrentVehicleType(page)`** - Get currently selected type
- **`isVehicleTypeAvailable(page)`** - Check if field exists

### CLI & Router
- **`cli.js`** - Parses `--type=` and `--verbose` flags
- **`router.js`** - Maps type code to handler instance
- **`fetchData.js`** - Orchestrates the flow

## Workflow Comparison

### Single Vehicle Type (TW, PC, etc.)
```
Select Product Type Tab
  ↓
Select Single Vehicle Type
  ↓
For each manufacturer:
  Scrape models
  Save
```

### Multi-Variant Type (GCCV)
```
Select Product Type Tab
  ↓
For each vehicle type variant:
  Select variant
  ↓
  For each manufacturer:
    Scrape models (for this variant)
    Save to variant-specific file
```

## When Implementing a New Product Type

### Key Steps

1. **Inspect the Portal**
   - Open the portal in browser
   - Navigate to the product type tab
   - Open DevTools → Elements
   - Note any differences:
     - Different table column names?
     - Different field labels?
     - Different modal structure?
     - Multiple vehicle type options?

2. **Customize Selectors and Behavior**
   ```javascript
   this.selectors = {
       tabDisplayText: 'EXACT TAB NAME',
       vehicleTypeOption: 'EXACT OPTION TEXT',
       // ... other custom selectors
   };
   
   // If type has multiple variants:
   shouldIterateVehicleTypes() {
       return true;
   }
   ```

3. **Implement `scrapeModelsForManufacturer()`**
   - Use inherited helpers: `openMakeModal()`, `pollForElements()`, etc.
   - Or write entirely custom logic
   - Must return array of model objects

4. **Test**
   ```bash
   node src/fetchData.js --type=NEWTYPE --verbose
   ```

## Troubleshooting

### Token Expired
Update `SESSION_DATA` in `fetchData.js` with fresh tokens (see main README).

### Handler Not Found
Check that handler file exists and is registered in `router.js`.

### Type Not Recognized
```bash
$ node src/fetchData.js --type=XYZ
Invalid product type: XYZ
Valid types: TW, PC, PCCV, GCCV, MISCD
```

### No Models Extracted
- Check browser DevTools for actual table structure
- Verify selectors match the DOM
- Enable `--verbose` flag to see page logs
- Review `src/handlers/tw.js` for reference implementation

### Vehicle Types Not Extracted
- Enable `--verbose` to see extraction process
- Verify dropdown is visible and clickable in portal
- Check selector in `vehicleTypeHelper.js` (.ant-select-item-option-content)

## Examples

### Two Wheeler (Fully Implemented)
```bash
node src/fetchData.js --type=TW
# Output: data/manufacturers_tw.json
```

### GCCV with Vehicle Type Iteration
```bash
node src/fetchData.js --type=GCCV
# Output:
# data/manufacturers_gccv_gccv_private_carriers.json
# data/manufacturers_gccv_goods_carrying_three_wheelers_public.json
# data/manufacturers_gccv_goods_carrying_three_wheelers_private.json
```

### Private Car (Not Yet Implemented)
```bash
node src/fetchData.js --type=PC
# Currently returns empty models (placeholder)
# Needs custom implementation
```

---

**Old System**: `src/index.js` (still works, kept for backward compatibility)  
**New System**: `src/fetchData.js` (recommended for multi-product support)
