import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  // Ensure test environment is set up
  process.env.VITE_USE_MOCK_DATA = 'true';
  process.env.NODE_ENV = 'test';

  // Pre-warm the browser cache by visiting the application
  const browser = await chromium.launch();
  const context = await browser.newContext({
    locale: 'he-IL',
    timezoneId: 'Asia/Jerusalem'
  });
  const page = await context.newPage();

  try {
    // Visit the application to pre-load assets
    await page.goto(config.projects[0].use?.baseURL || 'http://localhost:5173');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    console.log('✓ Application pre-loaded successfully');
  } catch (error) {
    console.warn('⚠ Could not pre-load application:', error);
  } finally {
    await browser.close();
  }

  console.log('🚀 Global test setup completed');
}

export default globalSetup;