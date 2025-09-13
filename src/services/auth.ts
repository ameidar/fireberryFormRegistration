import Cookies from 'js-cookie';
import type { Instructor, InstructorSession, AuthResponse } from '@/types';
import { fireberryApiService } from './fireberry-api';

const SESSION_COOKIE_NAME = 'instructor_session';
const SESSION_EXPIRY_HOURS = 8;

// Simple JWT-like token generation for demo purposes
// In production, this should be handled by the backend
function generateSessionToken(instructor: Instructor): string {
  const payload = {
    id: instructor.id,
    name: instructor.name,
    exp: Date.now() + (SESSION_EXPIRY_HOURS * 60 * 60 * 1000),
  };

  // Simple base64 encoding for demo - use proper JWT library in production
  return btoa(JSON.stringify(payload));
}

function parseSessionToken(token: string): { id: string; name: string; exp: number } | null {
  try {
    const payload = JSON.parse(atob(token));
    if (payload.exp && payload.exp > Date.now()) {
      return payload;
    }
    return null;
  } catch {
    return null;
  }
}

export const authService = {
  // Login instructor
  async login(name: string, idNumber: string): Promise<AuthResponse> {
    try {
      const response = await fireberryApiService.loginInstructor(name, idNumber);

      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error?.message || 'Login failed',
        };
      }

      const instructor = response.data;
      const token = generateSessionToken(instructor);
      const expiresAt = new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

      const session: InstructorSession = {
        token,
        instructor,
        expiresAt,
      };

      // Store session in secure cookie
      Cookies.set(SESSION_COOKIE_NAME, JSON.stringify(session), {
        expires: SESSION_EXPIRY_HOURS / 24, // Convert hours to days
        secure: window.location.protocol === 'https:',
        sameSite: 'strict',
        path: '/',
      });

      return {
        success: true,
        data: session,
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      };
    }
  },

  // Get current session
  getCurrentSession(): InstructorSession | null {
    try {
      const sessionData = Cookies.get(SESSION_COOKIE_NAME);
      if (!sessionData) return null;

      const session: InstructorSession = JSON.parse(sessionData);

      // Validate token
      const tokenData = parseSessionToken(session.token);
      if (!tokenData) {
        this.logout(); // Clear invalid session
        return null;
      }

      // Check if session is expired
      if (new Date(session.expiresAt) <= new Date()) {
        this.logout(); // Clear expired session
        return null;
      }

      return session;
    } catch (error) {
      console.error('Error getting current session:', error);
      this.logout(); // Clear corrupted session
      return null;
    }
  },

  // Get current instructor
  getCurrentInstructor(): Instructor | null {
    const session = this.getCurrentSession();
    return session?.instructor || null;
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.getCurrentSession() !== null;
  },

  // Logout
  logout(): void {
    Cookies.remove(SESSION_COOKIE_NAME, { path: '/' });
  },

  // Refresh session (extend expiry)
  refreshSession(): boolean {
    const session = this.getCurrentSession();
    if (!session) return false;

    try {
      const newExpiresAt = new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();
      const newToken = generateSessionToken(session.instructor);

      const refreshedSession: InstructorSession = {
        ...session,
        token: newToken,
        expiresAt: newExpiresAt,
      };

      Cookies.set(SESSION_COOKIE_NAME, JSON.stringify(refreshedSession), {
        expires: SESSION_EXPIRY_HOURS / 24,
        secure: window.location.protocol === 'https:',
        sameSite: 'strict',
        path: '/',
      });

      return true;
    } catch (error) {
      console.error('Error refreshing session:', error);
      return false;
    }
  },

  // Get session expiry info
  getSessionExpiryInfo(): { expiresAt: string; timeRemaining: number } | null {
    const session = this.getCurrentSession();
    if (!session) return null;

    const expiresAt = session.expiresAt;
    const timeRemaining = new Date(expiresAt).getTime() - Date.now();

    return {
      expiresAt,
      timeRemaining: Math.max(0, timeRemaining),
    };
  },

  // Check if session is about to expire (within 30 minutes)
  isSessionAboutToExpire(): boolean {
    const expiryInfo = this.getSessionExpiryInfo();
    if (!expiryInfo) return false;

    const thirtyMinutesInMs = 30 * 60 * 1000;
    return expiryInfo.timeRemaining <= thirtyMinutesInMs;
  },
};