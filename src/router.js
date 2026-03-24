/**
 * Router/Dispatcher: Maps product type to handler module
 */

function getHandler(productType) {
    const handlers = {
        'TW': () => require('./handlers/tw'),
        'PC': () => require('./handlers/privatecar'),
        'PCCV': () => require('./handlers/pccv'),
        'GCCV': () => require('./handlers/gccv'),
        'MISCD': () => require('./handlers/miscd')
    };

    if (!handlers[productType]) {
        throw new Error(`No handler found for product type: ${productType}`);
    }

    return handlers[productType]();
}

function getProductTypeInfo(productType) {
    const typeInfo = {
        'TW': {
            displayName: 'Two Wheeler',
            shortCode: 'tw',
            tabSelector: '.tabmenu',      // Will be identified by text content
            tabText: 'Two Wheeler'
        },
        'PC': {
            displayName: 'Private Car',
            shortCode: 'pc',
            tabSelector: '.tabmenu',
            tabText: 'Private Car'
        },
        'PCCV': {
            displayName: 'Private Commercial Cart Vehicle',
            shortCode: 'pccv',
            tabSelector: '.tabmenu',
            tabText: 'PCCV'
        },
        'GCCV': {
            displayName: 'Good Carrying Commercial Vehicle',
            shortCode: 'gccv',
            tabSelector: '.tabmenu',
            tabText: 'GCCV'
        },
        'MISCD': {
            displayName: 'Miscellaneous – Dual Purpose',
            shortCode: 'miscd',
            tabSelector: '.tabmenu',
            tabText: 'MISC-D'
        }
    };

    return typeInfo[productType];
}

module.exports = { getHandler, getProductTypeInfo };
