import type { Instructor, Cohort, Student, CohortDetails } from '@/types';

export const mockInstructors: Instructor[] = [
  {
    id: '1',
    name: 'דנה כהן',
    idNumber: '123456789',
    email: 'dana.cohen@example.com',
    phone: '050-1234567',
    specialization: 'מדעי המחשב',
    status: 'active',
    createdAt: '2023-01-15T10:00:00Z',
    updatedAt: '2023-01-15T10:00:00Z',
  },
  {
    id: '2',
    name: 'יוסי לוי',
    idNumber: '987654321',
    email: 'yossi.levi@example.com',
    phone: '052-9876543',
    specialization: 'חשבונאות',
    status: 'active',
    createdAt: '2023-02-01T09:00:00Z',
    updatedAt: '2023-02-01T09:00:00Z',
  },
  {
    id: '3',
    name: 'מרים שמעון',
    idNumber: '456789123',
    email: 'miriam.shimon@example.com',
    phone: '054-4567891',
    specialization: 'עיצוב גרפי',
    status: 'active',
    createdAt: '2023-03-10T11:30:00Z',
    updatedAt: '2023-03-10T11:30:00Z',
  },
  {
    id: '4',
    name: 'אבי דוד',
    idNumber: '789123456',
    email: 'avi.david@example.com',
    phone: '053-7891234',
    specialization: 'ניהול פרויקטים',
    status: 'inactive',
    createdAt: '2023-04-05T14:15:00Z',
    updatedAt: '2023-04-05T14:15:00Z',
  },
];

export const mockCohorts: Cohort[] = [
  {
    id: '101',
    name: 'קורס פיתוח אתרים מתקדם',
    description: 'קורס מקיף לפיתוח אתרים עם React ו-Node.js',
    instructorId: '1',
    instructorName: 'דנה כהן',
    status: 'active',
    startDate: '2023-09-01T09:00:00Z',
    endDate: '2023-12-15T17:00:00Z',
    maxStudents: 25,
    currentStudents: 18,
    location: 'אולם מחשבים א',
    notes: 'קורס פופולרי עם רשימת המתנה',
    createdAt: '2023-07-15T10:00:00Z',
    updatedAt: '2023-08-20T15:30:00Z',
  },
  {
    id: '102',
    name: 'יסודות החשבונאות',
    description: 'קורס בסיסי בחשבונאות לעסקים קטנים',
    instructorId: '2',
    instructorName: 'יוסי לוי',
    status: 'active',
    startDate: '2023-10-01T18:00:00Z',
    endDate: '2024-01-31T20:00:00Z',
    maxStudents: 20,
    currentStudents: 12,
    location: 'כיתה 205',
    notes: 'קורס ערב',
    createdAt: '2023-08-01T09:00:00Z',
    updatedAt: '2023-09-05T12:00:00Z',
  },
  {
    id: '103',
    name: 'עיצוב גרפי דיגיטלי',
    description: 'למידת כלי עיצוב מקצועיים - Photoshop, Illustrator',
    instructorId: '3',
    instructorName: 'מרים שמעון',
    status: 'completed',
    startDate: '2023-06-01T09:00:00Z',
    endDate: '2023-08-31T16:00:00Z',
    maxStudents: 15,
    currentStudents: 14,
    location: 'מעבדת עיצוב',
    notes: 'קורס הסתיים בהצלחה',
    createdAt: '2023-04-15T11:00:00Z',
    updatedAt: '2023-09-01T10:00:00Z',
  },
  {
    id: '104',
    name: 'ניהול פרויקטים Agile',
    description: 'מתודולוגיות ניהול פרויקטים מתקדמות',
    instructorId: '4',
    instructorName: 'אבי דוד',
    status: 'inactive',
    startDate: '2023-11-01T09:00:00Z',
    endDate: '2024-02-29T17:00:00Z',
    maxStudents: 30,
    currentStudents: 5,
    location: 'אולם הרצאות ב',
    notes: 'קורס מוקפא זמנית',
    createdAt: '2023-08-15T14:00:00Z',
    updatedAt: '2023-10-01T09:00:00Z',
  },
  {
    id: '105',
    name: 'מבוא למדע הנתונים',
    description: 'Python, pandas, matplotlib לניתוח נתונים',
    instructorId: '1',
    instructorName: 'דנה כהן',
    status: 'active',
    startDate: '2023-10-15T10:00:00Z',
    endDate: '2024-01-15T16:00:00Z',
    maxStudents: 20,
    currentStudents: 16,
    location: 'מעבדת מחשבים ב',
    notes: 'דורש ידע בסיסי בתכנות',
    createdAt: '2023-08-30T10:00:00Z',
    updatedAt: '2023-09-15T14:30:00Z',
  },
];

export const mockStudents: Student[] = [
  {
    id: 's1',
    name: 'רחל אברהם',
    email: 'rachel.a@example.com',
    phone: '050-1111111',
    idNumber: '111222333',
    status: 'active',
    registrationDate: '2023-08-15T10:00:00Z',
    notes: 'סטודנטית מצטיינת',
  },
  {
    id: 's2',
    name: 'משה יעקב',
    email: 'moshe.y@example.com',
    phone: '052-2222222',
    idNumber: '222333444',
    status: 'active',
    registrationDate: '2023-08-16T11:00:00Z',
  },
  {
    id: 's3',
    name: 'שרה לוי',
    email: 'sarah.l@example.com',
    phone: '054-3333333',
    idNumber: '333444555',
    status: 'completed',
    registrationDate: '2023-08-17T09:30:00Z',
    completionDate: '2023-08-31T16:00:00Z',
    notes: 'סיימה בציון מעולה',
  },
  {
    id: 's4',
    name: 'דוד כהן',
    email: 'david.k@example.com',
    phone: '053-4444444',
    idNumber: '444555666',
    status: 'dropped',
    registrationDate: '2023-08-18T14:00:00Z',
    notes: 'עזב בשל סיבות אישיות',
  },
  {
    id: 's5',
    name: 'לאה רוזן',
    email: 'lea.r@example.com',
    phone: '050-5555555',
    idNumber: '555666777',
    status: 'pending',
    registrationDate: '2023-08-20T16:30:00Z',
    notes: 'בהמתנה לאישור',
  },
];

export const mockCohortDetails: CohortDetails[] = [
  {
    ...mockCohorts[0],
    students: mockStudents.slice(0, 3),
  },
  {
    ...mockCohorts[1],
    students: mockStudents.slice(1, 4),
  },
  {
    ...mockCohorts[2],
    students: mockStudents.slice(2, 5),
  },
  {
    ...mockCohorts[3],
    students: mockStudents.slice(0, 2),
  },
  {
    ...mockCohorts[4],
    students: mockStudents.slice(1, 5),
  },
];

// Utility function to find instructor by name and ID
export const findInstructorByCredentials = (name: string, idNumber: string): Instructor | null => {
  return mockInstructors.find(
    instructor =>
      instructor.name === name &&
      instructor.idNumber === idNumber &&
      instructor.status === 'active'
  ) || null;
};

// Utility function to get cohorts by instructor ID
export const getCohortsByInstructorId = (instructorId: string): Cohort[] => {
  return mockCohorts.filter(cohort => cohort.instructorId === instructorId);
};

// Utility function to get cohort details
export const getCohortDetails = (cohortId: string): CohortDetails | null => {
  return mockCohortDetails.find(cohort => cohort.id === cohortId) || null;
};