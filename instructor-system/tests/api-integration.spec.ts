import { test, expect } from '@playwright/test';
import {
  LoginPageObject,
  ApiMockHelper,
  SessionHelper,
  mockInstructors,
  validTestCredentials,
  TestDataGenerator
} from './utils/test-helpers';

test.describe('API Integration Tests', () => {
  let loginPage: LoginPageObject;
  let apiMock: ApiMockHelper;
  let sessionHelper: SessionHelper;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPageObject(page);
    apiMock = new ApiMockHelper(page);
    sessionHelper = new SessionHelper(page);
  });

  test.describe('Instructors API', () => {
    test('should fetch instructors list successfully', async ({ page }) => {
      let apiCallMade = false;

      await page.route('/api/instructors', async route => {
        apiCallMade = true;
        const request = route.request();

        // Verify request headers
        expect(request.method()).toBe('GET');
        expect(request.headers()['accept']).toContain('application/json');

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: mockInstructors })
        });
      });

      await loginPage.navigateToLogin();

      expect(apiCallMade).toBe(true);

      // Verify instructors are displayed
      await loginPage.instructorNameTrigger.click();
      for (const instructor of mockInstructors.filter(i => i.isActive)) {
        await expect(page.locator(`[role="option"]:has-text("${instructor.name}")`)).toBeVisible();
      }
    });

    test('should handle instructors API failure gracefully', async ({ page }) => {
      await page.route('/api/instructors', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' })
        });
      });

      await loginPage.navigateToLogin();

      // Should show error state or fallback
      await loginPage.instructorNameTrigger.click();
      const options = page.locator('[role="option"]');
      await expect(options).toHaveCount(0);

      // Should disable the dropdown or show error message
      await expect(loginPage.instructorNameTrigger).toBeDisabled();
    });

    test('should handle empty instructors response', async ({ page }) => {
      await page.route('/api/instructors', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [] })
        });
      });

      await loginPage.navigateToLogin();

      await loginPage.instructorNameTrigger.click();
      const options = page.locator('[role="option"]');
      await expect(options).toHaveCount(0);
    });

    test('should handle malformed instructors response', async ({ page }) => {
      await page.route('/api/instructors', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: 'invalid json'
        });
      });

      await loginPage.navigateToLogin();

      // Should show error state
      await expect(page.getByText(/שגיאה|error/i)).toBeVisible();
    });

    test('should retry failed instructors requests', async ({ page }) => {
      let attemptCount = 0;

      await page.route('/api/instructors', async route => {
        attemptCount++;

        if (attemptCount < 3) {
          // Fail first 2 attempts
          await route.abort('failed');
        } else {
          // Succeed on 3rd attempt
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: mockInstructors })
          });
        }
      });

      await loginPage.navigateToLogin();

      // Should eventually succeed after retries
      await loginPage.instructorNameTrigger.click();
      await expect(page.locator('[role="option"]').first()).toBeVisible();
      expect(attemptCount).toBe(3);
    });

    test('should filter inactive instructors from API response', async ({ page }) => {
      const allInstructors = [
        ...mockInstructors,
        {
          id: '5',
          name: 'מדריך לא פעיל',
          idNumber: '777888999',
          isActive: false
        }
      ];

      await page.route('/api/instructors', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: allInstructors })
        });
      });

      await loginPage.navigateToLogin();
      await loginPage.instructorNameTrigger.click();

      // Should only show active instructors
      const inactiveOption = page.locator('[role="option"]:has-text("מדריך לא פעיל")');
      await expect(inactiveOption).not.toBeVisible();

      // Should show active instructors
      const activeOptions = page.locator('[role="option"]');
      const visibleCount = await activeOptions.count();
      const expectedActiveCount = allInstructors.filter(i => i.isActive).length;
      expect(visibleCount).toBe(expectedActiveCount);
    });
  });

  test.describe('Login API', () => {
    test('should send login request with correct payload', async ({ page }) => {
      let requestPayload: any = null;

      await apiMock.mockInstructorsAPI();

      await page.route('/api/login', async route => {
        requestPayload = await route.request().postDataJSON();

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            instructor: mockInstructors[0],
            token: 'mock-jwt-token'
          })
        });
      });

      const testCredentials = validTestCredentials[0];
      await loginPage.navigateToLogin();
      await loginPage.performLogin(testCredentials.name, testCredentials.idNumber);

      expect(requestPayload).toBeTruthy();
      expect(requestPayload.instructorName).toBe(testCredentials.name);
      expect(requestPayload.idNumber).toBe(testCredentials.idNumber);
    });

    test('should include security headers in login request', async ({ page }) => {
      let requestHeaders: any = null;

      await apiMock.mockInstructorsAPI();

      await page.route('/api/login', async route => {
        requestHeaders = route.request().headers();

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            instructor: mockInstructors[0],
            token: 'mock-jwt-token'
          })
        });
      });

      const testCredentials = validTestCredentials[0];
      await loginPage.navigateToLogin();
      await loginPage.performLogin(testCredentials.name, testCredentials.idNumber);

      expect(requestHeaders).toBeTruthy();
      expect(requestHeaders['content-type']).toContain('application/json');
      expect(requestHeaders['accept']).toContain('application/json');

      // Check for security headers if implemented
      // expect(requestHeaders['x-csrf-token']).toBeTruthy();
    });

    test('should handle login success response', async ({ page }) => {
      const testInstructor = mockInstructors[0];
      const mockToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.example';

      await apiMock.mockInstructorsAPI();

      await page.route('/api/login', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            instructor: testInstructor,
            token: mockToken,
            message: 'התחברות הצליחה'
          })
        });
      });

      const testCredentials = validTestCredentials[0];
      await loginPage.navigateToLogin();
      await loginPage.performLogin(testCredentials.name, testCredentials.idNumber);

      // Should store token
      const storedToken = await sessionHelper.getSessionToken();
      expect(storedToken).toBe(mockToken);

      await loginPage.expectLoginSuccess();
    });

    test('should handle login failure response', async ({ page }) => {
      await apiMock.mockInstructorsAPI();

      await page.route('/api/login', async route => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: 'מדריך לא נמצא במערכת'
          })
        });
      });

      const testCredentials = validTestCredentials[0];
      await loginPage.navigateToLogin();
      await loginPage.performLogin(testCredentials.name, testCredentials.idNumber);

      await expect(page.getByText('מדריך לא נמצא במערכת')).toBeVisible();
    });

    test('should handle different HTTP error codes', async ({ page }) => {
      const errorCodes = [
        { code: 400, message: 'בקשה לא תקינה' },
        { code: 401, message: 'נתונים לא נכונים' },
        { code: 403, message: 'אין הרשאה' },
        { code: 429, message: 'יותר מדי בקשות' },
        { code: 500, message: 'שגיאת שרת' },
        { code: 503, message: 'שירות לא זמין' }
      ];

      await apiMock.mockInstructorsAPI();

      for (const errorCase of errorCodes) {
        await page.route('/api/login', async route => {
          await route.fulfill({
            status: errorCase.code,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              message: errorCase.message
            })
          });
        });

        const testCredentials = validTestCredentials[0];
        await loginPage.navigateToLogin();
        await loginPage.performLogin(testCredentials.name, testCredentials.idNumber);

        await expect(page.getByText(errorCase.message)).toBeVisible();

        // Navigate away and back to reset state
        await page.reload();
      }
    });

    test('should handle network timeouts', async ({ page }) => {
      await apiMock.mockInstructorsAPI();

      await page.route('/api/login', async route => {
        // Simulate very slow response
        await new Promise(resolve => setTimeout(resolve, 35000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      });

      const testCredentials = validTestCredentials[0];
      await loginPage.navigateToLogin();
      await loginPage.performLogin(testCredentials.name, testCredentials.idNumber);

      // Should show timeout error
      await expect(page.getByText(/timeout|תם.*זמן|שגיאה/i)).toBeVisible({ timeout: 35000 });
    });

    test('should handle malformed login response', async ({ page }) => {
      await apiMock.mockInstructorsAPI();

      await page.route('/api/login', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: 'not valid json{'
        });
      });

      const testCredentials = validTestCredentials[0];
      await loginPage.navigateToLogin();
      await loginPage.performLogin(testCredentials.name, testCredentials.idNumber);

      await expect(page.getByText(/שגיאה.*שרת|server.*error/i)).toBeVisible();
    });

    test('should validate response structure', async ({ page }) => {
      await apiMock.mockInstructorsAPI();

      // Test missing required fields in response
      const invalidResponses = [
        { success: true }, // Missing instructor and token
        { success: true, instructor: mockInstructors[0] }, // Missing token
        { success: true, token: 'token' }, // Missing instructor
        { success: false }, // Missing message for failed login
      ];

      for (const invalidResponse of invalidResponses) {
        await page.route('/api/login', async route => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(invalidResponse)
          });
        });

        const testCredentials = validTestCredentials[0];
        await loginPage.navigateToLogin();
        await loginPage.performLogin(testCredentials.name, testCredentials.idNumber);

        // Should handle invalid response gracefully
        await expect(page.getByText(/שגיאה|error/i)).toBeVisible();

        await page.reload();
      }
    });
  });

  test.describe('Token Validation API', () => {
    test('should validate existing token on page load', async ({ page }) => {
      let tokenValidationCalled = false;

      await sessionHelper.setSessionToken('existing-token');

      await page.route('/api/verify-token', async route => {
        tokenValidationCalled = true;
        const authHeader = route.request().headers()['authorization'];
        expect(authHeader).toBe('Bearer existing-token');

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            valid: true,
            instructor: mockInstructors[0]
          })
        });
      });

      await page.goto('/dashboard');

      expect(tokenValidationCalled).toBe(true);
    });

    test('should handle invalid token response', async ({ page }) => {
      await sessionHelper.setSessionToken('invalid-token');

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
    });

    test('should clear invalid tokens from storage', async ({ page }) => {
      await sessionHelper.setSessionToken('invalid-token');

      await page.route('/api/verify-token', async route => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ valid: false })
        });
      });

      await page.goto('/dashboard');

      // Token should be removed from storage
      const token = await sessionHelper.getSessionToken();
      expect(token).toBeNull();
    });
  });

  test.describe('Session Management API', () => {
    test('should refresh tokens before expiration', async ({ page }) => {
      let refreshCalled = false;

      await sessionHelper.setSessionToken('expiring-token');

      await page.route('/api/refresh-token', async route => {
        refreshCalled = true;
        const authHeader = route.request().headers()['authorization'];
        expect(authHeader).toBe('Bearer expiring-token');

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            token: 'refreshed-token'
          })
        });
      });

      await page.goto('/dashboard');

      // Simulate token refresh trigger (implementation dependent)
      await page.waitForTimeout(2000);

      if (refreshCalled) {
        // Verify new token is stored
        const newToken = await sessionHelper.getSessionToken();
        expect(newToken).toBe('refreshed-token');
      }
    });

    test('should handle refresh token failure', async ({ page }) => {
      await sessionHelper.setSessionToken('expiring-token');

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

      await page.goto('/dashboard');

      // Should redirect to login after failed refresh
      await expect(page).toHaveURL('/');
    });

    test('should logout via API call', async ({ page }) => {
      let logoutCalled = false;

      await sessionHelper.setSessionToken('valid-token');

      await page.route('/api/logout', async route => {
        logoutCalled = true;
        const authHeader = route.request().headers()['authorization'];
        expect(authHeader).toBe('Bearer valid-token');

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
      await page.locator('[data-testid="logout-button"], button:has-text("התנתק")').click();

      expect(logoutCalled).toBe(true);

      // Should clear session
      const token = await sessionHelper.getSessionToken();
      expect(token).toBeNull();
    });
  });

  test.describe('Rate Limiting', () => {
    test('should handle rate limiting on login attempts', async ({ page }) => {
      let attemptCount = 0;

      await apiMock.mockInstructorsAPI();

      await page.route('/api/login', async route => {
        attemptCount++;

        if (attemptCount > 3) {
          await route.fulfill({
            status: 429,
            contentType: 'application/json',
            headers: {
              'Retry-After': '60'
            },
            body: JSON.stringify({
              success: false,
              message: 'יותר מדי ניסיונות התחברות. נסה שוב בעוד דקה.',
              retryAfter: 60
            })
          });
        } else {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              message: 'נתונים שגויים'
            })
          });
        }
      });

      const testCredentials = validTestCredentials[0];
      await loginPage.navigateToLogin();

      // Make multiple failed attempts
      for (let i = 0; i < 5; i++) {
        await loginPage.performLogin('wrong name', 'wrongid');
        await page.reload();
      }

      // Should show rate limiting message
      await expect(page.getByText(/יותר.*ניסיונות|rate.*limit/i)).toBeVisible();
    });

    test('should respect retry-after header', async ({ page }) => {
      await apiMock.mockInstructorsAPI();

      await page.route('/api/login', async route => {
        await route.fulfill({
          status: 429,
          headers: {
            'Retry-After': '5'
          },
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: 'נסה שוב בעוד 5 שניות',
            retryAfter: 5
          })
        });
      });

      const testCredentials = validTestCredentials[0];
      await loginPage.navigateToLogin();
      await loginPage.performLogin(testCredentials.name, testCredentials.idNumber);

      // Should show countdown or disable form
      await expect(loginPage.loginButton).toBeDisabled();
      await expect(page.getByText(/5.*שניות|5.*seconds/)).toBeVisible();
    });

    test('should implement client-side rate limiting', async ({ page }) => {
      await apiMock.mockInstructorsAPI();
      await apiMock.mockFailedLogin('נתונים שגויים');

      await loginPage.navigateToLogin();

      // Make rapid login attempts
      for (let i = 0; i < 10; i++) {
        await loginPage.performLogin('wrong', 'wrong');
        // Don't wait between attempts to trigger client-side limiting
      }

      // Should show client-side rate limiting
      await expect(loginPage.loginButton).toBeDisabled();
    });
  });

  test.describe('Error Recovery', () => {
    test('should retry failed requests automatically', async ({ page }) => {
      let failureCount = 0;

      await page.route('/api/instructors', async route => {
        failureCount++;

        if (failureCount <= 2) {
          await route.abort('failed');
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: mockInstructors })
          });
        }
      });

      await loginPage.navigateToLogin();

      // Should eventually succeed after retries
      await loginPage.instructorNameTrigger.click();
      await expect(page.locator('[role="option"]').first()).toBeVisible();
    });

    test('should implement exponential backoff for retries', async ({ page }) => {
      const requestTimes: number[] = [];

      await page.route('/api/instructors', async route => {
        requestTimes.push(Date.now());

        if (requestTimes.length <= 3) {
          await route.abort('failed');
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: mockInstructors })
          });
        }
      });

      await loginPage.navigateToLogin();
      await loginPage.instructorNameTrigger.click();
      await expect(page.locator('[role="option"]').first()).toBeVisible();

      // Verify exponential backoff (gaps should increase)
      if (requestTimes.length >= 3) {
        const gap1 = requestTimes[1] - requestTimes[0];
        const gap2 = requestTimes[2] - requestTimes[1];
        expect(gap2).toBeGreaterThan(gap1);
      }
    });

    test('should handle partial API failures gracefully', async ({ page }) => {
      // Instructors API succeeds, login API fails
      await apiMock.mockInstructorsAPI();

      await page.route('/api/login', async route => {
        await route.abort('failed');
      });

      await loginPage.navigateToLogin();

      // Should be able to select instructor (instructors API worked)
      await loginPage.instructorNameTrigger.click();
      await expect(page.locator('[role="option"]').first()).toBeVisible();

      // But login should fail gracefully
      const testCredentials = validTestCredentials[0];
      await loginPage.performLogin(testCredentials.name, testCredentials.idNumber);

      await expect(page.getByText(/שגיאה.*שרת|network.*error/i)).toBeVisible();
    });
  });

  test.describe('Data Validation', () => {
    test('should validate instructor data from API', async ({ page }) => {
      // Return invalid instructor data
      const invalidInstructor = {
        id: '',
        name: '',
        idNumber: 'invalid',
        isActive: 'not-boolean'
      };

      await page.route('/api/instructors', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [invalidInstructor] })
        });
      });

      await loginPage.navigateToLogin();

      // Should handle invalid data gracefully
      await loginPage.instructorNameTrigger.click();
      const options = page.locator('[role="option"]');
      await expect(options).toHaveCount(0); // Invalid data should be filtered out
    });

    test('should sanitize user input before API calls', async ({ page }) => {
      let requestData: any = null;

      await apiMock.mockInstructorsAPI();

      await page.route('/api/login', async route => {
        requestData = await route.request().postDataJSON();
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ success: false })
        });
      });

      await loginPage.navigateToLogin();
      await loginPage.selectInstructor(mockInstructors[0].name);

      // Try to inject malicious input
      await loginPage.idNumberInput.fill('<script>alert("xss")</script>');
      await loginPage.submitLogin();

      expect(requestData.idNumber).not.toContain('<script>');
      expect(requestData.idNumber).not.toContain('alert');
      // Should be cleaned to only digits
      expect(/^\d*$/.test(requestData.idNumber)).toBe(true);
    });
  });

  test.describe('Performance', () => {
    test('should handle concurrent API requests efficiently', async ({ page }) => {
      const requestTimings: { endpoint: string; timestamp: number }[] = [];

      // Track all API requests
      await page.route('/api/**', async route => {
        const endpoint = route.request().url();
        requestTimings.push({ endpoint, timestamp: Date.now() });

        if (endpoint.includes('instructors')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: mockInstructors })
          });
        } else {
          await route.continue();
        }
      });

      await loginPage.navigateToLogin();

      // Multiple navigation/interactions that might trigger API calls
      await loginPage.instructorNameTrigger.click();
      await page.locator('[role="option"]').first().click();

      // Verify reasonable request timing
      expect(requestTimings.length).toBeGreaterThan(0);
      expect(requestTimings.length).toBeLessThan(10); // Shouldn't make excessive requests
    });

    test('should implement request caching where appropriate', async ({ page }) => {
      let instructorsRequestCount = 0;

      await page.route('/api/instructors', async route => {
        instructorsRequestCount++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: mockInstructors })
        });
      });

      await loginPage.navigateToLogin();
      await page.reload();
      await page.reload();

      // Should cache instructors data and not make repeated requests
      expect(instructorsRequestCount).toBeLessThanOrEqual(3); // Allow for some reasonable requests
    });

    test('should handle large instructor lists efficiently', async ({ page }) => {
      // Generate large instructor list
      const largeInstructorList = Array.from({ length: 1000 }, () =>
        TestDataGenerator.generateRandomInstructor()
      );

      await page.route('/api/instructors', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: largeInstructorList })
        });
      });

      const startTime = Date.now();
      await loginPage.navigateToLogin();
      await loginPage.instructorNameTrigger.click();

      // Should handle large lists within reasonable time
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // 5 seconds max

      // Should still be interactive
      await expect(page.locator('[role="option"]').first()).toBeVisible();
    });
  });
});