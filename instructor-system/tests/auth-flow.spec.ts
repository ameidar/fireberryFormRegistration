import { test, expect } from '@playwright/test';
import {
  LoginPageObject,
  ApiMockHelper,
  SessionHelper,
  VisualTestHelper,
  validTestCredentials,
  mockInstructors
} from './utils/test-helpers';

test.describe('Authentication Flow', () => {
  let loginPage: LoginPageObject;
  let apiMock: ApiMockHelper;
  let sessionHelper: SessionHelper;
  let visualHelper: VisualTestHelper;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPageObject(page);
    apiMock = new ApiMockHelper(page);
    sessionHelper = new SessionHelper(page);
    visualHelper = new VisualTestHelper(page);

    // Set up API mocks
    await apiMock.mockInstructorsAPI();
  });

  test.describe('Session Management', () => {
    test('should create session after successful login', async ({ page }) => {
      const testCredentials = validTestCredentials[0];
      const testInstructor = mockInstructors.find(i => i.name === testCredentials.name)!;

      await apiMock.mockSuccessfulLogin(testInstructor);
      await loginPage.navigateToLogin();
      await loginPage.performLogin(testCredentials.name, testCredentials.idNumber);

      // Verify session token is stored
      const token = await sessionHelper.getSessionToken();
      expect(token).toBeTruthy();
      expect(token).toBe('mock-jwt-token-12345');
    });

    test('should persist session across page reloads', async ({ page }) => {
      // Set up existing session
      await sessionHelper.setSessionToken('valid-token');

      // Mock authenticated state validation
      await page.route('/api/verify-token', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            valid: true,
            instructor: mockInstructors[0]
          })
        });
      });

      await page.goto('/dashboard'); // Should not redirect to login
      await page.reload();

      // Should remain on dashboard (not redirect to login)
      expect(page.url()).toContain('/dashboard');
    });

    test('should auto-login with valid stored session', async ({ page }) => {
      await sessionHelper.setSessionToken('valid-token');

      // Mock successful token verification
      await page.route('/api/verify-token', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            valid: true,
            instructor: mockInstructors[0]
          })
        });
      });

      await loginPage.navigateToLogin();

      // Should automatically redirect to dashboard
      await expect(page).toHaveURL(/dashboard|sessions/);
    });

    test('should redirect to login with invalid session', async ({ page }) => {
      await sessionHelper.setSessionToken('invalid-token');

      // Mock invalid token response
      await page.route('/api/verify-token', async route => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            valid: false,
            error: 'Token expired'
          })
        });
      });

      await page.goto('/dashboard');

      // Should redirect to login
      await expect(page).toHaveURL('/');
      await expect(page.getByText('כניסת מדריכים')).toBeVisible();
    });

    test('should handle missing session gracefully', async ({ page }) => {
      await sessionHelper.clearSession();
      await page.goto('/dashboard');

      // Should redirect to login
      await expect(page).toHaveURL('/');
    });
  });

  test.describe('Session Timeout', () => {
    test('should show session timeout warning', async ({ page }) => {
      // Set up authenticated session
      await sessionHelper.setSessionToken('expiring-token');

      // Mock session timeout warning
      await page.route('/api/session-status', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'expiring',
            expiresIn: 300 // 5 minutes
          })
        });
      });

      await page.goto('/dashboard');

      // Should show timeout warning
      await expect(page.getByText(/הודעת זמן קצוב|session.*expir/i)).toBeVisible();
      await visualHelper.takeScreenshot('session-timeout-warning');
    });

    test('should extend session when user is active', async ({ page }) => {
      let sessionExtended = false;

      // Set up session extension endpoint
      await page.route('/api/extend-session', async route => {
        sessionExtended = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            newToken: 'extended-token'
          })
        });
      });

      await sessionHelper.setSessionToken('expiring-token');
      await page.goto('/dashboard');

      // Simulate user activity (click somewhere)
      await page.locator('body').click();

      // Wait for session extension call
      await page.waitForTimeout(1000);
      expect(sessionExtended).toBe(true);
    });

    test('should logout user when session expires', async ({ page }) => {
      await sessionHelper.setSessionToken('expired-token');

      // Mock expired session
      await page.route('/api/verify-token', async route => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            valid: false,
            error: 'Session expired'
          })
        });
      });

      await page.goto('/dashboard');

      // Should redirect to login with expiration message
      await expect(page).toHaveURL('/');
      await expect(page.getByText(/פגה.*תוקף|expired/i)).toBeVisible();
    });

    test('should handle multiple tabs session synchronization', async ({ browser }) => {
      const context = await browser.newContext();
      const page1 = await context.newPage();
      const page2 = await context.newPage();

      const sessionHelper1 = new SessionHelper(page1);
      const sessionHelper2 = new SessionHelper(page2);

      // Login in first tab
      const testCredentials = validTestCredentials[0];
      const testInstructor = mockInstructors.find(i => i.name === testCredentials.name)!;

      await apiMock.mockSuccessfulLogin(testInstructor);
      await apiMock.mockInstructorsAPI();

      const loginPage1 = new LoginPageObject(page1);
      await loginPage1.navigateToLogin();
      await loginPage1.performLogin(testCredentials.name, testCredentials.idNumber);

      // Verify token in both tabs
      const token1 = await sessionHelper1.getSessionToken();
      const token2 = await sessionHelper2.getSessionToken();

      expect(token1).toBeTruthy();
      expect(token2).toBeTruthy();
      expect(token1).toBe(token2);

      await context.close();
    });
  });

  test.describe('Logout Functionality', () => {
    test('should logout and clear session', async ({ page }) => {
      // Set up authenticated session
      await sessionHelper.setSessionToken('valid-token');

      // Mock logout endpoint
      await page.route('/api/logout', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'התנתקת בהצלחה'
          })
        });
      });

      await page.goto('/dashboard');

      // Find and click logout button
      await page.locator('[data-testid="logout-button"], button:has-text("התנתק")').click();

      // Should redirect to login
      await expect(page).toHaveURL('/');

      // Session should be cleared
      const token = await sessionHelper.getSessionToken();
      expect(token).toBeNull();
    });

    test('should show logout confirmation dialog', async ({ page }) => {
      await sessionHelper.setSessionToken('valid-token');
      await page.goto('/dashboard');

      await page.locator('[data-testid="logout-button"], button:has-text("התנתק")').click();

      // Should show confirmation dialog
      await expect(page.getByText(/האם.*להתנתק|confirm.*logout/i)).toBeVisible();

      // Take screenshot of confirmation dialog
      await visualHelper.takeScreenshot('logout-confirmation');
    });

    test('should cancel logout and remain logged in', async ({ page }) => {
      await sessionHelper.setSessionToken('valid-token');
      await page.goto('/dashboard');

      await page.locator('[data-testid="logout-button"], button:has-text("התנתק")').click();

      // Click cancel in confirmation dialog
      await page.locator('button:has-text("ביטול"), button:has-text("Cancel")').click();

      // Should remain on dashboard
      expect(page.url()).toContain('/dashboard');

      // Session should still exist
      const token = await sessionHelper.getSessionToken();
      expect(token).toBeTruthy();
    });

    test('should handle logout errors gracefully', async ({ page }) => {
      await sessionHelper.setSessionToken('valid-token');

      // Mock logout failure
      await page.route('/api/logout', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Server error'
          })
        });
      });

      await page.goto('/dashboard');
      await page.locator('[data-testid="logout-button"], button:has-text("התנתק")').click();
      await page.locator('button:has-text("אישור"), button:has-text("Confirm")').click();

      // Should still clear local session even if server fails
      const token = await sessionHelper.getSessionToken();
      expect(token).toBeNull();

      // Should redirect to login
      await expect(page).toHaveURL('/');
    });
  });

  test.describe('Token Refresh', () => {
    test('should refresh token automatically before expiration', async ({ page }) => {
      let tokenRefreshed = false;

      // Mock token refresh endpoint
      await page.route('/api/refresh-token', async route => {
        tokenRefreshed = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            token: 'new-refreshed-token'
          })
        });
      });

      await sessionHelper.setSessionToken('expiring-soon-token');
      await page.goto('/dashboard');

      // Wait for automatic refresh
      await page.waitForTimeout(2000);

      expect(tokenRefreshed).toBe(true);

      // Verify new token is stored
      const newToken = await sessionHelper.getSessionToken();
      expect(newToken).toBe('new-refreshed-token');
    });

    test('should handle token refresh failure', async ({ page }) => {
      // Mock refresh failure
      await page.route('/api/refresh-token', async route => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Refresh token expired'
          })
        });
      });

      await sessionHelper.setSessionToken('expiring-token');
      await page.goto('/dashboard');

      // Should redirect to login after failed refresh
      await expect(page).toHaveURL('/');
      await expect(page.getByText(/פגה.*תוקף|session.*expired/i)).toBeVisible();
    });
  });

  test.describe('Security Features', () => {
    test('should detect and handle concurrent sessions', async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      const sessionHelper1 = new SessionHelper(page1);
      const sessionHelper2 = new SessionHelper(page2);

      // Mock concurrent session detection
      let sessionCount = 0;
      await page1.route('/api/verify-token', async route => {
        sessionCount++;
        if (sessionCount > 1) {
          await route.fulfill({
            status: 409,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Multiple sessions detected',
              action: 'force_logout'
            })
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ valid: true, instructor: mockInstructors[0] })
          });
        }
      });

      await page2.route('/api/verify-token', async route => {
        sessionCount++;
        if (sessionCount > 1) {
          await route.fulfill({
            status: 409,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Multiple sessions detected',
              action: 'force_logout'
            })
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ valid: true, instructor: mockInstructors[0] })
          });
        }
      });

      // Set same token in both contexts
      await sessionHelper1.setSessionToken('shared-token');
      await sessionHelper2.setSessionToken('shared-token');

      await page1.goto('/dashboard');
      await page2.goto('/dashboard');

      // Second session should be logged out
      await expect(page2).toHaveURL('/');
      await expect(page2.getByText(/מספר.*חיבורים|multiple.*sessions/i)).toBeVisible();

      await context1.close();
      await context2.close();
    });

    test('should validate token signature', async ({ page }) => {
      await sessionHelper.setSessionToken('invalid.jwt.token');

      // Mock invalid token signature response
      await page.route('/api/verify-token', async route => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            valid: false,
            error: 'Invalid token signature'
          })
        });
      });

      await page.goto('/dashboard');

      // Should redirect to login
      await expect(page).toHaveURL('/');
      await expect(page.getByText('כניסת מדריכים')).toBeVisible();
    });

    test('should handle expired refresh tokens', async ({ page }) => {
      await sessionHelper.simulateExpiredSession();

      await page.route('/api/verify-token', async route => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            valid: false,
            error: 'Token expired',
            requiresLogin: true
          })
        });
      });

      await page.goto('/dashboard');

      // Should redirect to login with expiration message
      await expect(page).toHaveURL('/');
      await expect(page.getByText(/פגה.*תוקף|expired/i)).toBeVisible();

      // Session should be cleared
      const token = await sessionHelper.getSessionToken();
      expect(token).toBeNull();
    });
  });

  test.describe('Remember Me Functionality', () => {
    test('should persist login with remember me option', async ({ page }) => {
      const testCredentials = validTestCredentials[0];
      const testInstructor = mockInstructors.find(i => i.name === testCredentials.name)!;

      await apiMock.mockSuccessfulLogin(testInstructor);
      await loginPage.navigateToLogin();

      // Check remember me option if it exists
      const rememberMeCheckbox = page.locator('input[type="checkbox"][name="rememberMe"]');
      if (await rememberMeCheckbox.isVisible()) {
        await rememberMeCheckbox.check();
      }

      await loginPage.performLogin(testCredentials.name, testCredentials.idNumber);

      // Verify persistent session cookie/token
      const cookies = await page.context().cookies();
      const persistentCookie = cookies.find(c => c.name.includes('remember') || c.expires !== -1);
      expect(persistentCookie).toBeTruthy();
    });

    test('should clear remember me data on explicit logout', async ({ page }) => {
      await sessionHelper.setSessionToken('persistent-token');

      // Set persistent cookie
      await page.context().addCookies([{
        name: 'rememberToken',
        value: 'persistent-remember-token',
        domain: 'localhost',
        path: '/',
        expires: Date.now() / 1000 + 86400 * 30 // 30 days
      }]);

      await page.goto('/dashboard');
      await page.locator('[data-testid="logout-button"], button:has-text("התנתק")').click();
      await page.locator('button:has-text("אישור"), button:has-text("Confirm")').click();

      // Persistent data should be cleared
      const cookies = await page.context().cookies();
      const rememberCookie = cookies.find(c => c.name === 'rememberToken');
      expect(rememberCookie).toBeFalsy();
    });
  });

  test.describe('Cross-Site Request Forgery Protection', () => {
    test('should include CSRF tokens in authentication requests', async ({ page }) => {
      let csrfTokenIncluded = false;

      await page.route('/api/login', async route => {
        const headers = route.request().headers();
        if (headers['x-csrf-token'] || headers['csrf-token']) {
          csrfTokenIncluded = true;
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            instructor: mockInstructors[0],
            token: 'mock-token'
          })
        });
      });

      await apiMock.mockInstructorsAPI();
      await loginPage.navigateToLogin();
      await loginPage.performLogin(validTestCredentials[0].name, validTestCredentials[0].idNumber);

      expect(csrfTokenIncluded).toBe(true);
    });
  });
});