import { useState, useEffect, useCallback } from 'react';
import { authService } from '@/services/auth';
import type { Instructor, InstructorSession } from '@/types';
import toast from 'react-hot-toast';

export const useAuth = () => {
  const [session, setSession] = useState<InstructorSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    const currentSession = authService.getCurrentSession();
    setSession(currentSession);
    setIsLoading(false);

    // Set up session expiry warning
    if (currentSession) {
      const checkExpiry = () => {
        if (authService.isSessionAboutToExpire()) {
          toast.error('ההתחברות שלך עומדת להסתיים בעוד 30 דקות', {
            duration: 10000,
            id: 'session-expiry-warning',
          });
        }
      };

      const intervalId = setInterval(checkExpiry, 5 * 60 * 1000); // Check every 5 minutes
      return () => clearInterval(intervalId);
    }
  }, []);

  const login = useCallback(async (name: string, idNumber: string) => {
    setIsLoading(true);
    try {
      const response = await authService.login(name, idNumber);

      if (response.success && response.data) {
        setSession(response.data);
        toast.success(`ברוכ/ה הבא/ה ${response.data.instructor.name}!`);
        return { success: true };
      } else {
        toast.error(response.error || 'שגיאה בהתחברות');
        return { success: false, error: response.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'שגיאה בהתחברות';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setSession(null);
    toast.success('התנתקת בהצלחה');
  }, []);

  const refreshSession = useCallback(() => {
    const success = authService.refreshSession();
    if (success) {
      const newSession = authService.getCurrentSession();
      setSession(newSession);
      toast.success('ההתחברות הוארכה');
      return true;
    } else {
      logout();
      toast.error('שגיאה בהארכת ההתחברות. אנא התחבר/י מחדש');
      return false;
    }
  }, [logout]);

  return {
    session,
    instructor: session?.instructor || null,
    isAuthenticated: !!session,
    isLoading,
    login,
    logout,
    refreshSession,
    isSessionAboutToExpire: session ? authService.isSessionAboutToExpire() : false,
    sessionExpiryInfo: session ? authService.getSessionExpiryInfo() : null,
  };
};