// Zod validation schemas for forms and API responses

import { z } from 'zod';
import { validateIsraeliId, validateEmail, validateInstructorName } from '@/utils/validation';

// Login form validation
export const loginFormSchema = z.object({
  instructorName: z
    .string()
    .min(2, 'שם המדריך חייב להכיל לפחות 2 תווים')
    .max(50, 'שם המדריך לא יכול להכיל יותר מ-50 תווים')
    .refine(validateInstructorName, 'שם המדריך לא תקין'),

  idNumber: z
    .string()
    .min(8, 'מספר זהות חייב להכיל לפחות 8 ספרות')
    .max(9, 'מספר זהות לא יכול להכיל יותר מ-9 ספרות')
    .regex(/^\d+$/, 'מספר זהות חייב להכיל ספרות בלבד')
    .refine(validateIsraeliId, 'מספר זהות לא תקין')
});

export type LoginFormData = z.infer<typeof loginFormSchema>;

// Session filters validation
export const sessionFiltersSchema = z.object({
  status: z.enum(['all', 'active', 'inactive', 'completed']).default('all'),
  search: z.string().max(100, 'חיפוש לא יכול להכיל יותר מ-100 תווים').default(''),
  page: z.number().min(1, 'מספר עמוד חייב להיות לפחות 1').default(1),
  limit: z.number().min(10).max(100, 'מקסימום 100 פריטים בעמוד').default(20)
});

export type SessionFiltersData = z.infer<typeof sessionFiltersSchema>;

// Instructor data validation
export const instructorSchema = z.object({
  id: z.string().min(1, 'מזהה המדריך נדרש'),
  name: z.string().min(2, 'שם המדריך נדרש').refine(validateInstructorName, 'שם המדריך לא תקין'),
  email: z.string().email('כתובת אימייל לא תקינה').refine(validateEmail, 'כתובת אימייל לא תקינה'),
  phone: z.string().optional(),
  idNumber: z.string().refine(validateIsraeliId, 'מספר זהות לא תקין'),
  specialization: z.string().optional(),
  certification: z.string().optional(),
  level: z.string().optional(),
  status: z.enum(['active', 'inactive']),
  createdOn: z.string(),
  modifiedOn: z.string()
});

export type InstructorData = z.infer<typeof instructorSchema>;

// Session data validation
export const sessionSchema = z.object({
  id: z.string().min(1, 'מזהה המפגש נדרש'),
  name: z.string().min(2, 'שם המפגש נדרש').max(100, 'שם המפגש לא יכול להכיל יותר מ-100 תווים'),
  description: z.string().max(500, 'תיאור המפגש לא יכול להכיל יותר מ-500 תווים').optional(),
  status: z.enum(['active', 'inactive', 'completed', 'cancelled']),
  instructorId: z.string().min(1, 'מזהה המדריך נדרש'),
  instructorName: z.string().min(1, 'שם המדריך נדרש'),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'תאריך התחלה לא תקין'),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'תאריך סיום לא תקין'),
  studentCount: z.number().min(0, 'מספר התלמידים לא יכול להיות שלילי'),
  maxCapacity: z.number().min(1, 'קיבולת מקסימלית חייבת להיות לפחות 1').optional(),
  location: z.string().max(100, 'מיקום לא יכול להכיל יותר מ-100 תווים').optional(),
  notes: z.string().max(1000, 'הערות לא יכולות להכיל יותר מ-1000 תווים').optional(),
  createdOn: z.string(),
  modifiedOn: z.string()
}).refine((data) => {
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  return startDate <= endDate;
}, {
  message: 'תאריך התחלה חייב להיות לפני תאריך הסיום',
  path: ['endDate']
});

export type SessionData = z.infer<typeof sessionSchema>;

// Student data validation
export const studentSchema = z.object({
  id: z.string().min(1, 'מזהה התלמיד נדרש'),
  name: z.string().min(2, 'שם התלמיד נדרש').max(50, 'שם התלמיד לא יכול להכיל יותר מ-50 תווים'),
  email: z.string().email('כתובת אימייל לא תקינה').optional(),
  phone: z.string().optional(),
  status: z.enum(['registered', 'active', 'completed', 'dropped', 'pending']),
  registrationDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'תאריך רישום לא תקין'),
  completionDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'תאריך סיום לא תקין').optional(),
  notes: z.string().max(500, 'הערות לא יכולות להכיל יותר מ-500 תווים').optional()
});

export type StudentData = z.infer<typeof studentSchema>;

// API response validations
export const loginResponseSchema = z.object({
  success: z.boolean(),
  instructor: instructorSchema.optional(),
  token: z.string().optional(),
  expiresAt: z.string().optional(),
  message: z.string().optional()
});

export type LoginResponseData = z.infer<typeof loginResponseSchema>;

export const sessionsResponseSchema = z.object({
  sessions: z.array(sessionSchema),
  totalCount: z.number().min(0),
  totalPages: z.number().min(1),
  currentPage: z.number().min(1),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean()
});

export type SessionsResponseData = z.infer<typeof sessionsResponseSchema>;

export const sessionDetailsResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    session: sessionSchema,
    students: z.array(studentSchema),
    totalStudents: z.number().min(0),
    activeStudents: z.number().min(0),
    completedStudents: z.number().min(0),
    droppedStudents: z.number().min(0)
  }).optional(),
  message: z.string().optional()
});

export type SessionDetailsResponseData = z.infer<typeof sessionDetailsResponseSchema>;

// Fireberry API response validation
export const fireberryInstructorSchema = z.object({
  instructorid: z.string(),
  name: z.string(),
  emailaddress1: z.string(),
  telephone1: z.string().optional(),
  pcfsystemfield247: z.string(), // ID number
  pcfsystemfield248: z.string().optional(), // Certification
  pcfsystemfield249: z.string().optional(), // Specialization
  pcfsystemfield250: z.string().optional(), // Level
  statuscode: z.number(),
  createdon: z.string(),
  modifiedon: z.string()
});

export type FireberryInstructorData = z.infer<typeof fireberryInstructorSchema>;

export const fireberrySessionSchema = z.object({
  customobject1000id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  pcfsystemfield37: z.number(), // Status code
  pcfsystemfield549: z.string().optional(), // Additional status info
  startdate: z.string().optional(),
  enddate: z.string().optional(),
  pcfsystemfield251: z.string().optional(), // Instructor ID reference
  pcfsystemfield252: z.number().optional(), // Student count
  pcfsystemfield253: z.number().optional(), // Max capacity
  pcfsystemfield254: z.string().optional(), // Location
  pcfsystemfield255: z.string().optional(), // Notes
  createdon: z.string(),
  modifiedon: z.string()
});

export type FireberrySessionData = z.infer<typeof fireberrySessionSchema>;

// Environment variables validation
export const envSchema = z.object({
  VITE_FIREBERRY_API_URL: z.string().url('Fireberry API URL must be a valid URL'),
  VITE_FIREBERRY_API_KEY: z.string().min(10, 'Fireberry API key is required'),
  VITE_USE_MOCK_DATA: z.enum(['true', 'false']).default('false'),
  VITE_DEBUG_MODE: z.enum(['true', 'false']).default('false'),
  VITE_SESSION_TIMEOUT: z.string().regex(/^\d+$/, 'Session timeout must be a number').default('1800000'),
  VITE_SESSION_WARNING_TIME: z.string().regex(/^\d+$/, 'Session warning time must be a number').default('300000'),
  VITE_API_TIMEOUT: z.string().regex(/^\d+$/, 'API timeout must be a number').default('10000'),
  VITE_API_RETRY_ATTEMPTS: z.string().regex(/^\d+$/, 'API retry attempts must be a number').default('3')
});

export type EnvData = z.infer<typeof envSchema>;

// Validation helper functions
export const validateEnv = () => {
  try {
    return envSchema.parse(import.meta.env);
  } catch (error) {
    console.error('Environment validation failed:', error);
    throw new Error('Invalid environment configuration');
  }
};

// Form validation helpers
export const getFieldError = (errors: any, fieldName: string): string | undefined => {
  return errors[fieldName]?.message;
};

export const hasFieldError = (errors: any, fieldName: string): boolean => {
  return !!errors[fieldName];
};