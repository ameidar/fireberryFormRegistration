import React from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { InstructorLogin } from '@/components/instructor/InstructorLogin';
import { InstructorSessionsPage } from '@/components/instructor/InstructorSessionsPage';
import { cn } from '@/utils/cn';

// Icons
import { Loader2, GraduationCap, Shield } from 'lucide-react';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Loading component
const LoadingSpinner: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50">
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <GraduationCap className="w-8 h-8 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
      </div>
      <p className="text-muted-foreground font-hebrew">טוען מערכת ניהול מדריכים...</p>
    </div>
  </div>
);

// Main App Content
const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {isAuthenticated ? (
        <InstructorSessionsPage />
      ) : (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md space-y-6">
            {/* Logo/Header */}
            <div className="text-center space-y-3">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center shadow-lg">
                <GraduationCap className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 font-hebrew">
                  מערכת ניהול מדריכים
                </h1>
                <p className="text-muted-foreground font-hebrew mt-2">
                  כלי לניהול קורסים ומשתתפים
                </p>
              </div>
            </div>

            {/* Login Form */}
            <InstructorLogin />

            {/* Footer */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
                <Shield className="w-3 h-3" />
                <span className="font-hebrew">מוגן על ידי אבטחת Fireberry</span>
              </div>
              <p className="text-xs text-muted-foreground font-hebrew">
                © 2023 מערכת ניהול מדריכים. כל הזכויות שמורות.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main App Component
const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="font-hebrew" dir="rtl">
        <AppContent />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              fontFamily: 'Assistant, Rubik, system-ui, sans-serif',
              direction: 'rtl',
            },
            success: {
              style: {
                background: '#10b981',
                color: 'white',
              },
            },
            error: {
              style: {
                background: '#ef4444',
                color: 'white',
              },
            },
          }}
        />
      </div>
    </QueryClientProvider>
  );
};

export default App;