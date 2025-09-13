import { test, expect, devices } from '@playwright/test';
import {
  LoginPageObject,
  ApiMockHelper,
  VisualTestHelper,
  HebrewTextValidator,
  mockInstructors
} from './utils/test-helpers';

test.describe('Visual Regression Tests', () => {
  let loginPage: LoginPageObject;
  let apiMock: ApiMockHelper;
  let visualHelper: VisualTestHelper;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPageObject(page);
    apiMock = new ApiMockHelper(page);
    visualHelper = new VisualTestHelper(page);

    // Set up API mocks
    await apiMock.mockInstructorsAPI();
  });

  test.describe('Desktop Layout Screenshots', () => {
    test('should match login page initial state', async ({ page }) => {
      await loginPage.navigateToLogin();

      // Wait for all fonts and images to load
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000); // Additional wait for font rendering

      // Take full page screenshot
      await expect(page).toHaveScreenshot('desktop-login-initial.png', {
        fullPage: true,
        threshold: 0.2
      });
    });

    test('should match login page with dropdown open', async ({ page }) => {
      await loginPage.navigateToLogin();
      await loginPage.instructorNameTrigger.click();

      // Wait for dropdown animation
      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot('desktop-login-dropdown-open.png', {
        threshold: 0.2
      });
    });

    test('should match login page with validation errors', async ({ page }) => {
      await loginPage.navigateToLogin();
      await loginPage.submitLogin();

      // Wait for error messages to appear
      await expect(loginPage.errorMessages).toHaveCount(2);

      await expect(page).toHaveScreenshot('desktop-login-validation-errors.png', {
        threshold: 0.2
      });
    });

    test('should match login page loading state', async ({ page }) => {
      await apiMock.mockSlowResponse(2000);
      await loginPage.navigateToLogin();

      await loginPage.selectInstructor(mockInstructors[0].name);
      await loginPage.fillIdNumber('123456789');
      await loginPage.submitLogin();

      // Wait for loading state
      await expect(loginPage.loadingSpinner).toBeVisible();

      await expect(page).toHaveScreenshot('desktop-login-loading.png', {
        threshold: 0.2
      });
    });

    test('should match login page with ID validation states', async ({ page }) => {
      await loginPage.navigateToLogin();

      // Valid ID
      await loginPage.fillIdNumber('123456789');
      await expect(page.locator('.text-green-600')).toBeVisible();
      await expect(page).toHaveScreenshot('desktop-login-id-valid.png', {
        threshold: 0.2
      });

      // Invalid ID
      await loginPage.fillIdNumber('123456788');
      await expect(page.locator('.text-red-500')).toContainText('לא תקין');
      await expect(page).toHaveScreenshot('desktop-login-id-invalid.png', {
        threshold: 0.2
      });
    });

    test('should match development helper display', async ({ page }) => {
      await loginPage.navigateToLogin();

      // Focus on development helper section
      const devHelper = loginPage.developmentHelper;
      await expect(devHelper).toBeVisible();

      await expect(devHelper).toHaveScreenshot('desktop-development-helper.png', {
        threshold: 0.2
      });
    });
  });

  test.describe('Mobile Layout Screenshots', () => {
    test.use({ ...devices['iPhone 12'] });

    test('should match mobile login page initial state', async ({ page }) => {
      await loginPage.navigateToLogin();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot('mobile-login-initial.png', {
        fullPage: true,
        threshold: 0.2
      });
    });

    test('should match mobile dropdown interaction', async ({ page }) => {
      await loginPage.navigateToLogin();
      await loginPage.instructorNameTrigger.tap();
      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot('mobile-login-dropdown.png', {
        threshold: 0.2
      });
    });

    test('should match mobile keyboard visible state', async ({ page }) => {
      await loginPage.navigateToLogin();
      await loginPage.idNumberInput.tap();

      // Wait for virtual keyboard to appear
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('mobile-login-keyboard.png', {
        threshold: 0.2
      });
    });

    test('should match mobile error messages', async ({ page }) => {
      await loginPage.navigateToLogin();
      await loginPage.submitLogin();

      await expect(loginPage.errorMessages).toHaveCount(2);

      await expect(page).toHaveScreenshot('mobile-login-errors.png', {
        fullPage: true,
        threshold: 0.2
      });
    });
  });

  test.describe('Tablet Layout Screenshots', () => {
    test.use({ ...devices['iPad Pro'] });

    test('should match tablet login page layout', async ({ page }) => {
      await loginPage.navigateToLogin();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot('tablet-login-initial.png', {
        fullPage: true,
        threshold: 0.2
      });
    });

    test('should match tablet landscape mode', async ({ page }) => {
      // Rotate to landscape
      await page.setViewportSize({ width: 1366, height: 1024 });

      await loginPage.navigateToLogin();
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('tablet-login-landscape.png', {
        fullPage: true,
        threshold: 0.2
      });
    });
  });

  test.describe('RTL Layout Verification', () => {
    test('should verify Hebrew text rendering and RTL direction', async ({ page }) => {
      await loginPage.navigateToLogin();

      // Check RTL direction
      const body = page.locator('body');
      await expect(body).toHaveAttribute('dir', 'rtl');

      // Check Hebrew text elements
      const hebrewElements = [
        page.getByText('כניסת מדריכים'),
        page.getByText('שם המדריך'),
        page.getByText('מספר זהות'),
        page.getByText('התחבר')
      ];

      for (const element of hebrewElements) {
        await expect(element).toBeVisible();
        const text = await element.textContent();
        expect(HebrewTextValidator.isHebrewText(text!)).toBe(true);
      }

      await expect(page).toHaveScreenshot('rtl-layout-verification.png', {
        threshold: 0.2
      });
    });

    test('should verify form field alignment in RTL', async ({ page }) => {
      await loginPage.navigateToLogin();

      // Check label positioning (should be on the right in RTL)
      const nameLabel = page.getByText('שם המדריך');
      const idLabel = page.getByText('מספר זהות');

      const nameLabelBox = await nameLabel.boundingBox();
      const idLabelBox = await idLabel.boundingBox();
      const formBox = await page.locator('form').boundingBox();

      // Labels should be positioned towards the right side
      expect(nameLabelBox!.x).toBeGreaterThan(formBox!.width * 0.3);
      expect(idLabelBox!.x).toBeGreaterThan(formBox!.width * 0.3);

      await expect(page).toHaveScreenshot('rtl-form-alignment.png', {
        threshold: 0.2
      });
    });

    test('should verify button and icon positioning in RTL', async ({ page }) => {
      await loginPage.navigateToLogin();

      // Fill ID to show the eye icon
      await loginPage.fillIdNumber('123456789');

      // Check eye icon is on the left side of input (correct for RTL)
      const idInput = loginPage.idNumberInput;
      const eyeIcon = loginPage.showIdToggle;

      const inputBox = await idInput.boundingBox();
      const iconBox = await eyeIcon.boundingBox();

      // Icon should be on the left side of the input in RTL
      expect(iconBox!.x).toBeLessThan(inputBox!.x + inputBox!.width * 0.5);

      await expect(page).toHaveScreenshot('rtl-icons-positioning.png', {
        threshold: 0.2
      });
    });
  });

  test.describe('Hebrew Font Rendering', () => {
    test('should render Hebrew fonts correctly at different sizes', async ({ page }) => {
      await loginPage.navigateToLogin();

      // Test different text sizes and weights
      const elements = [
        { selector: 'h1', expectedText: 'כניסת מדריכים', type: 'heading' },
        { selector: 'p', expectedText: 'התחבר כדי לגשת', type: 'paragraph' },
        { selector: 'label', expectedText: 'שם המדריך', type: 'label' },
        { selector: 'button[type="submit"]', expectedText: 'התחבר', type: 'button' }
      ];

      for (const element of elements) {
        const locator = page.locator(element.selector).first();
        await expect(locator).toBeVisible();

        // Take screenshot of specific element
        await expect(locator).toHaveScreenshot(`hebrew-font-${element.type}.png`, {
          threshold: 0.1
        });
      }
    });

    test('should render Hebrew characters with proper diacritics', async ({ page }) => {
      await loginPage.navigateToLogin();
      await loginPage.instructorNameTrigger.click();

      // Wait for dropdown with instructor names
      const firstOption = page.locator('[role="option"]').first();
      await expect(firstOption).toBeVisible();

      // Hebrew names should render properly
      await expect(page).toHaveScreenshot('hebrew-names-rendering.png', {
        threshold: 0.1
      });
    });
  });

  test.describe('Color Scheme and Themes', () => {
    test('should match light theme colors', async ({ page }) => {
      await loginPage.navigateToLogin();

      // Test specific color elements
      const card = page.locator('.bg-white').first();
      await expect(card).toBeVisible();

      await expect(page).toHaveScreenshot('light-theme-colors.png', {
        threshold: 0.1
      });
    });

    test('should handle high contrast mode', async ({ page }) => {
      // Simulate high contrast mode
      await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });

      await loginPage.navigateToLogin();
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('high-contrast-mode.png', {
        threshold: 0.3 // Higher threshold for theme variations
      });
    });

    test('should maintain accessibility colors for error states', async ({ page }) => {
      await loginPage.navigateToLogin();
      await loginPage.submitLogin();

      // Check error colors are accessible
      const errorElements = page.locator('.text-red-500');
      await expect(errorElements.first()).toBeVisible();

      await expect(page).toHaveScreenshot('error-colors-accessibility.png', {
        threshold: 0.2
      });
    });
  });

  test.describe('Animation and Transitions', () => {
    test('should capture dropdown animation states', async ({ page }) => {
      await loginPage.navigateToLogin();

      // Initial state
      await expect(page).toHaveScreenshot('dropdown-closed.png');

      // Click to open dropdown
      await loginPage.instructorNameTrigger.click();

      // Mid-animation (if possible to catch)
      await page.waitForTimeout(100);
      await expect(page).toHaveScreenshot('dropdown-opening.png', { threshold: 0.4 });

      // Fully open
      await page.waitForTimeout(300);
      await expect(page).toHaveScreenshot('dropdown-open.png');
    });

    test('should capture loading spinner animation frame', async ({ page }) => {
      await apiMock.mockSlowResponse(3000);
      await loginPage.navigateToLogin();

      await loginPage.selectInstructor(mockInstructors[0].name);
      await loginPage.fillIdNumber('123456789');
      await loginPage.submitLogin();

      // Capture loading spinner
      await expect(loginPage.loadingSpinner).toBeVisible();

      // Mask the spinning element for consistent screenshots
      const maskElements = await visualHelper.maskSensitiveData();
      maskElements.push(loginPage.loadingSpinner);

      await expect(page).toHaveScreenshot('loading-animation.png', {
        mask: maskElements,
        threshold: 0.2
      });
    });

    test('should capture form validation feedback transitions', async ({ page }) => {
      await loginPage.navigateToLogin();

      // Start with valid ID
      await loginPage.fillIdNumber('123456789');
      await expect(page).toHaveScreenshot('id-valid-state.png');

      // Change to invalid ID
      await loginPage.fillIdNumber('123456788');
      await page.waitForTimeout(200); // Wait for validation feedback
      await expect(page).toHaveScreenshot('id-invalid-state.png');
    });
  });

  test.describe('Cross-Browser Visual Consistency', () => {
    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
      test.describe(`${browserName} browser`, () => {
        test(`should render consistently in ${browserName}`, async ({ page, browserName: currentBrowser }) => {
          // Skip if not the target browser
          if (currentBrowser !== browserName) {
            test.skip();
          }

          await loginPage.navigateToLogin();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(1000);

          await expect(page).toHaveScreenshot(`${browserName}-login-consistency.png`, {
            threshold: 0.3 // Higher threshold for cross-browser differences
          });
        });

        test(`should handle form interactions consistently in ${browserName}`, async ({ page, browserName: currentBrowser }) => {
          if (currentBrowser !== browserName) {
            test.skip();
          }

          await loginPage.navigateToLogin();
          await loginPage.instructorNameTrigger.click();
          await page.waitForTimeout(300);

          await expect(page).toHaveScreenshot(`${browserName}-dropdown-consistency.png`, {
            threshold: 0.3
          });
        });
      });
    });
  });

  test.describe('Responsive Breakpoints', () => {
    const viewports = [
      { width: 320, height: 568, name: 'mobile-small' },
      { width: 375, height: 667, name: 'mobile-medium' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1024, height: 768, name: 'tablet-landscape' },
      { width: 1440, height: 900, name: 'desktop' },
      { width: 1920, height: 1080, name: 'desktop-large' }
    ];

    viewports.forEach(viewport => {
      test(`should render correctly at ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        await loginPage.navigateToLogin();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        await expect(page).toHaveScreenshot(`responsive-${viewport.name}.png`, {
          fullPage: true,
          threshold: 0.2
        });
      });
    });

    test('should maintain proper spacing and alignment at all breakpoints', async ({ page }) => {
      const testViewports = [
        { width: 320, height: 568 },
        { width: 1440, height: 900 }
      ];

      for (const viewport of testViewports) {
        await page.setViewportSize(viewport);
        await loginPage.navigateToLogin();

        // Check form is properly centered and sized
        const form = page.locator('form');
        const formBox = await form.boundingBox();
        const pageWidth = viewport.width;

        // Form should not be too wide on large screens or too narrow on small screens
        expect(formBox!.width).toBeGreaterThan(Math.min(280, pageWidth * 0.8));
        expect(formBox!.width).toBeLessThan(Math.min(500, pageWidth * 0.95));

        await expect(page).toHaveScreenshot(`spacing-${viewport.width}w.png`, {
          threshold: 0.2
        });
      }
    });
  });

  test.describe('Print Styles', () => {
    test('should render correctly for print media', async ({ page }) => {
      await loginPage.navigateToLogin();

      // Emulate print media
      await page.emulateMedia({ media: 'print' });

      await expect(page).toHaveScreenshot('print-styles.png', {
        threshold: 0.3
      });
    });
  });
});