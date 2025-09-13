import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results.json' }],
    process.env.CI ? ['github'] : ['list']
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Record video on failure */
    video: 'retain-on-failure',

    /* Hebrew RTL support */
    locale: 'he-IL',
    timezoneId: 'Asia/Jerusalem',

    /* Ignore HTTPS errors */
    ignoreHTTPSErrors: true,

    /* Action timeout */
    actionTimeout: 10000,

    /* Navigation timeout */
    navigationTimeout: 30000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
        // Hebrew font support
        extraHTTPHeaders: {
          'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8'
        }
      },
    },

    {
      name: 'Desktop Firefox',
      use: {
        ...devices['Desktop Firefox'],
        extraHTTPHeaders: {
          'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8'
        }
      },
    },

    {
      name: 'Desktop Safari',
      use: {
        ...devices['Desktop Safari'],
        extraHTTPHeaders: {
          'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8'
        }
      },
    },

    /* Mobile testing */
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        extraHTTPHeaders: {
          'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8'
        }
      },
    },

    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12'],
        extraHTTPHeaders: {
          'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8'
        }
      },
    },

    /* Tablet testing */
    {
      name: 'Tablet',
      use: {
        ...devices['iPad Pro'],
        extraHTTPHeaders: {
          'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8'
        }
      },
    },
  ],

  /* Global test settings */
  expect: {
    /* Maximum time expect() should wait for the condition to be met. */
    timeout: 10000,

    /* Threshold for image comparisons */
    threshold: 0.2,

    /* Maximum allowed pixel difference for image comparisons */
    maxDiffPixels: 1000,
  },

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes
  },

  /* Global setup and teardown */
  globalSetup: require.resolve('./tests/global-setup.ts'),
  globalTeardown: require.resolve('./tests/global-teardown.ts'),

  /* Test output directory */
  outputDir: 'test-results/',

  /* Test metadata */
  metadata: {
    'test-suite': 'instructor-system',
    'rtl-support': 'hebrew',
    'frameworks': ['react', 'typescript', 'tailwind']
  }
});