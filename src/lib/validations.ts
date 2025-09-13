import { z } from 'zod';

// Israeli ID number validation with checksum
const validateIsraeliId = (id: string): boolean => {
  if (!/^\d{8,9}$/.test(id)) return false;

  // Pad to 9 digits
  const paddedId = id.padStart(9, '0');

  let sum = 0;
  for (let i = 0; i < 8; i++) {
    const digit = parseInt(paddedId[i]);
    const multiplied = digit * ((i % 2) + 1);
    sum += multiplied > 9 ? Math.floor(multiplied / 10) + (multiplied % 10) : multiplied;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(paddedId[8]);
};

// Login form validation
export const instructorLoginSchema = z.object({
  name: z.string()
    .min(2, 'שם המדריך חייב להכיל לפחות 2 תווים')
    .max(100, 'שם המדריך לא יכול להכיל יותר מ-100 תווים')
    .regex(/^[\u0590-\u05FF\s\w.-]+$/, 'שם המדריך מכיל תווים לא חוקיים'),

  idNumber: z.string()
    .min(8, 'מספר זהות חייב להכיל לפחות 8 ספרות')
    .max(9, 'מספר זהות לא יכול להכיל יותר מ-9 ספרות')
    .regex(/^\d+$/, 'מספר זהות חייב להכיל ספרות בלבד')
    .refine(validateIsraeliId, 'מספר זהות לא תקין'),
});

// Instructor schema
export const instructorSchema = z.object({
  id: z.string(),
  name: z.string(),
  idNumber: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  specialization: z.string().optional(),
  status: z.enum(['active', 'inactive']),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Cohort schema
export const cohortSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  instructorId: z.string(),
  instructorName: z.string(),
  status: z.enum(['active', 'inactive', 'completed', 'cancelled']),
  startDate: z.string(),
  endDate: z.string().optional(),
  maxStudents: z.number().optional(),
  currentStudents: z.number(),
  location: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Student schema
export const studentSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  idNumber: z.string().optional(),
  status: z.enum(['registered', 'active', 'completed', 'dropped', 'pending']),
  registrationDate: z.string(),
  completionDate: z.string().optional(),
  notes: z.string().optional(),
});

// Cohort details schema
export const cohortDetailsSchema = cohortSchema.extend({
  students: z.array(studentSchema),
});

// Filter schemas
export const cohortFiltersSchema = z.object({
  status: z.enum(['all', 'active', 'inactive', 'completed', 'cancelled']).optional(),
  search: z.string().optional(),
});

// API response schemas
export const apiErrorSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  status: z.number().optional(),
});

export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: apiErrorSchema.optional(),
  });

export const paginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number(),
  });

// Type exports
export type InstructorLoginForm = z.infer<typeof instructorLoginSchema>;
export type InstructorType = z.infer<typeof instructorSchema>;
export type CohortType = z.infer<typeof cohortSchema>;
export type StudentType = z.infer<typeof studentSchema>;
export type CohortDetailsType = z.infer<typeof cohortDetailsSchema>;
export type CohortFiltersType = z.infer<typeof cohortFiltersSchema>;