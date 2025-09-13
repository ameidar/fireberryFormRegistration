// TypeScript interfaces for the instructor system

export interface Instructor {
  id: string;
  name: string;
  email: string;
  phone?: string;
  idNumber: string;
  specialization?: string;
  certification?: string;
  level?: string;
  status: 'active' | 'inactive';
  createdOn: string;
  modifiedOn: string;
}

export interface InstructorSession {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'completed' | 'cancelled';
  instructorId: string;
  instructorName: string;
  startDate: string;
  endDate: string;
  studentCount: number;
  maxCapacity?: number;
  location?: string;
  notes?: string;
  createdOn: string;
  modifiedOn: string;
}

export interface Student {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status: 'registered' | 'active' | 'completed' | 'dropped' | 'pending';
  registrationDate: string;
  completionDate?: string;
  grades?: StudentGrade[];
  notes?: string;
}

export interface StudentGrade {
  id: string;
  studentId: string;
  sessionId: string;
  assignment: string;
  grade: number;
  maxGrade: number;
  gradedDate: string;
  feedback?: string;
}

export interface SessionDetails {
  session: InstructorSession;
  students: Student[];
  totalStudents: number;
  activeStudents: number;
  completedStudents: number;
  droppedStudents: number;
}

// Form interfaces
export interface LoginForm {
  instructorName: string;
  idNumber: string;
}

export interface SessionFilters {
  status: 'all' | 'active' | 'inactive' | 'completed';
  search: string;
  page: number;
  limit: number;
}

// API Response interfaces
export interface LoginResponse {
  success: boolean;
  instructor?: Instructor;
  token?: string;
  expiresAt?: string;
  message?: string;
}

export interface SessionsResponse {
  sessions: InstructorSession[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface SessionDetailsResponse {
  success: boolean;
  data?: SessionDetails;
  message?: string;
}

// Fireberry API interfaces
export interface FireberryInstructor {
  instructorid: string;
  name: string;
  emailaddress1: string;
  telephone1?: string;
  pcfsystemfield247: string; // ID number
  pcfsystemfield248?: string; // Certification
  pcfsystemfield249?: string; // Specialization
  pcfsystemfield250?: string; // Level
  statuscode: number; // 1 = active, 0 = inactive
  createdon: string;
  modifiedon: string;
}

export interface FireberrySession {
  customobject1000id: string;
  name: string;
  description?: string;
  pcfsystemfield37: number; // Status code
  pcfsystemfield549?: string; // Additional status info
  startdate?: string;
  enddate?: string;
  pcfsystemfield251?: string; // Instructor ID reference
  pcfsystemfield252?: number; // Student count
  pcfsystemfield253?: number; // Max capacity
  pcfsystemfield254?: string; // Location
  pcfsystemfield255?: string; // Notes
  createdon: string;
  modifiedon: string;
}

// Authentication context interface
export interface AuthContextType {
  instructor: Instructor | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (instructorName: string, idNumber: string) => Promise<LoginResponse>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
}

// Error interfaces
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}