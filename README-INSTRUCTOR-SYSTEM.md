# Instructor Login and Session Management System

A comprehensive React + TypeScript system for instructor authentication and course management, integrated with Fireberry API.

## Features

### 🔐 Authentication System
- **Instructor Login**: Secure login with name + Israeli ID validation
- **Session Management**: JWT-like token system with automatic expiry
- **Israeli ID Validation**: Built-in checksum validation for Israeli ID numbers
- **Session Persistence**: Secure cookie-based session storage

### 👨‍🏫 Instructor Dashboard
- **My Courses**: View and manage instructor's assigned courses
- **Course Details**: Detailed view of each course with student information
- **Search & Filter**: Advanced filtering by status and free-text search
- **Pagination**: Efficient handling of large course lists
- **Real-time Updates**: Automatic session refresh and data updates

### 📊 Course Management
- **Course Overview**: Status, dates, location, and student count
- **Student Lists**: Detailed student information and status tracking
- **Status Tracking**: Active, completed, cancelled, and inactive courses
- **Responsive Design**: Mobile-friendly interface with RTL Hebrew support

### 🛡️ Security Features
- **Rate Limiting**: API request throttling and circuit breaker pattern
- **Input Validation**: Comprehensive Zod schemas for all forms
- **XSS Protection**: Input sanitization and secure rendering
- **Session Security**: Secure cookie handling with expiry warnings

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: TailwindCSS + shadcn/ui components
- **State Management**: React Query for data fetching
- **Forms**: React Hook Form + Zod validation
- **Authentication**: Custom JWT-like implementation with cookies
- **API Integration**: Fireberry API with fallback mock data
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

## Project Structure

```
src/
├── components/
│   ├── ui/               # shadcn/ui base components
│   └── instructor/       # Instructor-specific components
│       ├── InstructorLogin.tsx
│       ├── InstructorSessionsPage.tsx
│       ├── CohortsTable.tsx
│       └── CohortDetailsDrawer.tsx
├── hooks/                # Custom React hooks
│   ├── useAuth.ts
│   ├── useInstructors.ts
│   └── useCohorts.ts
├── services/             # API and business logic
│   ├── fireberry-api.ts
│   └── auth.ts
├── types/                # TypeScript type definitions
│   ├── instructor.ts
│   ├── cohort.ts
│   └── api.ts
├── utils/                # Utility functions
│   ├── cn.ts
│   ├── date.ts
│   └── israeli-id.ts
├── lib/                  # Validation schemas
│   └── validations.ts
└── mocks/                # Mock data for development
    └── data.ts
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy the environment files and configure them:

```bash
cp .env.development .env.local
```

Edit `.env.local`:
```env
# Fireberry API Configuration
VITE_FIREBERRY_API_KEY=your_fireberry_api_key_here

# Development Mode (use mock data)
VITE_USE_MOCK_DATA=true

# Other settings...
```

### 3. Fireberry API Configuration

Update the field mappings in `src/services/fireberry-api.ts`:

```typescript
const FIREBERRY_FIELD_MAPPING = {
  instructors: {
    objecttype: 1, // Update with actual Fireberry object type
    fields: {
      name: 'pcfsystemfield1', // Update field names
      idNumber: 'pcfsystemfield2',
      // ... other fields
    }
  }
};
```

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

### 5. Build for Production

```bash
npm run build
npm run preview
```

## Usage Guide

### For Instructors

1. **Login Process**:
   - Select your name from the dropdown
   - Enter your Israeli ID number (8-9 digits)
   - System validates both credentials against Fireberry data

2. **Dashboard Navigation**:
   - View all your assigned courses
   - Filter by status (Active, Completed, etc.)
   - Search courses by name or description
   - Click any course to view detailed information

3. **Course Details**:
   - View course information (dates, location, capacity)
   - See complete student list with statuses
   - Track student progress and completion

### For Developers

1. **Mock Data Development**:
   - Set `VITE_USE_MOCK_DATA=true` in environment
   - Edit `src/mocks/data.ts` to add test data
   - All API calls will use mock data instead of Fireberry

2. **Adding New Features**:
   - Create new components in `src/components/instructor/`
   - Add API calls to `src/services/fireberry-api.ts`
   - Define types in `src/types/`
   - Add validation schemas in `src/lib/validations.ts`

3. **Customizing UI**:
   - Modify TailwindCSS classes for styling
   - Update shadcn/ui components in `src/components/ui/`
   - Customize Hebrew fonts in `src/index.css`

## API Integration

### Fireberry Integration

The system integrates with Fireberry API using these patterns:

```typescript
// Example API call
const response = await fetch('https://api.fireberry.com/api/query', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'tokenid': FIREBERRY_API_KEY,
  },
  body: JSON.stringify({
    objecttype: 1,
    fields: "name,email,status",
    query: "status = 1"
  })
});
```

### Rate Limiting

Built-in rate limiting prevents API abuse:
- 50 requests per minute by default
- Circuit breaker pattern for API failures
- Automatic retry with exponential backoff

### Error Handling

Comprehensive error handling includes:
- Network failure recovery
- API rate limit handling
- User-friendly error messages in Hebrew
- Fallback to mock data in development

## Security Considerations

### Authentication
- No passwords stored - validation via name + ID cross-check
- Session tokens with automatic expiry
- Secure cookie configuration in production

### Data Protection
- Israeli ID number validation with checksum
- Input sanitization for XSS prevention
- Rate limiting for API protection
- Secure headers in production

### GDPR/Privacy
- Minimal data storage (sessions only)
- No persistent user data
- Secure session cleanup on logout

## Deployment

### Production Environment

1. **Environment Variables**:
```env
VITE_FIREBERRY_API_KEY=production_api_key
VITE_USE_MOCK_DATA=false
VITE_NODE_ENV=production
```

2. **Build and Deploy**:
```bash
npm run build
# Deploy dist/ folder to your hosting provider
```

3. **Security Headers**:
Configure your web server with appropriate security headers (CSP, HSTS, etc.)

## Troubleshooting

### Common Issues

1. **API Connection Failed**:
   - Check Fireberry API key in environment variables
   - Verify CORS settings
   - Enable mock data for development testing

2. **Login Issues**:
   - Verify instructor exists in Fireberry system
   - Check Israeli ID number format and validation
   - Ensure instructor status is 'active'

3. **Performance Issues**:
   - Enable React Query devtools
   - Check network requests in browser console
   - Verify rate limiting settings

### Debug Mode

Enable debug logging:
```env
VITE_DEBUG_MODE=true
VITE_LOG_LEVEL=debug
```

## Contributing

1. Follow TypeScript best practices
2. Use React hooks patterns
3. Maintain Hebrew RTL support
4. Add tests for new components
5. Update this documentation

## License

MIT License - see LICENSE file for details.

## Support

For technical support or questions about Fireberry integration, contact the development team.