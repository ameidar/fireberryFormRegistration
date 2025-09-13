# Instructor Login System - End-to-End Tests

This directory contains comprehensive Playwright tests for the instructor login and session management system. The tests are designed to work with Hebrew/RTL content and include extensive coverage of login functionality, authentication flows, visual regression, accessibility, and API integration.

## Test Structure

### Test Files

- **`instructor-login.spec.ts`** - Core login functionality tests
- **`auth-flow.spec.ts`** - Session management and authentication flows
- **`visual.spec.ts`** - Visual regression tests and RTL layout verification
- **`accessibility.spec.ts`** - Keyboard navigation, ARIA compliance, and a11y tests
- **`api-integration.spec.ts`** - API mocking, error handling, and network tests

### Utilities and Helpers

- **`utils/test-helpers.ts`** - Page objects, mock helpers, and test utilities
- **`utils/global-setup.ts`** - Global test setup and environment preparation
- **`utils/global-teardown.ts`** - Cleanup and test result reporting
- **`types/instructor.ts`** - TypeScript type definitions for testing
- **`fixtures/test-data.json`** - Test data and mock responses

## Quick Start

### Prerequisites

1. Node.js 16 or higher
2. Playwright installed (`npm run test:install`)

### Running Tests

```bash
# Install Playwright browsers
npm run test:install

# Run all tests
npm run test

# Run specific test suites
npm run test:login      # Login functionality
npm run test:auth       # Authentication flows
npm run test:visual     # Visual regression
npm run test:a11y       # Accessibility
npm run test:api        # API integration

# Run tests in specific browsers
npm run test:chromium
npm run test:firefox
npm run test:webkit
npm run test:mobile

# Debug tests
npm run test:debug      # Interactive debugging
npm run test:headed     # With browser UI
npm run test:ui         # Playwright Test UI

# View test reports
npm run test:report
```

## Test Configuration

### Environment Variables

The tests use the following environment variables (see `.env.test`):

```bash
NODE_ENV=test
VITE_USE_MOCK_DATA=true
VITE_API_BASE_URL=http://localhost:5173/api
DEFAULT_LOCALE=he-IL
RTL_TESTING=true
A11Y_TESTING=true
```

### Playwright Configuration

The `playwright.config.ts` includes:

- **Multi-browser support**: Chromium, Firefox, WebKit
- **Mobile testing**: iPhone 12, Pixel 5
- **Hebrew/RTL configuration**: `he-IL` locale, `Asia/Jerusalem` timezone
- **Visual regression**: Screenshot comparison with 0.2 threshold
- **Parallel execution**: Fully parallel test runs
- **Retry logic**: Automatic retries on CI

## Test Categories

### 1. Login Functionality Tests

**File**: `instructor-login.spec.ts`

Tests core login features:
- Form validation and Hebrew text input
- Israeli ID number validation and formatting
- Instructor dropdown autocomplete
- Loading states and error handling
- Successful and failed login scenarios
- Visual regression for login states

**Key Test Cases**:
```typescript
test('should validate Israeli ID checksum in real-time')
test('should login with valid credentials')
test('should show error for invalid credentials')
test('should support keyboard navigation')
```

### 2. Authentication Flow Tests

**File**: `auth-flow.spec.ts`

Tests session management:
- Session creation and persistence
- Auto-login with stored tokens
- Session timeout warnings
- Token refresh mechanisms
- Logout functionality
- Multi-tab synchronization

**Key Test Cases**:
```typescript
test('should create session after successful login')
test('should show session timeout warning')
test('should logout and clear session')
test('should handle concurrent sessions')
```

### 3. Visual Regression Tests

**File**: `visual.spec.ts`

Tests UI consistency and RTL layout:
- Screenshot comparisons across browsers
- RTL layout verification
- Hebrew font rendering
- Responsive design testing
- Mobile and tablet layouts
- High contrast mode support

**Key Test Cases**:
```typescript
test('should match login page initial state')
test('should verify Hebrew text rendering and RTL direction')
test('should render correctly at mobile viewport')
test('should handle high contrast mode')
```

### 4. Accessibility Tests

**File**: `accessibility.spec.ts`

Tests accessibility compliance:
- Keyboard navigation support
- ARIA labels and roles
- Focus management
- Screen reader compatibility
- Color contrast validation
- Mobile accessibility

**Key Test Cases**:
```typescript
test('should support tab navigation through all interactive elements')
test('should have proper ARIA labels on all form elements')
test('should provide visible focus indicators')
test('should announce form validation errors')
```

### 5. API Integration Tests

**File**: `api-integration.spec.ts`

Tests API interactions:
- Request/response validation
- Error handling and retries
- Rate limiting
- Network failures
- Data sanitization
- Performance testing

**Key Test Cases**:
```typescript
test('should send login request with correct payload')
test('should handle rate limiting on login attempts')
test('should retry failed requests automatically')
test('should validate response structure')
```

## Mock Data and Test Helpers

### Hebrew Text Validation

```typescript
import { HebrewTextValidator } from './utils/test-helpers';

// Validate Hebrew text
expect(HebrewTextValidator.isHebrewText('כניסת מדריכים')).toBe(true);

// Validate Israeli ID
expect(HebrewTextValidator.validateIsraeliId('123456789')).toBe(true);
```

### Page Object Model

```typescript
import { LoginPageObject } from './utils/test-helpers';

const loginPage = new LoginPageObject(page);
await loginPage.navigateToLogin();
await loginPage.performLogin('דוד כהן', '123456789');
await loginPage.expectLoginSuccess();
```

### API Mocking

```typescript
import { ApiMockHelper } from './utils/test-helpers';

const apiMock = new ApiMockHelper(page);
await apiMock.mockInstructorsAPI();
await apiMock.mockSuccessfulLogin(instructor);
await apiMock.mockNetworkError();
```

## Test Data

### Mock Instructors

The tests use realistic Hebrew instructor data:

```json
{
  "id": "1",
  "name": "דוד כהן",
  "idNumber": "123456789",
  "specialization": "מתמטיקה",
  "isActive": true
}
```

### Valid Test Credentials

```json
[
  { "name": "דוד כהן", "idNumber": "123456789" },
  { "name": "שרה לוי", "idNumber": "987654321" },
  { "name": "מיכל אברהם", "idNumber": "555444333" }
]
```

## Visual Testing

### Screenshot Management

Screenshots are organized by:
- Test type (login, visual, accessibility)
- Browser (chromium, firefox, webkit)
- Viewport (desktop, mobile, tablet)
- State (initial, error, loading)

### Updating Screenshots

```bash
# Update all visual baselines
npm run test:update-screenshots

# Update specific test screenshots
npx playwright test visual.spec.ts --update-snapshots
```

## Debugging Tests

### Interactive Debugging

```bash
# Debug specific test
npx playwright test --debug instructor-login.spec.ts

# Debug with browser UI
npm run test:headed

# Use Playwright Test UI
npm run test:ui
```

### Test Artifacts

Failed tests generate:
- Screenshots (`test-results/screenshots/`)
- Videos (`test-results/videos/`)
- Traces (`test-results/traces/`)
- Network logs

## Performance Testing

Tests include performance monitoring:

```typescript
test('should login within performance thresholds', async ({ page }) => {
  const start = Date.now();
  await loginPage.performLogin(name, id);
  const duration = Date.now() - start;
  expect(duration).toBeLessThan(5000); // 5 second threshold
});
```

## CI/CD Integration

The tests are configured for CI environments:

```yaml
# GitHub Actions example
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run tests
  run: npm run test

- name: Upload test results
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
```

## Troubleshooting

### Common Issues

1. **Hebrew font rendering issues**
   - Ensure proper font installation on test machines
   - Use font fallbacks in CSS

2. **RTL layout problems**
   - Verify `dir="rtl"` attribute is set
   - Check CSS logical properties usage

3. **Flaky tests**
   - Increase wait times for animations
   - Use proper element waiting strategies
   - Mock time-dependent operations

4. **Visual regression failures**
   - Check for dynamic content (timestamps, animations)
   - Mask variable elements
   - Adjust threshold values

### Debug Commands

```bash
# Verbose test output
npx playwright test --reporter=list

# Generate trace for debugging
npx playwright test --trace=on

# Run single test file
npx playwright test instructor-login.spec.ts

# Run specific test
npx playwright test -g "should login with valid credentials"
```

## Best Practices

### Writing Tests

1. Use descriptive test names in English
2. Include Hebrew text validation
3. Test both success and error scenarios
4. Mock external dependencies
5. Clean up test data after each test

### Page Objects

1. Use semantic selectors over CSS selectors
2. Include RTL-specific interactions
3. Handle loading states properly
4. Provide meaningful error messages

### Visual Testing

1. Wait for animations to complete
2. Mask dynamic content
3. Test multiple viewports
4. Include both light and dark modes

## Contributing

When adding new tests:

1. Follow the existing pattern and structure
2. Include proper TypeScript types
3. Add Hebrew text validation where applicable
4. Include both positive and negative test cases
5. Update this README with new test categories

## Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Testing Library Best Practices](https://testing-library.com/docs/guiding-principles)
- [Web Content Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Hebrew Typography Guidelines](https://hebrew-typography.com/)
- [RTL CSS Guidelines](https://rtlcss.com/)