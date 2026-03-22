const LOGIN_URL = 'https://novaconnector.shriramgi.com/novaconnect/login';
const QUOTATION_URL = 'https://novaconnector.shriramgi.com/novaconnect/Dashboard/CreateNewQuotation';

async function goToLogin(page) {
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle2' });
}

async function goToQuotation(page) {
    await page.goto(QUOTATION_URL, { waitUntil: 'networkidle2' });
}

module.exports = { goToLogin, goToQuotation };
