/**
 * Instructor types for testing
 */
export interface Instructor {
  id: string;
  name: string;
  idNumber: string;
  email?: string;
  phone?: string;
  specialization?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  success: boolean;
  instructor?: Instructor | null;
  token?: string | null;
  message?: string;
}

export interface LoginFormData {
  instructorName: string;
  idNumber: string;
}

export interface SessionData {
  instructor: Instructor;
  token: string;
  expiresAt?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface TokenValidationResponse {
  valid: boolean;
  instructor?: Instructor;
  error?: string;
  requiresLogin?: boolean;
}

export interface RefreshTokenResponse {
  success: boolean;
  token?: string;
  error?: string;
}

export interface SessionStatusResponse {
  status: 'active' | 'expiring' | 'expired';
  expiresIn?: number;
  warningThreshold?: number;
}

export interface LogoutResponse {
  success: boolean;
  message?: string;
}