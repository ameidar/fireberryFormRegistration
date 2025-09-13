import type {
  ApiResponse,
  FireberryQueryParams,
  FireberryResponse,
  Instructor,
  Cohort,
  CohortDetails,
  PaginatedResponse,
  CohortFilters,
  CohortSort
} from '@/types';

// Environment configuration
const API_BASE_URL = 'https://api.fireberry.com/api';
const API_KEY = import.meta.env.VITE_FIREBERRY_API_KEY;
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

// Import mock data for fallback
import {
  mockInstructors,
  mockCohorts,
  findInstructorByCredentials,
  getCohortsByInstructorId,
  getCohortDetails as getMockCohortDetails
} from '@/mocks/data';

// Rate limiting and circuit breaker implementation
class RateLimiter {
  private requests: Map<string, { count: number; windowStart: number }> = new Map();
  private readonly windowMs = 60000; // 1 minute window
  private readonly maxRequests = 50; // Max requests per window

  canMakeRequest(key: string = 'default'): boolean {
    const now = Date.now();
    const record = this.requests.get(key);

    if (!record || now - record.windowStart > this.windowMs) {
      this.requests.set(key, { count: 1, windowStart: now });
      return true;
    }

    if (record.count >= this.maxRequests) {
      return false;
    }

    record.count++;
    return true;
  }

  getRemainingRequests(key: string = 'default'): number {
    const record = this.requests.get(key);
    if (!record || Date.now() - record.windowStart > this.windowMs) {
      return this.maxRequests;
    }
    return Math.max(0, this.maxRequests - record.count);
  }
}

class CircuitBreaker {
  private failures = 0;
  private readonly failureThreshold = 5;
  private readonly recoveryTimeout = 30000; // 30 seconds
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
}

// Global instances
const rateLimiter = new RateLimiter();
const circuitBreaker = new CircuitBreaker();

// API Error class
class FireberryApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'FireberryApiError';
  }
}

// Generic API request function with retry logic
async function makeApiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  retries = 3
): Promise<T> {
  if (!rateLimiter.canMakeRequest()) {
    throw new FireberryApiError('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED');
  }

  return circuitBreaker.execute(async () => {
    for (let i = 0; i <= retries; i++) {
      try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            'tokenid': API_KEY || '',
            'accept': 'application/json',
            ...options.headers,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new FireberryApiError(
            `API request failed: ${response.statusText}`,
            response.status,
            response.status.toString()
          );
        }

        const data = await response.json();
        return data;
      } catch (error) {
        if (i === retries) {
          throw error;
        }
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
    throw new FireberryApiError('Max retries exceeded');
  });
}

// Fireberry field mapping
const FIREBERRY_FIELD_MAPPING = {
  // Instructor fields (adjust based on actual Fireberry schema)
  instructors: {
    objecttype: 1, // Adjust based on Fireberry schema
    fields: {
      id: 'id',
      name: 'pcfsystemfield1', // Adjust field names
      idNumber: 'pcfsystemfield2',
      email: 'pcfsystemfield3',
      phone: 'pcfsystemfield4',
      specialization: 'pcfsystemfield5',
      status: 'statuscode',
    }
  },
  // Cohort fields (adjust based on actual Fireberry schema)
  cohorts: {
    objecttype: 2, // Adjust based on Fireberry schema
    fields: {
      id: 'id',
      name: 'pcfsystemfield1',
      description: 'pcfsystemfield2',
      instructorId: 'pcfsystemfield3',
      instructorName: 'pcfsystemfield4',
      status: 'statuscode',
      startDate: 'pcfsystemfield5',
      endDate: 'pcfsystemfield6',
      maxStudents: 'pcfsystemfield7',
      currentStudents: 'pcfsystemfield8',
      location: 'pcfsystemfield9',
      notes: 'pcfsystemfield10',
    }
  }
};

// Data transformation utilities
function transformFireberryInstructor(fbData: any): Instructor {
  const mapping = FIREBERRY_FIELD_MAPPING.instructors.fields;
  return {
    id: fbData[mapping.id]?.toString() || '',
    name: fbData[mapping.name] || '',
    idNumber: fbData[mapping.idNumber] || '',
    email: fbData[mapping.email] || undefined,
    phone: fbData[mapping.phone] || undefined,
    specialization: fbData[mapping.specialization] || undefined,
    status: fbData[mapping.status] === 1 ? 'active' : 'inactive',
    createdAt: fbData.createdon || new Date().toISOString(),
    updatedAt: fbData.modifiedon || new Date().toISOString(),
  };
}

function transformFireberryCohort(fbData: any): Cohort {
  const mapping = FIREBERRY_FIELD_MAPPING.cohorts.fields;

  // Map status codes to readable statuses
  const statusMap: Record<number, Cohort['status']> = {
    1: 'active',
    2: 'inactive',
    3: 'completed',
    4: 'cancelled',
  };

  return {
    id: fbData[mapping.id]?.toString() || '',
    name: fbData[mapping.name] || '',
    description: fbData[mapping.description] || undefined,
    instructorId: fbData[mapping.instructorId]?.toString() || '',
    instructorName: fbData[mapping.instructorName] || '',
    status: statusMap[fbData[mapping.status]] || 'inactive',
    startDate: fbData[mapping.startDate] || new Date().toISOString(),
    endDate: fbData[mapping.endDate] || undefined,
    maxStudents: parseInt(fbData[mapping.maxStudents]) || undefined,
    currentStudents: parseInt(fbData[mapping.currentStudents]) || 0,
    location: fbData[mapping.location] || undefined,
    notes: fbData[mapping.notes] || undefined,
    createdAt: fbData.createdon || new Date().toISOString(),
    updatedAt: fbData.modifiedon || new Date().toISOString(),
  };
}

// API Service Functions
export const fireberryApiService = {
  // Fetch all instructors
  async fetchInstructors(): Promise<ApiResponse<Instructor[]>> {
    if (USE_MOCK_DATA) {
      return {
        success: true,
        data: mockInstructors.filter(i => i.status === 'active'),
      };
    }

    try {
      const queryParams: FireberryQueryParams = {
        objecttype: FIREBERRY_FIELD_MAPPING.instructors.objecttype,
        page_size: 500,
        fields: Object.values(FIREBERRY_FIELD_MAPPING.instructors.fields).join(','),
        query: `${FIREBERRY_FIELD_MAPPING.instructors.fields.status} = 1`, // Active instructors
      };

      const response = await makeApiRequest<FireberryResponse>('/query', {
        method: 'POST',
        body: JSON.stringify(queryParams),
      });

      const instructors = response.data?.map(transformFireberryInstructor) || [];

      return {
        success: true,
        data: instructors,
      };
    } catch (error) {
      console.error('Failed to fetch instructors:', error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch instructors',
          code: error instanceof FireberryApiError ? error.code : undefined,
          status: error instanceof FireberryApiError ? error.status : undefined,
        },
      };
    }
  },

  // Authenticate instructor
  async loginInstructor(name: string, idNumber: string): Promise<ApiResponse<Instructor>> {
    if (USE_MOCK_DATA) {
      const instructor = findInstructorByCredentials(name, idNumber);
      if (instructor) {
        return { success: true, data: instructor };
      }
      return {
        success: false,
        error: { message: 'פרטי הכניסה שגויים או המדריך אינו פעיל' },
      };
    }

    try {
      const queryParams: FireberryQueryParams = {
        objecttype: FIREBERRY_FIELD_MAPPING.instructors.objecttype,
        page_size: 1,
        fields: Object.values(FIREBERRY_FIELD_MAPPING.instructors.fields).join(','),
        query: `${FIREBERRY_FIELD_MAPPING.instructors.fields.name} = "${name}" AND ${FIREBERRY_FIELD_MAPPING.instructors.fields.idNumber} = "${idNumber}" AND ${FIREBERRY_FIELD_MAPPING.instructors.fields.status} = 1`,
      };

      const response = await makeApiRequest<FireberryResponse>('/query', {
        method: 'POST',
        body: JSON.stringify(queryParams),
      });

      if (response.data && response.data.length > 0) {
        const instructor = transformFireberryInstructor(response.data[0]);
        return { success: true, data: instructor };
      }

      return {
        success: false,
        error: { message: 'פרטי הכניסה שגויים או המדריך אינו פעיל' },
      };
    } catch (error) {
      console.error('Failed to authenticate instructor:', error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to authenticate',
          code: error instanceof FireberryApiError ? error.code : undefined,
          status: error instanceof FireberryApiError ? error.status : undefined,
        },
      };
    }
  },

  // Fetch cohorts by instructor with filters
  async fetchCohortsByInstructor(
    instructorId: string,
    filters: CohortFilters = {},
    sort?: CohortSort,
    page = 1,
    pageSize = 20
  ): Promise<ApiResponse<PaginatedResponse<Cohort>>> {
    if (USE_MOCK_DATA) {
      let cohorts = getCohortsByInstructorId(instructorId);

      // Apply filters
      if (filters.status && filters.status !== 'all') {
        cohorts = cohorts.filter(c => c.status === filters.status);
      }
      if (filters.search) {
        const search = filters.search.toLowerCase();
        cohorts = cohorts.filter(c =>
          c.name.toLowerCase().includes(search) ||
          (c.description && c.description.toLowerCase().includes(search))
        );
      }

      // Apply sorting
      if (sort) {
        cohorts.sort((a, b) => {
          const aValue = a[sort.field];
          const bValue = b[sort.field];
          const result = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
          return sort.direction === 'desc' ? -result : result;
        });
      }

      // Apply pagination
      const start = (page - 1) * pageSize;
      const paginatedCohorts = cohorts.slice(start, start + pageSize);

      return {
        success: true,
        data: {
          data: paginatedCohorts,
          total: cohorts.length,
          page,
          pageSize,
          totalPages: Math.ceil(cohorts.length / pageSize),
        },
      };
    }

    try {
      let query = `${FIREBERRY_FIELD_MAPPING.cohorts.fields.instructorId} = "${instructorId}"`;

      // Add status filter
      if (filters.status && filters.status !== 'all') {
        const statusMap = {
          active: 1,
          inactive: 2,
          completed: 3,
          cancelled: 4,
        };
        query += ` AND ${FIREBERRY_FIELD_MAPPING.cohorts.fields.status} = ${statusMap[filters.status]}`;
      }

      // Add search filter
      if (filters.search) {
        query += ` AND (${FIREBERRY_FIELD_MAPPING.cohorts.fields.name} LIKE "%${filters.search}%" OR ${FIREBERRY_FIELD_MAPPING.cohorts.fields.description} LIKE "%${filters.search}%")`;
      }

      const queryParams: FireberryQueryParams = {
        objecttype: FIREBERRY_FIELD_MAPPING.cohorts.objecttype,
        page_size: pageSize,
        fields: Object.values(FIREBERRY_FIELD_MAPPING.cohorts.fields).join(','),
        query,
        page,
      };

      const response = await makeApiRequest<FireberryResponse>('/query', {
        method: 'POST',
        body: JSON.stringify(queryParams),
      });

      const cohorts = response.data?.map(transformFireberryCohort) || [];
      const total = response.total_records || cohorts.length;

      return {
        success: true,
        data: {
          data: cohorts,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (error) {
      console.error('Failed to fetch cohorts:', error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch cohorts',
          code: error instanceof FireberryApiError ? error.code : undefined,
          status: error instanceof FireberryApiError ? error.status : undefined,
        },
      };
    }
  },

  // Fetch cohort details with students
  async fetchCohortDetails(cohortId: string): Promise<ApiResponse<CohortDetails>> {
    if (USE_MOCK_DATA) {
      const cohortDetails = getMockCohortDetails(cohortId);
      if (cohortDetails) {
        return { success: true, data: cohortDetails };
      }
      return {
        success: false,
        error: { message: 'Cohort not found' },
      };
    }

    try {
      // First fetch cohort basic info
      const cohortQuery: FireberryQueryParams = {
        objecttype: FIREBERRY_FIELD_MAPPING.cohorts.objecttype,
        page_size: 1,
        fields: Object.values(FIREBERRY_FIELD_MAPPING.cohorts.fields).join(','),
        query: `${FIREBERRY_FIELD_MAPPING.cohorts.fields.id} = "${cohortId}"`,
      };

      const cohortResponse = await makeApiRequest<FireberryResponse>('/query', {
        method: 'POST',
        body: JSON.stringify(cohortQuery),
      });

      if (!cohortResponse.data || cohortResponse.data.length === 0) {
        return {
          success: false,
          error: { message: 'Cohort not found' },
        };
      }

      const cohort = transformFireberryCohort(cohortResponse.data[0]);

      // TODO: Fetch students for this cohort
      // This would require another API call to fetch registrations/students
      // For now, we'll return empty students array
      const students: any[] = [];

      const cohortDetails: CohortDetails = {
        ...cohort,
        students,
      };

      return { success: true, data: cohortDetails };
    } catch (error) {
      console.error('Failed to fetch cohort details:', error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch cohort details',
          code: error instanceof FireberryApiError ? error.code : undefined,
          status: error instanceof FireberryApiError ? error.status : undefined,
        },
      };
    }
  },
};