const REFRESH_URL = 'https://statim.shriramgi.com/token/refresh';

async function refreshToken(page, currentToken, refreshTokenValue) {
    console.log('🔄 Attempting token refresh...');
    const response = await page.evaluate(async (url, token, refreshToken) => {
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ refreshToken })
            });
            if (!res.ok) return null;
            return await res.json();
        } catch (e) {
            return null;
        }
    }, REFRESH_URL, currentToken, refreshTokenValue);

    if (response && response.token) {
        console.log('✅ Token refreshed successfully.');
        return response;
    }
    console.log('⚠️ Token refresh failed, continuing with existing token.');
    return null;
}

module.exports = { refreshToken };
