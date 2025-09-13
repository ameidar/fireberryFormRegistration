import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import Cookies from 'js-cookie';
import { Toaster, toast } from 'sonner';

import { InstructorLogin } from '@/components/instructor/InstructorLogin';
import type { Instructor } from '@/types/instructor';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

// Session management
const SESSION_COOKIE_NAME = 'instructor_session';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

interface SessionData {
  instructor: Instructor;
  token: string;
  expiresAt: number;
}

function App() {
  const [instructor, setInstructor] = useState<Instructor | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on app load
  useEffect(() => {
    const checkExistingSession = () => {
      try {
        const sessionCookie = Cookies.get(SESSION_COOKIE_NAME);
        if (sessionCookie) {
          const sessionData: SessionData = JSON.parse(sessionCookie);

          // Check if session is still valid
          if (sessionData.expiresAt > Date.now()) {
            setInstructor(sessionData.instructor);
            setIsAuthenticated(true);

            // Set up session expiration warning
            const timeUntilExpiry = sessionData.expiresAt - Date.now();
            if (timeUntilExpiry > 0) {
              setTimeout(() => {
                toast.warning('הפעלה תפוג בעוד 5 דקות. אנא שמור את עבודתך.');
              }, Math.max(0, timeUntilExpiry - 5 * 60 * 1000)); // 5 minutes before expiry
            }
          } else {
            // Session expired, clear it
            Cookies.remove(SESSION_COOKIE_NAME);
            toast.error('הפעלה פגה. אנא התחבר מחדש.');
          }
        }
      } catch (error) {
        console.error('Error checking existing session:', error);
        Cookies.remove(SESSION_COOKIE_NAME);
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingSession();
  }, []);

  const handleLoginSuccess = (instructorData: Instructor, token: string) => {
    const expiresAt = Date.now() + SESSION_TIMEOUT;
    const sessionData: SessionData = {
      instructor: instructorData,
      token,
      expiresAt
    };

    // Store session in secure cookie
    Cookies.set(SESSION_COOKIE_NAME, JSON.stringify(sessionData), {
      expires: new Date(expiresAt),
      secure: window.location.protocol === 'https:',
      sameSite: 'lax'
    });

    setInstructor(instructorData);
    setIsAuthenticated(true);

    toast.success(`ברוך הבא, ${instructorData.name}!`);

    // Set up session expiration warning
    setTimeout(() => {
      toast.warning('הפעלה תפוג בעוד 5 דקות. אנא שמור את עבודתך.');
    }, SESSION_TIMEOUT - 5 * 60 * 1000); // 5 minutes before expiry
  };

  const handleLoginError = (message: string) => {
    toast.error(message);
  };

  const handleLogout = () => {
    Cookies.remove(SESSION_COOKIE_NAME);
    setInstructor(null);
    setIsAuthenticated(false);
    toast.success('התנתקת בהצלחה');
  };

  // Show loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="App font-hebrew" dir="rtl">
        {!isAuthenticated ? (
          <InstructorLogin
            onLoginSuccess={handleLoginSuccess}
            onLoginError={handleLoginError}
          />
        ) : (
          <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-4">
                  <div className="flex items-center space-x-4 space-x-reverse">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                      {instructor?.name.charAt(0)}
                    </div>
                    <div>
                      <h1 className="text-xl font-semibold text-gray-900">
                        שלום, {instructor?.name}
                      </h1>
                      {instructor?.specialization && (
                        <p className="text-sm text-gray-500">
                          {instructor.specialization}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    התנתק
                  </button>
                </div>
              </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  ניהול מפגשים
                </h2>
                <p className="text-gray-600 mb-8">
                  ברוך הבא למערכת ניהול המפגשים שלך
                </p>

                {/* Development Status */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">
                    המערכת בפיתוח
                  </h3>
                  <p className="text-blue-700 mb-4">
                    רכיבי ניהול המפגשים יתווספו בשלב הבא
                  </p>

                  {instructor && (
                    <div className="bg-white rounded-md p-4 text-right">
                      <h4 className="font-medium text-gray-900 mb-2">פרטי המדריך:</h4>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p><strong>שם:</strong> {instructor.name}</p>
                        <p><strong>אימייל:</strong> {instructor.email}</p>
                        {instructor.phone && <p><strong>טלפון:</strong> {instructor.phone}</p>}
                        {instructor.specialization && <p><strong>התמחות:</strong> {instructor.specialization}</p>}
                        <p><strong>סטטוס:</strong> {instructor.status === 'active' ? 'פעיל' : 'לא פעיל'}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </main>
          </div>
        )}

        {/* Toast notifications */}
        <Toaster
          position="top-center"
          dir="rtl"
          toastOptions={{
            duration: 4000,
            style: {
              fontFamily: 'Assistant, Heebo, sans-serif',
            },
          }}
        />
      </div>

      {/* React Query DevTools */}
      {import.meta.env.VITE_DEBUG_MODE === 'true' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}

export default App;