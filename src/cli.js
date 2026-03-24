/**
 * CLI argument parser for product type selection
 */

function parseArgs(args) {
    const result = {
        type: 'TW', // Default product type
        verbose: false
    };

    for (const arg of args) {
        if (arg.startsWith('--type=')) {
            result.type = arg.split('=')[1].toUpperCase();
        } else if (arg === '--verbose') {
            result.verbose = true;
        }
    }

    return result;
}

function validateType(type) {
    const validTypes = ['TW', 'PC', 'PCCV', 'GCCV', 'MISCD'];
    if (!validTypes.includes(type)) {
        throw new Error(
            `Invalid product type: ${type}\n` +
            `Valid types: ${validTypes.join(', ')}\n\n` +
            `Usage:\n` +
            `  node fetchData.js --type=TW\n` +
            `  node fetchData.js --type=GCCV\n` +
            `  node fetchData.js --type=PC`
        );
    }
    return type;
}

function printUsage() {
    console.log(`
╔════════════════════════════════════════════════════════════════════╗
║                 NovaConnect Multi-Product Scraper                  ║
╚════════════════════════════════════════════════════════════════════╝

Product Types:
  TW      → Two Wheeler
  PC      → Private Car
  PCCV    → Private Commercial Cart Vehicle
  GCCV    → Good Carrying Commercial Vehicle
  MISCD   → Miscellaneous – Dual Purpose

Usage:
  node fetchData.js                   (defaults to TW)
  node fetchData.js --type=GCCV
  node fetchData.js --type=PC --verbose

Flags:
  --type=<TYPE>  Select product type (default: TW)
  --verbose      Enable verbose logging
    `);
}

module.exports = { parseArgs, validateType, printUsage };
