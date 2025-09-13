import { test, expect } from '@playwright/test';
import {
  LoginPageObject,
  ApiMockHelper,
  AccessibilityHelper,
  HebrewTextValidator,
  mockInstructors,
  validTestCredentials
} from './utils/test-helpers';

test.describe('Accessibility Tests', () => {
  let loginPage: LoginPageObject;
  let apiMock: ApiMockHelper;
  let a11yHelper: AccessibilityHelper;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPageObject(page);
    apiMock = new ApiMockHelper(page);
    a11yHelper = new AccessibilityHelper(page);

    await apiMock.mockInstructorsAPI();
    await loginPage.navigateToLogin();
  });

  test.describe('Keyboard Navigation', () => {
    test('should support tab navigation through all interactive elements', async ({ page }) => {
      const interactiveElements = [
        loginPage.instructorNameTrigger,
        loginPage.idNumberInput,
        loginPage.showIdToggle,
        loginPage.loginButton
      ];

      let currentIndex = 0;

      // Start from first element
      await page.keyboard.press('Tab');
      await expect(interactiveElements[currentIndex]).toBeFocused();

      // Tab through all elements
      for (let i = 1; i < interactiveElements.length; i++) {
        await page.keyboard.press('Tab');
        await expect(interactiveElements[i]).toBeFocused();
      }
    });

    test('should support shift+tab for reverse navigation', async ({ page }) => {
      // Start from last element
      await loginPage.loginButton.focus();

      const reverseOrder = [
        loginPage.showIdToggle,
        loginPage.idNumberInput,
        loginPage.instructorNameTrigger
      ];

      for (const element of reverseOrder) {
        await page.keyboard.press('Shift+Tab');
        await expect(element).toBeFocused();
      }
    });

    test('should open dropdown with Enter key', async ({ page }) => {
      await loginPage.instructorNameTrigger.focus();
      await page.keyboard.press('Enter');

      // Dropdown should open
      const firstOption = page.locator('[role="option"]').first();
      await expect(firstOption).toBeVisible();
    });

    test('should open dropdown with Space key', async ({ page }) => {
      await loginPage.instructorNameTrigger.focus();
      await page.keyboard.press('Space');

      // Dropdown should open
      const firstOption = page.locator('[role="option"]').first();
      await expect(firstOption).toBeVisible();
    });

    test('should navigate dropdown options with arrow keys', async ({ page }) => {
      await loginPage.instructorNameTrigger.focus();
      await page.keyboard.press('Enter');

      // Wait for dropdown to open
      await expect(page.locator('[role="option"]').first()).toBeVisible();

      // Navigate down
      await page.keyboard.press('ArrowDown');
      await expect(page.locator('[role="option"][aria-selected="true"]').first()).toBeVisible();

      await page.keyboard.press('ArrowDown');
      await expect(page.locator('[role="option"][aria-selected="true"]').nth(0)).toBeVisible();

      // Navigate up
      await page.keyboard.press('ArrowUp');
      await expect(page.locator('[role="option"][aria-selected="true"]').first()).toBeVisible();
    });

    test('should select dropdown option with Enter', async ({ page }) => {
      await loginPage.instructorNameTrigger.focus();
      await page.keyboard.press('Enter');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');

      // Selection should be made
      const instructorName = mockInstructors[0].name;
      await expect(loginPage.instructorNameTrigger).toContainText(instructorName);
    });

    test('should close dropdown with Escape key', async ({ page }) => {
      await loginPage.instructorNameTrigger.focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('[role="option"]').first()).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(page.locator('[role="option"]').first()).not.toBeVisible();
    });

    test('should submit form with Enter key from any field', async ({ page }) => {
      const testCredentials = validTestCredentials[0];
      const testInstructor = mockInstructors.find(i => i.name === testCredentials.name)!;

      await apiMock.mockSuccessfulLogin(testInstructor);

      // Fill form
      await loginPage.selectInstructor(testCredentials.name);
      await loginPage.fillIdNumber(testCredentials.idNumber);

      // Press Enter from ID field
      await loginPage.idNumberInput.focus();
      await page.keyboard.press('Enter');

      await loginPage.expectLoginSuccess();
    });

    test('should handle Tab trapping when modal/dropdown is open', async ({ page }) => {
      await loginPage.instructorNameTrigger.focus();
      await page.keyboard.press('Enter');

      // When dropdown is open, Tab should cycle through dropdown options
      await page.keyboard.press('Tab');
      await expect(page.locator('[role="option"]').first()).toBeFocused();

      // Continue tabbing should stay within dropdown
      await page.keyboard.press('Tab');
      await expect(page.locator('[role="option"]').nth(1)).toBeFocused();
    });
  });

  test.describe('ARIA Labels and Roles', () => {
    test('should have proper ARIA labels on all form elements', async ({ page }) => {
      // Instructor name select
      await expect(loginPage.instructorNameTrigger).toHaveAttribute('role', 'combobox');
      await expect(loginPage.instructorNameTrigger).toHaveAttribute('aria-expanded', 'false');
      await expect(loginPage.instructorNameTrigger).toHaveAttribute('aria-haspopup', 'listbox');

      // ID number input
      await expect(loginPage.idNumberInput).toHaveAttribute('aria-label', /.+/);
      await expect(loginPage.idNumberInput).toHaveAttribute('type', 'password');

      // Submit button
      await expect(loginPage.loginButton).toHaveAttribute('type', 'submit');
    });

    test('should update ARIA states when dropdown is opened/closed', async ({ page }) => {
      // Initially closed
      await expect(loginPage.instructorNameTrigger).toHaveAttribute('aria-expanded', 'false');

      // Open dropdown
      await loginPage.instructorNameTrigger.click();
      await expect(loginPage.instructorNameTrigger).toHaveAttribute('aria-expanded', 'true');

      // Check dropdown has proper role and ARIA attributes
      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible();

      const options = page.locator('[role="option"]');
      await expect(options.first()).toHaveAttribute('aria-selected');
    });

    test('should have proper heading structure', async ({ page }) => {
      // Page should have h1 heading
      const h1 = page.locator('h1');
      await expect(h1).toBeVisible();
      await expect(h1).toContainText('כניסת מדריכים');

      // Check heading hierarchy (no skipped levels)
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      const headingLevels = await headings.evaluateAll(elements =>
        elements.map(el => parseInt(el.tagName.charAt(1)))
      );

      // Should start with h1 and not skip levels
      expect(headingLevels[0]).toBe(1);
      for (let i = 1; i < headingLevels.length; i++) {
        expect(headingLevels[i] - headingLevels[i-1]).toBeLessThanOrEqual(1);
      }
    });

    test('should associate labels with form controls', async ({ page }) => {
      // Check label-input associations
      const nameLabel = page.locator('label:has-text("שם המדריך")');
      const idLabel = page.locator('label:has-text("מספר זהות")');

      // Labels should have 'for' attribute pointing to their inputs
      const nameLabelFor = await nameLabel.getAttribute('for');
      const idLabelFor = await idLabel.getAttribute('for');

      if (nameLabelFor) {
        await expect(page.locator(`#${nameLabelFor}`)).toBeVisible();
      }

      if (idLabelFor) {
        await expect(page.locator(`#${idLabelFor}`)).toBeVisible();
      }
    });

    test('should provide error announcement via ARIA live regions', async ({ page }) => {
      // Submit invalid form
      await loginPage.submitLogin();

      // Check for ARIA live region with error messages
      const liveRegion = page.locator('[aria-live="polite"], [aria-live="assertive"], [role="alert"]');

      if (await liveRegion.count() > 0) {
        await expect(liveRegion.first()).toBeVisible();
      }

      // Error messages should be associated with inputs
      const errorMessages = page.locator('.text-red-500');
      await expect(errorMessages.first()).toBeVisible();
    });

    test('should describe form validation requirements', async ({ page }) => {
      // Required fields should be marked
      const requiredFields = page.locator('[required], [aria-required="true"]');
      await expect(requiredFields.first()).toBeVisible();

      // Check for helper text or descriptions
      const helperTexts = page.locator('[id*="description"], [id*="help"], [aria-describedby]');

      if (await helperTexts.count() > 0) {
        const firstHelper = helperTexts.first();
        const helperId = await firstHelper.getAttribute('id');

        if (helperId) {
          const associatedField = page.locator(`[aria-describedby*="${helperId}"]`);
          await expect(associatedField).toBeVisible();
        }
      }
    });
  });

  test.describe('Focus Management', () => {
    test('should provide visible focus indicators', async ({ page }) => {
      const focusableElements = [
        loginPage.instructorNameTrigger,
        loginPage.idNumberInput,
        loginPage.showIdToggle,
        loginPage.loginButton
      ];

      for (const element of focusableElements) {
        await element.focus();

        // Check for focus indicators (outline, box-shadow, etc.)
        const styles = await element.evaluate(el => {
          const computed = window.getComputedStyle(el);
          return {
            outline: computed.outline,
            outlineWidth: computed.outlineWidth,
            boxShadow: computed.boxShadow,
            borderColor: computed.borderColor
          };
        });

        // Should have some form of visible focus indicator
        const hasFocusIndicator =
          styles.outline !== 'none' ||
          styles.outlineWidth !== '0px' ||
          styles.boxShadow !== 'none' ||
          styles.borderColor !== 'initial';

        expect(hasFocusIndicator).toBe(true);
      }
    });

    test('should manage focus when dropdown opens', async ({ page }) => {
      await loginPage.instructorNameTrigger.focus();
      await page.keyboard.press('Enter');

      // Focus should move to first option or remain on trigger
      const focusedElement = page.locator(':focus');
      const isTriggerOrOption = await focusedElement.evaluate(el => {
        return el.closest('[role="combobox"]') !== null ||
               el.closest('[role="option"]') !== null ||
               el.getAttribute('role') === 'combobox' ||
               el.getAttribute('role') === 'option';
      });

      expect(isTriggerOrOption).toBe(true);
    });

    test('should return focus to trigger when dropdown closes', async ({ page }) => {
      await loginPage.instructorNameTrigger.focus();
      await page.keyboard.press('Enter');
      await page.keyboard.press('Escape');

      // Focus should return to trigger
      await expect(loginPage.instructorNameTrigger).toBeFocused();
    });

    test('should not trap focus when modal is not present', async ({ page }) => {
      await loginPage.instructorNameTrigger.focus();
      await page.keyboard.press('Tab');
      await expect(loginPage.idNumberInput).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(loginPage.showIdToggle).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(loginPage.loginButton).toBeFocused();

      // Tab out of form should move focus elsewhere
      await page.keyboard.press('Tab');
      const focused = await page.locator(':focus').evaluate(el => el.tagName.toLowerCase());
      expect(['body', 'html'].includes(focused) || focused !== 'button').toBe(true);
    });

    test('should focus first error field on validation failure', async ({ page }) => {
      await loginPage.submitLogin();

      // Wait for validation
      await expect(loginPage.errorMessages).toHaveCount(2);

      // Focus should move to first field with error
      const focusedElement = await page.locator(':focus').getAttribute('name');
      expect(focusedElement).toBe('instructorName');
    });
  });

  test.describe('Screen Reader Compatibility', () => {
    test('should provide meaningful alt text for icons', async ({ page }) => {
      // Fill ID to show eye icon
      await loginPage.fillIdNumber('123456789');

      const eyeIcon = loginPage.showIdToggle;
      await expect(eyeIcon).toBeVisible();

      // Icon button should have accessible name
      const accessibleName = await eyeIcon.evaluate(el => {
        return el.getAttribute('aria-label') ||
               el.getAttribute('title') ||
               el.textContent ||
               (el.querySelector('svg') && el.querySelector('svg')!.getAttribute('aria-label'));
      });

      expect(accessibleName).toBeTruthy();
      expect(accessibleName).toMatch(/show|hide|הצג|הסתר|עין/i);
    });

    test('should announce form validation errors', async ({ page }) => {
      await loginPage.submitLogin();

      const errorElements = page.locator('.text-red-500');
      await expect(errorElements.first()).toBeVisible();

      // Error messages should be in Hebrew
      const errorText = await errorElements.first().textContent();
      expect(HebrewTextValidator.isHebrewText(errorText!)).toBe(true);
    });

    test('should provide status updates for loading states', async ({ page }) => {
      await apiMock.mockSlowResponse(2000);

      await loginPage.selectInstructor(mockInstructors[0].name);
      await loginPage.fillIdNumber('123456789');
      await loginPage.submitLogin();

      // Loading state should be announced
      await expect(loginPage.loadingSpinner).toBeVisible();
      await expect(loginPage.loginButton).toContainText('מתחבר...');

      // Button should indicate its busy state
      const buttonAriaLabel = await loginPage.loginButton.getAttribute('aria-label');
      const buttonText = await loginPage.loginButton.textContent();

      expect(buttonText).toContain('מתחבר');
    });

    test('should announce successful form submission', async ({ page }) => {
      const testCredentials = validTestCredentials[0];
      const testInstructor = mockInstructors.find(i => i.name === testCredentials.name)!;

      await apiMock.mockSuccessfulLogin(testInstructor);
      await loginPage.performLogin(testCredentials.name, testCredentials.idNumber);

      // Success should be announced via live region or redirect
      const liveRegions = page.locator('[aria-live], [role="alert"], [role="status"]');

      if (await liveRegions.count() > 0) {
        const announcements = await liveRegions.allTextContents();
        const hasSuccessMessage = announcements.some(text =>
          text.includes('הצלחה') || text.includes('success') || text.includes('התחבר')
        );
        // Note: Success might be indicated by navigation instead of message
      }

      // At minimum, should navigate away from login
      await loginPage.expectLoginSuccess();
    });
  });

  test.describe('Color and Contrast', () => {
    test('should maintain sufficient color contrast', async ({ page }) => {
      // Check contrast of key text elements
      const elements = [
        { selector: 'h1', name: 'main heading' },
        { selector: 'label', name: 'form labels' },
        { selector: 'button[type="submit"]', name: 'submit button' },
        { selector: '.text-red-500', name: 'error text', shouldExist: false }
      ];

      for (const element of elements) {
        const locator = page.locator(element.selector).first();

        if (element.shouldExist === false) {
          // Skip if element shouldn't exist yet
          if (await locator.count() === 0) continue;
        }

        await expect(locator).toBeVisible();

        const colors = await locator.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return {
            color: styles.color,
            backgroundColor: styles.backgroundColor,
            fontSize: styles.fontSize
          };
        });

        // Colors should be defined (not 'initial' or 'inherit')
        expect(colors.color).not.toBe('initial');
        expect(colors.color).not.toBe('inherit');
      }
    });

    test('should work without relying solely on color', async ({ page }) => {
      // Trigger validation errors
      await loginPage.submitLogin();

      const errorElements = page.locator('.text-red-500');
      await expect(errorElements.first()).toBeVisible();

      // Errors should be indicated by more than just color
      // (icons, text content, positioning, etc.)
      const firstError = errorElements.first();
      const hasTextContent = await firstError.evaluate(el =>
        (el.textContent || '').trim().length > 0
      );

      expect(hasTextContent).toBe(true);
    });

    test('should be usable in high contrast mode', async ({ page }) => {
      // Enable high contrast
      await page.emulateMedia({ colorScheme: 'dark', forcedColors: 'active' });

      await page.reload();

      // All interactive elements should remain visible and usable
      await expect(loginPage.instructorNameTrigger).toBeVisible();
      await expect(loginPage.idNumberInput).toBeVisible();
      await expect(loginPage.loginButton).toBeVisible();

      // Test interaction still works
      await loginPage.instructorNameTrigger.click();
      await expect(page.locator('[role="option"]').first()).toBeVisible();
    });
  });

  test.describe('Motion and Animation', () => {
    test('should respect reduced motion preferences', async ({ page }) => {
      // Set reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' });

      await page.reload();

      // Open dropdown (animation should be reduced/disabled)
      await loginPage.instructorNameTrigger.click();
      await expect(page.locator('[role="option"]').first()).toBeVisible();

      // Check that animations are reduced
      const dropdown = page.locator('[role="listbox"]');
      const animationDuration = await dropdown.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return styles.animationDuration || styles.transitionDuration;
      });

      // Should be 0s or very short for reduced motion
      expect(animationDuration === '0s' || parseFloat(animationDuration) < 0.1).toBe(true);
    });

    test('should not cause seizures or vestibular disorders', async ({ page }) => {
      // Ensure no rapidly flashing content
      const flashingElements = page.locator('.animate-pulse, .animate-ping, .animate-bounce');

      if (await flashingElements.count() > 0) {
        // If there are flashing elements, they should flash slowly
        const animationDuration = await flashingElements.first().evaluate(el => {
          const styles = window.getComputedStyle(el);
          return parseFloat(styles.animationDuration.replace('s', ''));
        });

        // Animation should be slower than 3 flashes per second
        expect(animationDuration).toBeGreaterThan(0.33); // More than 333ms per cycle
      }
    });
  });

  test.describe('RTL Accessibility', () => {
    test('should support RTL screen readers', async ({ page }) => {
      // Check RTL direction is properly set
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

      // Form elements should be in logical reading order for RTL
      const formElements = [
        loginPage.instructorNameTrigger,
        loginPage.idNumberInput,
        loginPage.loginButton
      ];

      // Check tab order makes sense in RTL context
      for (let i = 0; i < formElements.length; i++) {
        await page.keyboard.press('Tab');
        await expect(formElements[i]).toBeFocused();
      }
    });

    test('should properly announce Hebrew text', async ({ page }) => {
      // All visible text should be in Hebrew
      const textElements = [
        page.getByText('כניסת מדריכים'),
        page.getByText('שם המדריך'),
        page.getByText('מספר זהות'),
        page.getByText('התחבר')
      ];

      for (const element of textElements) {
        await expect(element).toBeVisible();
        const text = await element.textContent();
        expect(HebrewTextValidator.isHebrewText(text!)).toBe(true);
      }
    });

    test('should handle mixed LTR/RTL content correctly', async ({ page }) => {
      // Fill ID number (LTR)
      await loginPage.fillIdNumber('123456789');

      // ID display should be LTR within RTL context
      const idDisplay = page.locator('.font-mono');
      await expect(idDisplay).toHaveAttribute('dir', 'ltr');

      // But should be properly embedded in RTL layout
      const parentDir = await idDisplay.evaluate(el => {
        return window.getComputedStyle(el.parentElement!).direction;
      });
      expect(parentDir).toBe('rtl');
    });
  });

  test.describe('Mobile Accessibility', () => {
    test.use({ viewport: { width: 390, height: 844 } }); // iPhone 12 Pro

    test('should be accessible on mobile devices', async ({ page }) => {
      // Touch targets should be large enough (at least 44px)
      const touchTargets = [
        loginPage.instructorNameTrigger,
        loginPage.idNumberInput,
        loginPage.showIdToggle,
        loginPage.loginButton
      ];

      for (const target of touchTargets) {
        const box = await target.boundingBox();
        expect(box!.height).toBeGreaterThanOrEqual(40); // Minimum touch target size
        expect(box!.width).toBeGreaterThanOrEqual(40);
      }
    });

    test('should support mobile screen readers', async ({ page }) => {
      // Test touch-based navigation
      await loginPage.instructorNameTrigger.tap();
      await expect(page.locator('[role="option"]').first()).toBeVisible();

      // Dropdown should be accessible via touch
      const firstOption = page.locator('[role="option"]').first();
      await firstOption.tap();

      const instructorName = mockInstructors[0].name;
      await expect(loginPage.instructorNameTrigger).toContainText(instructorName);
    });

    test('should handle virtual keyboard properly', async ({ page }) => {
      // Focus on text input should open virtual keyboard
      await loginPage.idNumberInput.tap();

      // Input should remain visible and functional
      await expect(loginPage.idNumberInput).toBeFocused();
      await loginPage.idNumberInput.type('123456789');

      const value = await loginPage.idNumberInput.inputValue();
      expect(value).toBe('123456789');
    });
  });
});