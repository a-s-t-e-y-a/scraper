const puppeteer = require('puppeteer');

async function launchBrowser() {
    return await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: null
    });
}

module.exports = { launchBrowser };
