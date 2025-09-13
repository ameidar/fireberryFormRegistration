import { test, expect } from '@playwright/test';
import {
  LoginPageObject,
  ApiMockHelper,
  VisualTestHelper,
  HebrewTextValidator,
  validTestCredentials,
  invalidTestCredentials,
  mockInstructors
} from './utils/test-helpers';

test.describe('Instructor Login', () => {
  let loginPage: LoginPageObject;
  let apiMock: ApiMockHelper;
  let visualHelper: VisualTestHelper;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPageObject(page);
    apiMock = new ApiMockHelper(page);
    visualHelper = new VisualTestHelper(page);

    // Set up API mocks
    await apiMock.mockInstructorsAPI();
    await loginPage.navigateToLogin();
  });

  test.describe('Page Structure and Layout', () => {
    test('should display login form with Hebrew RTL layout', async ({ page }) => {
      // Check RTL direction
      const body = page.locator('body');
      await expect(body).toHaveAttribute('dir', 'rtl');

      // Check form elements are present
      await expect(loginPage.instructorNameTrigger).toBeVisible();
      await expect(loginPage.idNumberInput).toBeVisible();
      await expect(loginPage.loginButton).toBeVisible();

      // Check Hebrew text content
      await expect(page.locator('h1')).toContainText('כניסת מדריכים');
      await expect(page.getByText('שם המדריך')).toBeVisible();
      await expect(page.getByText('מספר זהות')).toBeVisible();
      await expect(loginPage.loginButton).toContainText('התחבר');
    });

    test('should show development helper in development mode', async ({ page }) => {
      // Check if development helper is visible
      await expect(loginPage.developmentHelper).toBeVisible();
      await expect(loginPage.developmentHelper).toContainText('מצב פיתוח');

      // Take screenshot for visual verification
      await visualHelper.takeScreenshot('login-development-mode');
    });

    test('should display loading state when fetching instructors', async ({ page }) => {
      // Create a slow API response
      await page.route('/api/instructors', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: mockInstructors })
        });
      });

      await page.reload();

      // Check loading state
      await expect(loginPage.instructorNameTrigger).toContainText('טוען רשימת מדריכים...');
      await expect(loginPage.instructorNameTrigger).toBeDisabled();
    });
  });

  test.describe('Instructor Selection', () => {
    test('should populate instructor dropdown with Hebrew names', async ({ page }) => {
      await loginPage.instructorNameTrigger.click();

      for (const instructor of mockInstructors.filter(i => i.isActive)) {
        const option = page.locator(`[role="option"]:has-text("${instructor.name}")`);
        await expect(option).toBeVisible();

        // Validate Hebrew names
        expect(HebrewTextValidator.validateHebrewName(instructor.name)).toBe(true);
      }
    });

    test('should show instructor specialization in dropdown', async ({ page }) => {
      await loginPage.instructorNameTrigger.click();

      const firstInstructor = mockInstructors[0];
      const option = page.locator(`[role="option"]:has-text("${firstInstructor.name}")`);
      await expect(option).toContainText(firstInstructor.specialization!);
    });

    test('should select instructor from dropdown', async ({ page }) => {
      const testInstructor = mockInstructors[0];
      await loginPage.selectInstructor(testInstructor.name);

      // Verify selection
      await expect(loginPage.instructorNameTrigger).toContainText(testInstructor.name);
    });

    test('should not show inactive instructors', async ({ page }) => {
      await loginPage.instructorNameTrigger.click();

      const inactiveInstructor = mockInstructors.find(i => !i.isActive);
      if (inactiveInstructor) {
        const option = page.locator(`[role="option"]:has-text("${inactiveInstructor.name}")`);
        await expect(option).not.toBeVisible();
      }
    });
  });

  test.describe('ID Number Validation', () => {
    test('should validate Israeli ID checksum in real-time', async ({ page }) => {
      await loginPage.fillIdNumber('123456789');
      await loginPage.expectIdValidation(true);

      await loginPage.fillIdNumber('123456788');
      await loginPage.expectIdValidation(false);
    });

    test('should format ID number correctly', async ({ page }) => {
      await loginPage.fillIdNumber('123456789');

      // Check formatted display
      const formattedId = page.locator('.font-mono');
      await expect(formattedId).toContainText('123-456-789');
    });

    test('should clean ID number input (remove non-digits)', async ({ page }) => {
      await loginPage.idNumberInput.fill('12a3-45b6*789');

      const value = await loginPage.idNumberInput.inputValue();
      expect(value).toBe('123456789');
    });

    test('should limit ID number to 9 digits', async ({ page }) => {
      await loginPage.fillIdNumber('1234567890123');

      const value = await loginPage.idNumberInput.inputValue();
      expect(value.length).toBe(9);
    });

    test('should toggle ID number visibility', async ({ page }) => {
      await loginPage.fillIdNumber('123456789');

      // Should be hidden by default (password type)
      await expect(loginPage.idNumberInput).toHaveAttribute('type', 'password');

      // Click toggle to show
      await loginPage.toggleIdVisibility();
      await expect(loginPage.idNumberInput).toHaveAttribute('type', 'text');

      // Click toggle to hide again
      await loginPage.toggleIdVisibility();
      await expect(loginPage.idNumberInput).toHaveAttribute('type', 'password');
    });
  });

  test.describe('Form Validation', () => {
    test('should show validation errors for empty fields', async ({ page }) => {
      await loginPage.submitLogin();

      // Check for validation errors
      await expect(loginPage.errorMessages).toHaveCount(2); // Name and ID required
      await expect(page.getByText('שדה חובה')).toHaveCount(2);
    });

    test('should validate ID number format', async ({ page }) => {
      await loginPage.selectInstructor(mockInstructors[0].name);
      await loginPage.fillIdNumber('12345'); // Too short
      await loginPage.submitLogin();

      await expect(loginPage.errorMessages).toBeVisible();
      await expect(page.getByText('מספר זהות חייב להכיל 9 ספרות')).toBeVisible();
    });

    test('should validate ID number checksum', async ({ page }) => {
      await loginPage.selectInstructor(mockInstructors[0].name);
      await loginPage.fillIdNumber('123456788'); // Invalid checksum
      await loginPage.submitLogin();

      await expect(loginPage.errorMessages).toBeVisible();
      await expect(page.getByText('מספר זהות לא תקין')).toBeVisible();
    });
  });

  test.describe('Successful Login', () => {
    test('should login with valid credentials', async ({ page }) => {
      const testCredentials = validTestCredentials[0];
      const testInstructor = mockInstructors.find(i => i.name === testCredentials.name)!;

      // Mock successful login
      await apiMock.mockSuccessfulLogin(testInstructor);

      await loginPage.performLogin(testCredentials.name, testCredentials.idNumber);

      // Should redirect or show success
      await loginPage.expectLoginSuccess();

      // Take screenshot of success state
      await visualHelper.takeScreenshot('login-success');
    });

    test('should show loading state during login', async ({ page }) => {
      const testCredentials = validTestCredentials[0];
      const testInstructor = mockInstructors.find(i => i.name === testCredentials.name)!;

      // Mock slow login response
      await apiMock.mockSlowResponse(2000);

      await loginPage.selectInstructor(testCredentials.name);
      await loginPage.fillIdNumber(testCredentials.idNumber);
      await loginPage.submitLogin();

      // Check loading state
      await expect(loginPage.loadingSpinner).toBeVisible();
      await expect(loginPage.loginButton).toBeDisabled();
      await expect(loginPage.loginButton).toContainText('מתחבר...');

      // Take screenshot of loading state
      await visualHelper.takeScreenshot('login-loading');
    });

    test('should persist session after successful login', async ({ page }) => {
      const testCredentials = validTestCredentials[0];
      const testInstructor = mockInstructors.find(i => i.name === testCredentials.name)!;

      await apiMock.mockSuccessfulLogin(testInstructor);
      await loginPage.performLogin(testCredentials.name, testCredentials.idNumber);

      // Check if token is stored
      const token = await page.evaluate(() => {
        return localStorage.getItem('instructorToken');
      });

      expect(token).toBeTruthy();
    });
  });

  test.describe('Failed Login', () => {
    test.each(invalidTestCredentials)(
      'should show error for invalid credentials: $name, $idNumber',
      async ({ page }, { name, idNumber, error }) => {
        if (name) {
          await loginPage.selectInstructor(name);
        }
        if (idNumber) {
          await loginPage.fillIdNumber(idNumber);
        }

        await loginPage.submitLogin();
        await expect(page.getByText(error)).toBeVisible();

        // Take screenshot of error state
        await visualHelper.takeScreenshot(`login-error-${name?.replace(/\s/g, '-') || 'empty'}-${idNumber?.replace(/\s/g, '-') || 'empty'}`);
      }
    );

    test('should show error for non-existent instructor', async ({ page }) => {
      await apiMock.mockFailedLogin('מדריך לא נמצא במערכת');

      await loginPage.selectInstructor(mockInstructors[0].name);
      await loginPage.fillIdNumber('999999999'); // Valid format, wrong ID
      await loginPage.submitLogin();

      await loginPage.expectLoginError('מדריך לא נמצא במערכת');
    });

    test('should handle network errors gracefully', async ({ page }) => {
      await apiMock.mockNetworkError();

      await loginPage.performLogin(validTestCredentials[0].name, validTestCredentials[0].idNumber);

      await expect(page.getByText('שגיאה בהתחברות לשרת')).toBeVisible();

      // Take screenshot of network error
      await visualHelper.takeScreenshot('login-network-error');
    });

    test('should enable retry after failed login', async ({ page }) => {
      const testCredentials = validTestCredentials[0];

      // First attempt fails
      await apiMock.mockFailedLogin('שגיאה זמנית');
      await loginPage.performLogin(testCredentials.name, testCredentials.idNumber);
      await loginPage.expectLoginError();

      // Second attempt succeeds
      const testInstructor = mockInstructors.find(i => i.name === testCredentials.name)!;
      await apiMock.mockSuccessfulLogin(testInstructor);
      await loginPage.submitLogin();
      await loginPage.expectLoginSuccess();
    });
  });

  test.describe('User Experience', () => {
    test('should focus on first input on page load', async ({ page }) => {
      await expect(loginPage.instructorNameTrigger).toBeFocused();
    });

    test('should support keyboard navigation', async ({ page }) => {
      // Tab through form elements
      await page.keyboard.press('Tab');
      await expect(loginPage.instructorNameTrigger).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(loginPage.idNumberInput).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(loginPage.loginButton).toBeFocused();
    });

    test('should submit form with Enter key', async ({ page }) => {
      const testCredentials = validTestCredentials[0];
      const testInstructor = mockInstructors.find(i => i.name === testCredentials.name)!;

      await apiMock.mockSuccessfulLogin(testInstructor);
      await loginPage.selectInstructor(testCredentials.name);
      await loginPage.fillIdNumber(testCredentials.idNumber);

      // Press Enter to submit
      await page.keyboard.press('Enter');

      await loginPage.expectLoginSuccess();
    });

    test('should clear form validation errors when correcting input', async ({ page }) => {
      // Trigger validation errors
      await loginPage.submitLogin();
      await expect(loginPage.errorMessages).toHaveCount(2);

      // Fix errors
      await loginPage.selectInstructor(mockInstructors[0].name);
      await loginPage.fillIdNumber('123456789');

      // Errors should clear
      await expect(loginPage.errorMessages).toHaveCount(0);
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle API timeout', async ({ page }) => {
      // Mock extremely slow response
      await page.route('/api/login', async route => {
        await new Promise(resolve => setTimeout(resolve, 35000)); // Longer than timeout
        await route.fulfill({ status: 200, body: '{}' });
      });

      await loginPage.performLogin(validTestCredentials[0].name, validTestCredentials[0].idNumber);

      // Should show timeout error
      await expect(page.getByText(/שגיאה|timeout/i)).toBeVisible({ timeout: 35000 });
    });

    test('should handle malformed API responses', async ({ page }) => {
      await page.route('/api/login', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: 'invalid json'
        });
      });

      await loginPage.performLogin(validTestCredentials[0].name, validTestCredentials[0].idNumber);
      await expect(page.getByText('שגיאה בהתחברות לשרת')).toBeVisible();
    });

    test('should handle empty instructor list', async ({ page }) => {
      await page.route('/api/instructors', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [] })
        });
      });

      await page.reload();
      await loginPage.instructorNameTrigger.click();

      // Should show no options or appropriate message
      const options = page.locator('[role="option"]');
      await expect(options).toHaveCount(0);
    });
  });

  test.describe('Visual Regression', () => {
    test('should match login page screenshot', async ({ page }) => {
      await visualHelper.expectScreenshot('login-page-initial');
    });

    test('should match error state screenshot', async ({ page }) => {
      await loginPage.submitLogin();
      await visualHelper.expectScreenshot('login-page-errors');
    });

    test('should match loading state screenshot', async ({ page }) => {
      await apiMock.mockSlowResponse(1000);
      await loginPage.selectInstructor(mockInstructors[0].name);
      await loginPage.fillIdNumber('123456789');
      await loginPage.submitLogin();

      await visualHelper.expectScreenshot('login-page-loading');
    });
  });
});