# 🎓 Fireberry Instructor Management System

A comprehensive React TypeScript application for instructor authentication and session management, integrated with the Fireberry API.

## ✨ Features

### 🔐 Authentication System
- **Instructor Login** with name selection and Israeli ID validation
- **Session Management** with secure token-based authentication
- **Auto-logout** with session timeout warnings
- **Remember Me** functionality with secure cookie storage

### 📚 Session Management
- **My Cycles** dashboard for instructors
- **Session Filtering** by status (Active/Inactive/Completed)
- **Search Functionality** across session names
- **Pagination Support** for large datasets
- **Detailed Session Views** with student management

### 🌍 Hebrew & RTL Support
- **Complete Hebrew Localization** throughout the interface
- **RTL Layout** with proper text direction handling
- **Israeli ID Validation** with checksum algorithm
- **Hebrew Fonts** (Assistant & Heebo) for optimal readability

### 🔧 Technical Features
- **TypeScript** with comprehensive type safety
- **React Query** for efficient data fetching and caching
- **Zod Validation** for robust form and API validation
- **TailwindCSS** with shadcn/ui components
- **Playwright Testing** with comprehensive E2E coverage

## 🚀 Getting Started

### Prerequisites

- **Node.js** 16.0.0 or higher
- **npm** or **yarn** package manager
- **Git** for version control

### Installation

1. **Clone the repository:**
   ```bash
   git checkout tutors  # Switch to tutors branch
   cd instructor-system
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   ```bash
   # Copy environment template
   cp .env.development .env.local

   # Edit .env.local with your configuration
   # VITE_FIREBERRY_API_KEY=your_actual_api_key_here
   # VITE_USE_MOCK_DATA=true  # For development
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   ```
   http://localhost:3000
   ```

## 📋 Environment Configuration

### Required Environment Variables

```bash
# Fireberry API Configuration
VITE_FIREBERRY_API_URL=https://api.fireberry.com/api
VITE_FIREBERRY_API_KEY=your_fireberry_api_key_here

# Development Settings
VITE_USE_MOCK_DATA=true          # Use mock data for development
VITE_DEBUG_MODE=true             # Enable debug features

# Session Configuration
VITE_SESSION_TIMEOUT=1800000     # Session timeout (30 minutes)
VITE_SESSION_WARNING_TIME=300000 # Warning time before expiry (5 minutes)

# API Configuration
VITE_API_TIMEOUT=10000           # API request timeout
VITE_API_RETRY_ATTEMPTS=3        # Number of retry attempts
```

## 🧪 Testing

### Development Testing (Mock Data)

The system includes comprehensive mock data for development and testing:

**Valid Login Credentials:**
- **דוד כהן** - ID: `123456789`
- **שרה לוי** - ID: `987654321`
- **מיכל אברהם** - ID: `555444333`
- **אהרון גרין** - ID: `111222333`

### Running Tests

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run all tests
npm run test

# Run specific test suites
npm run test:login      # Login functionality tests
npm run test:auth       # Authentication flow tests
npm run test:visual     # Visual regression tests
npm run test:a11y       # Accessibility tests
npm run test:api        # API integration tests

# Interactive testing
npm run test:debug      # Debug mode
npm run test:ui         # Playwright Test UI

# Browser-specific testing
npm run test:firefox    # Firefox only
npm run test:mobile     # Mobile devices
```

### Test Coverage

- **185+ Test Cases** across all functionality
- **Multi-browser Testing** (Chrome, Firefox, Safari)
- **Mobile & Tablet Testing** with different viewports
- **Hebrew RTL Testing** for proper layout rendering
- **Accessibility Testing** (WCAG compliance)
- **Visual Regression Testing** with screenshot comparison
- **API Integration Testing** with comprehensive mock scenarios

## 🏗️ Architecture

### Project Structure

```
instructor-system/
├── src/
│   ├── components/           # React components
│   │   ├── ui/              # shadcn/ui base components
│   │   └── instructor/      # Instructor-specific components
│   ├── services/            # API services and adapters
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions
│   ├── lib/                # Zod schemas and validations
│   ├── mocks/              # Mock data for development
│   └── hooks/              # Custom React hooks
├── tests/                  # Playwright test files
├── public/                 # Static assets
└── docs/                  # Additional documentation
```

### Component Hierarchy

```
App
├── InstructorLogin         # Authentication interface
├── InstructorSessionsPage  # Main dashboard (post-login)
│   ├── CohortsTable       # Sessions data table
│   │   ├── StatusFilter   # Filter by session status
│   │   ├── SearchBar      # Text search functionality
│   │   └── Pagination     # Page navigation
│   └── CohortDetailsDrawer # Session details modal
│       ├── SessionInfo    # Basic session information
│       ├── StudentsList   # Enrolled students
│       └── SessionNotes   # Additional notes and actions
└── AuthProvider           # Authentication context
```

## 🔌 API Integration

### Fireberry API Adapter

The system includes a comprehensive adapter for the Fireberry API:

```typescript
// Service usage example
import { instructorService } from '@/services/fireberry-api';

// Fetch all instructors
const instructors = await instructorService.fetchInstructors();

// Authenticate instructor
const response = await instructorService.loginInstructor(name, idNumber);

// Get instructor's sessions
const sessions = await instructorService.fetchCohortsByInstructor(
  instructorId,
  { status: 'active', search: 'מתמטיקה', page: 1 }
);
```

### Field Mapping

| Fireberry Field | Our Field | Description |
|----------------|-----------|-------------|
| `instructorid` | `id` | Instructor unique identifier |
| `name` | `name` | Instructor full name |
| `pcfsystemfield247` | `idNumber` | Israeli ID number |
| `pcfsystemfield249` | `specialization` | Subject specialization |
| `customobject1000id` | `id` | Session unique identifier |
| `pcfsystemfield37` | `status` | Session status code |
| `pcfsystemfield252` | `studentCount` | Number of enrolled students |

### Error Handling

The API adapter includes comprehensive error handling:

- **Network Failures:** Automatic retry with exponential backoff
- **Rate Limiting:** Respect API limits with proper queuing
- **Authentication Errors:** Clear user feedback and re-login prompts
- **Validation Errors:** Field-level error messages in Hebrew
- **Timeout Handling:** Graceful degradation for slow connections

## 🛡️ Security

### Session Management

- **Secure Tokens:** JWT-like tokens with expiration
- **HttpOnly Cookies:** Prevent XSS attacks
- **Session Timeout:** Automatic logout after 30 minutes
- **CSRF Protection:** Token validation on sensitive operations

### Input Validation

- **Israeli ID Checksum:** Validates ID numbers using official algorithm
- **XSS Prevention:** All user inputs sanitized
- **SQL Injection Protection:** Parameterized queries
- **Rate Limiting:** Prevent brute force attacks

### Data Privacy

- **No Plain Text Storage:** Sensitive data encrypted
- **Minimal Data Collection:** Only necessary information stored
- **Secure Transmission:** HTTPS enforced in production
- **Data Retention:** Automatic cleanup of expired sessions

## 🌐 Internationalization

### Hebrew Support

- **Complete Hebrew UI** with professional terminology
- **RTL Layout Support** throughout the application
- **Hebrew Date Formatting** using `Intl.DateTimeFormat`
- **Number Formatting** with Hebrew numerals when appropriate
- **Error Messages** in clear, user-friendly Hebrew

### Font Loading

The system uses optimized Hebrew fonts:

```css
@import url('https://fonts.googleapis.com/css2?family=Assistant:wght@200;300;400;500;600;700;800&family=Heebo:wght@100;200;300;400;500;600;700;800;900&display=swap');
```

- **Assistant:** Modern Hebrew interface font
- **Heebo:** Fallback with broader character support
- **System Fonts:** Fallback to system Hebrew fonts

## 📱 Responsive Design

### Breakpoints

- **Mobile:** 375px - 768px (Primary mobile experience)
- **Tablet:** 768px - 1024px (Tablet and small laptops)
- **Desktop:** 1024px+ (Full desktop experience)

### Mobile Features

- **Touch-Optimized:** Larger touch targets for mobile
- **Swipe Gestures:** Natural mobile navigation
- **Responsive Tables:** Horizontal scrolling for data tables
- **Mobile-First CSS:** Optimized loading and performance

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run preview         # Preview production build

# Code Quality
npm run lint            # Run ESLint
npm run type-check      # TypeScript type checking

# Testing
npm run test            # Run all Playwright tests
npm run test:ui         # Interactive test runner
npm run test:debug      # Debug tests with DevTools

# Deployment
npm run deploy          # Deploy to production
```

### Development Mode Features

- **Hot Module Replacement:** Instant updates during development
- **Mock Data Toggle:** Easy switching between mock and real API
- **Debug Console:** Enhanced logging in development mode
- **React Query DevTools:** API state inspection
- **TypeScript Strict Mode:** Comprehensive type checking

## 📊 Performance

### Optimization Features

- **Code Splitting:** Lazy loading of components
- **React Query Caching:** Intelligent data caching
- **Image Optimization:** Responsive images with lazy loading
- **Bundle Analysis:** Webpack bundle analyzer integration
- **Service Worker:** Offline-first functionality (coming soon)

### Performance Metrics

- **First Contentful Paint:** < 1.5s
- **Largest Contentful Paint:** < 2.5s
- **Cumulative Layout Shift:** < 0.1
- **First Input Delay:** < 100ms
- **Time to Interactive:** < 3.5s

## 🚀 Deployment

### Production Build

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Test production build locally:**
   ```bash
   npm run preview
   ```

3. **Deploy to Vercel (recommended):**
   ```bash
   npm install -g vercel
   vercel --prod
   ```

### Environment Configuration

**Production Environment Variables:**
```bash
VITE_FIREBERRY_API_URL=https://api.fireberry.com/api
VITE_FIREBERRY_API_KEY=production_api_key
VITE_USE_MOCK_DATA=false
VITE_DEBUG_MODE=false
```

### Deployment Checklist

- [ ] Environment variables configured
- [ ] API key permissions verified
- [ ] HTTPS certificates in place
- [ ] Error monitoring configured
- [ ] Performance monitoring setup
- [ ] Backup and recovery plan
- [ ] Security headers configured

## 🐛 Troubleshooting

### Common Issues

**1. Login fails with valid credentials**
- Check API key configuration
- Verify Fireberry API connectivity
- Enable debug mode to inspect requests

**2. Hebrew text not rendering correctly**
- Ensure Hebrew fonts are loaded
- Check browser language settings
- Verify RTL CSS is applied

**3. Session timeout issues**
- Check system clock synchronization
- Verify JWT token format
- Review session configuration

**4. Mobile layout issues**
- Test on different devices
- Check viewport meta tag
- Verify responsive breakpoints

### Debug Mode

Enable debug mode for detailed logging:

```bash
# In .env.local
VITE_DEBUG_MODE=true
```

This enables:
- API request/response logging
- Component render tracking
- Performance metrics
- Error boundary details

## 🤝 Contributing

### Development Workflow

1. **Create feature branch:**
   ```bash
   git checkout -b feature/new-feature
   ```

2. **Make changes with tests:**
   ```bash
   # Make your changes
   npm run test        # Run tests
   npm run lint        # Check code style
   ```

3. **Submit pull request:**
   ```bash
   git push origin feature/new-feature
   # Create PR via GitHub/GitLab
   ```

### Code Standards

- **TypeScript:** Strict mode enabled
- **ESLint:** Airbnb configuration with custom rules
- **Prettier:** Automatic code formatting
- **Husky:** Pre-commit hooks for quality checks

## 📞 Support

### Getting Help

- **Documentation:** Check this README and inline code comments
- **Issues:** Create GitHub issues for bugs and feature requests
- **Testing:** Use the comprehensive test suite for validation

### Contact Information

- **Technical Lead:** Development Team
- **Project Manager:** Product Team
- **Security Issues:** security@fireberry.com

---

## 📄 License

This project is proprietary software developed for Fireberry educational platform.

© 2024 Fireberry Educational Systems. All rights reserved.

---

**Built with ❤️ using React, TypeScript, and modern web technologies for the Hebrew educational community.**