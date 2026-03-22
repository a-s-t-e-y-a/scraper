async function injectSession(page, sessionData) {
    await page.evaluate((data) => {
        Object.keys(data).forEach(key => {
            sessionStorage.setItem(key, data[key]);
            localStorage.setItem(key, data[key]);
        });
    }, sessionData);
}

module.exports = { injectSession };
