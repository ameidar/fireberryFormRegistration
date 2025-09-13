export interface Instructor {
  id: string;
  name: string;
  idNumber: string;
  email?: string;
  phone?: string;
  specialization?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface InstructorLoginForm {
  name: string;
  idNumber: string;
}

export interface InstructorSession {
  token: string;
  instructor: Instructor;
  expiresAt: string;
}

export interface AuthResponse {
  success: boolean;
  data?: InstructorSession;
  error?: string;
}