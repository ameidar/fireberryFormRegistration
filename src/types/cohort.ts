export interface Cohort {
  id: string;
  name: string;
  description?: string;
  instructorId: string;
  instructorName: string;
  status: 'active' | 'inactive' | 'completed' | 'cancelled';
  startDate: string;
  endDate?: string;
  maxStudents?: number;
  currentStudents: number;
  location?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Student {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  idNumber?: string;
  status: 'registered' | 'active' | 'completed' | 'dropped' | 'pending';
  registrationDate: string;
  completionDate?: string;
  notes?: string;
}

export interface CohortDetails extends Cohort {
  students: Student[];
}

export interface CohortFilters {
  status?: 'all' | 'active' | 'inactive' | 'completed' | 'cancelled';
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type CohortSort = {
  field: keyof Cohort;
  direction: 'asc' | 'desc';
};