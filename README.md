# Puppeteer Web Scraper

This is a structured web scraper for Shriram General Insurance's NovaConnect portal.

## Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Install Puppeteer browser:
   ```bash
   pnpm exec puppeteer browsers install chrome
   ```

## Usage

Run the scraper:
```bash
node src/index.js
```

The scraper is configured to:
- Use session tokens provided in `src/index.js`.
- Launch in non-headless mode.
- Navigate directly to the Create New Quotation page.
- Keep the browser open indefinitely.
