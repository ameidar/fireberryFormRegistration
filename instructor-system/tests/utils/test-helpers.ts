import { Page, Locator, expect } from '@playwright/test';
import type { Instructor, LoginResponse } from '../../src/types/instructor';

/**
 * Mock data for testing
 */
export const mockInstructors: Instructor[] = [
  {
    id: '1',
    name: 'דוד כהן',
    idNumber: '123456789',
    email: 'david.cohen@example.com',
    phone: '050-1234567',
    specialization: 'מתמטיקה',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'שרה לוי',
    idNumber: '987654321',
    email: 'sarah.levi@example.com',
    phone: '052-9876543',
    specialization: 'פיזיקה',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '3',
    name: 'מיכל אברהם',
    idNumber: '555444333',
    email: 'michal.abraham@example.com',
    phone: '054-5554443',
    specialization: 'כימיה',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '4',
    name: 'יוסף רוזן',
    idNumber: '111222333',
    email: 'yosef.rosen@example.com',
    phone: '053-1112223',
    specialization: 'ביולוגיה',
    isActive: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

export const validTestCredentials = [
  { name: 'דוד כהן', idNumber: '123456789' },
  { name: 'שרה לוי', idNumber: '987654321' },
  { name: 'מיכל אברהם', idNumber: '555444333' }
];

export const invalidTestCredentials = [
  { name: 'דוד כהן', idNumber: '123456788', error: 'מספר זהות לא תקין' },
  { name: 'שרה לוי', idNumber: '12345678', error: 'מספר זהות חייב להכיל 9 ספרות' },
  { name: 'לא קיים', idNumber: '123456789', error: 'מדריך לא נמצא' },
  { name: '', idNumber: '123456789', error: 'שדה חובה' },
  { name: 'דוד כהן', idNumber: '', error: 'שדה חובה' }
];

/**
 * Hebrew text validation helpers
 */
export class HebrewTextValidator {
  static isHebrewText(text: string): boolean {
    // Check if text contains Hebrew characters
    const hebrewRegex = /[\u0590-\u05FF]/;
    return hebrewRegex.test(text);
  }

  static isRTLText(text: string): boolean {
    // Check if text is primarily right-to-left
    const rtlRegex = /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F]/;
    return rtlRegex.test(text);
  }

  static validateHebrewName(name: string): boolean {
    // Validate Hebrew name format
    const hebrewNameRegex = /^[\u0590-\u05FF\s]+$/;
    return hebrewNameRegex.test(name) && name.trim().length > 0;
  }

  static validateIsraeliId(id: string): boolean {
    // Israeli ID checksum validation
    const cleanId = id.replace(/\D/g, '');
    if (cleanId.length !== 9) return false;

    const digits = cleanId.split('').map(Number);
    let sum = 0;

    for (let i = 0; i < 8; i++) {
      let digit = digits[i] * ((i % 2) + 1);
      if (digit > 9) digit = Math.floor(digit / 10) + (digit % 10);
      sum += digit;
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === digits[8];
  }

  static formatIsraeliId(id: string): string {
    const cleanId = id.replace(/\D/g, '');
    if (cleanId.length <= 3) return cleanId;
    if (cleanId.length <= 6) return `${cleanId.slice(0, 3)}-${cleanId.slice(3)}`;
    return `${cleanId.slice(0, 3)}-${cleanId.slice(3, 6)}-${cleanId.slice(6)}`;
  }
}

/**
 * Page Object Model for Login Page
 */
export class LoginPageObject {
  constructor(private page: Page) {}

  // Selectors
  get instructorNameSelect(): Locator {
    return this.page.locator('[data-testid="instructor-name-select"]');
  }

  get instructorNameTrigger(): Locator {
    return this.page.locator('[role="combobox"][aria-label*="מדריך"]');
  }

  get idNumberInput(): Locator {
    return this.page.locator('input[name="idNumber"]');
  }

  get showIdToggle(): Locator {
    return this.page.locator('button[type="button"] svg');
  }

  get loginButton(): Locator {
    return this.page.locator('button[type="submit"]');
  }

  get errorMessages(): Locator {
    return this.page.locator('.text-red-500');
  }

  get loadingSpinner(): Locator {
    return this.page.locator('[data-testid="loading-spinner"], .animate-spin');
  }

  get developmentHelper(): Locator {
    return this.page.locator('.bg-yellow-50');
  }

  // Actions
  async navigateToLogin(): Promise<void> {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  async selectInstructor(instructorName: string): Promise<void> {
    await this.instructorNameTrigger.click();
    await this.page.locator(`[role="option"]:has-text("${instructorName}")`).click();
  }

  async fillIdNumber(idNumber: string): Promise<void> {
    await this.idNumberInput.fill(idNumber);
  }

  async toggleIdVisibility(): Promise<void> {
    await this.showIdToggle.click();
  }

  async submitLogin(): Promise<void> {
    await this.loginButton.click();
  }

  async performLogin(instructorName: string, idNumber: string): Promise<void> {
    await this.selectInstructor(instructorName);
    await this.fillIdNumber(idNumber);
    await this.submitLogin();
  }

  // Assertions
  async expectLoginSuccess(): Promise<void> {
    // Should redirect or show success state
    await expect(this.page).not.toHaveURL('/');
  }

  async expectLoginError(errorMessage?: string): Promise<void> {
    if (errorMessage) {
      await expect(this.page.locator('.text-red-500')).toContainText(errorMessage);
    } else {
      await expect(this.errorMessages).toBeVisible();
    }
  }

  async expectIdValidation(isValid: boolean): Promise<void> {
    if (isValid) {
      await expect(this.page.locator('.text-green-600')).toContainText('תקין');
    } else {
      await expect(this.page.locator('.text-red-500')).toContainText('לא תקין');
    }
  }
}

/**
 * API Mock Helpers
 */
export class ApiMockHelper {
  constructor(private page: Page) {}

  async mockInstructorsAPI(): Promise<void> {
    await this.page.route('/api/instructors', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: mockInstructors })
      });
    });
  }

  async mockSuccessfulLogin(instructor: Instructor): Promise<void> {
    await this.page.route('/api/login', async route => {
      const response: LoginResponse = {
        success: true,
        instructor,
        token: 'mock-jwt-token-12345',
        message: 'התחברות הצליחה'
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  async mockFailedLogin(message: string = 'שגיאה בהתחברות'): Promise<void> {
    await this.page.route('/api/login', async route => {
      const response: LoginResponse = {
        success: false,
        instructor: null,
        token: null,
        message
      };

      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  async mockNetworkError(): Promise<void> {
    await this.page.route('/api/**', async route => {
      await route.abort('failed');
    });
  }

  async mockSlowResponse(delay: number = 5000): Promise<void> {
    await this.page.route('/api/login', async route => {
      await new Promise(resolve => setTimeout(resolve, delay));
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
  }
}

/**
 * Screenshot and Visual Testing Helpers
 */
export class VisualTestHelper {
  constructor(private page: Page) {}

  async takeScreenshot(name: string, options?: {
    fullPage?: boolean;
    mask?: Locator[];
    clip?: { x: number; y: number; width: number; height: number };
  }): Promise<void> {
    await this.page.screenshot({
      path: `test-results/screenshots/${name}.png`,
      fullPage: options?.fullPage || false,
      mask: options?.mask,
      clip: options?.clip
    });
  }

  async expectScreenshot(name: string, options?: {
    threshold?: number;
    maxDiffPixels?: number;
  }): Promise<void> {
    await expect(this.page).toHaveScreenshot(`${name}.png`, {
      threshold: options?.threshold || 0.2,
      maxDiffPixels: options?.maxDiffPixels
    });
  }

  async maskSensitiveData(): Promise<Locator[]> {
    // Mask dynamic content that changes between test runs
    return [
      this.page.locator('[data-testid="timestamp"]'),
      this.page.locator('.animate-spin'),
      this.page.locator('[data-testid="loading"]')
    ];
  }
}

/**
 * Accessibility Test Helper
 */
export class AccessibilityHelper {
  constructor(private page: Page) {}

  async checkKeyboardNavigation(): Promise<void> {
    // Test tab navigation
    await this.page.keyboard.press('Tab');
    await expect(this.page.locator(':focus')).toBeVisible();
  }

  async checkAriaLabels(): Promise<void> {
    const requiredAriaElements = [
      'button[type="submit"]',
      'input[name="idNumber"]',
      '[role="combobox"]'
    ];

    for (const selector of requiredAriaElements) {
      const element = this.page.locator(selector);
      await expect(element).toHaveAttribute('aria-label', /.+/);
    }
  }

  async checkFocusManagement(): Promise<void> {
    // Ensure focus is properly managed during interactions
    await this.page.keyboard.press('Tab');
    const focusedElement = await this.page.locator(':focus').first();
    await expect(focusedElement).toBeVisible();
  }
}

/**
 * Session Management Helper
 */
export class SessionHelper {
  constructor(private page: Page) {}

  async setSessionToken(token: string): Promise<void> {
    await this.page.evaluate((token) => {
      localStorage.setItem('instructorToken', token);
    }, token);
  }

  async clearSession(): Promise<void> {
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }

  async getSessionToken(): Promise<string | null> {
    return await this.page.evaluate(() => {
      return localStorage.getItem('instructorToken');
    });
  }

  async simulateExpiredSession(): Promise<void> {
    await this.page.evaluate(() => {
      const expiredToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImV4cCI6MTYwOTQ1OTIwMH0.invalid';
      localStorage.setItem('instructorToken', expiredToken);
    });
  }
}

/**
 * Performance Test Helper
 */
export class PerformanceHelper {
  constructor(private page: Page) {}

  async measureLoginPerformance(): Promise<{
    loadTime: number;
    networkTime: number;
    renderTime: number;
  }> {
    const startTime = Date.now();

    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    const performanceMetrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        networkTime: navigation.responseEnd - navigation.requestStart,
        renderTime: navigation.domContentLoadedEventEnd - navigation.responseEnd
      };
    });

    return {
      loadTime,
      ...performanceMetrics
    };
  }
}

/**
 * Test Data Generator
 */
export class TestDataGenerator {
  static generateRandomInstructor(): Instructor {
    const names = ['אברהם', 'יצחק', 'יעקב', 'שרה', 'רבקה', 'רחל', 'לאה'];
    const lastNames = ['כהן', 'לוי', 'ישראל', 'אברהם', 'רוזן', 'מזרחי'];
    const specializations = ['מתמטיקה', 'פיזיקה', 'כימיה', 'ביולוגיה', 'היסטוריה', 'גיאוגרפיה'];

    const firstName = names[Math.floor(Math.random() * names.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

    return {
      id: Math.random().toString(36).substr(2, 9),
      name: `${firstName} ${lastName}`,
      idNumber: this.generateValidIsraeliId(),
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
      phone: `05${Math.floor(Math.random() * 10)}-${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
      specialization: specializations[Math.floor(Math.random() * specializations.length)],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  static generateValidIsraeliId(): string {
    // Generate a valid Israeli ID with proper checksum
    const digits: number[] = [];

    // Generate first 8 digits
    for (let i = 0; i < 8; i++) {
      digits.push(Math.floor(Math.random() * 10));
    }

    // Calculate checksum
    let sum = 0;
    for (let i = 0; i < 8; i++) {
      let digit = digits[i] * ((i % 2) + 1);
      if (digit > 9) digit = Math.floor(digit / 10) + (digit % 10);
      sum += digit;
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    digits.push(checkDigit);

    return digits.join('');
  }

  static generateInvalidIsraeliId(): string {
    const validId = this.generateValidIsraeliId();
    const digits = validId.split('').map(Number);
    // Change the last digit to make it invalid
    digits[8] = (digits[8] + 1) % 10;
    return digits.join('');
  }
}