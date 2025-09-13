// Fireberry API client and service functions
import type {
  FireberryInstructor,
  FireberrySession,
  Instructor,
  InstructorSession,
  LoginResponse,
  SessionsResponse,
  SessionDetailsResponse
} from '@/types/instructor';
import { validateEnv } from '@/lib/validations';

class FireberryApiClient {
  private apiUrl: string;
  private apiKey: string;
  private useMockData: boolean;
  private timeout: number;
  private retryAttempts: number;

  constructor() {
    const env = validateEnv();
    this.apiUrl = env.VITE_FIREBERRY_API_URL;
    this.apiKey = env.VITE_FIREBERRY_API_KEY;
    this.useMockData = env.VITE_USE_MOCK_DATA === 'true';
    this.timeout = parseInt(env.VITE_API_TIMEOUT);
    this.retryAttempts = parseInt(env.VITE_API_RETRY_ATTEMPTS);
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    retries = 0
  ): Promise<T> {
    if (this.useMockData) {
      return this.getMockResponse(endpoint, options);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.apiUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'tokenid': this.apiKey,
          'accept': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429 && retries < this.retryAttempts) {
          // Rate limited, retry with exponential backoff
          const delay = Math.pow(2, retries) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.makeRequest(endpoint, options, retries + 1);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      if (retries < this.retryAttempts &&
          error instanceof Error &&
          (error.message.includes('fetch') || error.message.includes('network'))) {
        const delay = Math.pow(2, retries) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeRequest(endpoint, options, retries + 1);
      }

      throw error;
    }
  }

  private async getMockResponse<T>(endpoint: string, options: RequestInit): Promise<T> {
    // Mock data responses for development
    const { default: mockData } = await import('@/mocks/instructor-data');

    if (endpoint === '/query' && options.method === 'POST') {
      const body = JSON.parse(options.body as string);

      // Mock instructor authentication
      if (body.objecttype === 1002 && body.query?.includes('emailaddress1')) {
        return {
          data: {
            Data: mockData.instructors.filter((instructor: any) =>
              body.query.includes(instructor.emailaddress1) &&
              body.query.includes(instructor.pcfsystemfield247)
            )
          }
        } as T;
      }

      // Mock all instructors
      if (body.objecttype === 1002) {
        return {
          data: {
            Data: mockData.instructors
          }
        } as T;
      }

      // Mock sessions for instructor
      if (body.objecttype === 1000) {
        return {
          data: {
            Data: mockData.sessions
          }
        } as T;
      }
    }

    throw new Error('Mock endpoint not implemented');
  }

  // Instructor-related API calls
  async getAllInstructors(): Promise<FireberryInstructor[]> {
    const response = await this.makeRequest<{ data: { Data: FireberryInstructor[] } }>('/query', {
      method: 'POST',
      body: JSON.stringify({
        objecttype: 1002,
        page_size: 500,
        fields: "instructorid,name,emailaddress1,telephone1,pcfsystemfield247,pcfsystemfield248,pcfsystemfield249,pcfsystemfield250,statuscode,createdon,modifiedon",
        query: "statuscode = 1"
      }),
    });

    return response.data?.Data || [];
  }

  async authenticateInstructor(name: string, idNumber: string): Promise<FireberryInstructor | null> {
    const response = await this.makeRequest<{ data: { Data: FireberryInstructor[] } }>('/query', {
      method: 'POST',
      body: JSON.stringify({
        objecttype: 1002,
        page_size: 1,
        fields: "instructorid,name,emailaddress1,telephone1,pcfsystemfield247,pcfsystemfield248,pcfsystemfield249,pcfsystemfield250,statuscode,createdon,modifiedon",
        query: `name = '${this.escapeString(name)}' AND pcfsystemfield247 = '${this.escapeString(idNumber)}' AND statuscode = 1`
      }),
    });

    return response.data?.Data?.[0] || null;
  }

  async getInstructorSessions(instructorId: string, filters: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ sessions: FireberrySession[]; totalCount: number }> {
    let query = `pcfsystemfield251 = '${this.escapeString(instructorId)}'`;

    // Add status filter
    if (filters.status && filters.status !== 'all') {
      const statusMap: Record<string, number> = {
        active: 1,
        inactive: 0,
        completed: 2,
        cancelled: 3
      };
      query += ` AND pcfsystemfield37 = ${statusMap[filters.status] || 1}`;
    }

    // Add search filter
    if (filters.search) {
      query += ` AND name LIKE '%${this.escapeString(filters.search)}%'`;
    }

    const response = await this.makeRequest<{ data: { Data: FireberrySession[] } }>('/query', {
      method: 'POST',
      body: JSON.stringify({
        objecttype: 1000,
        page_size: filters.limit || 20,
        fields: "customobject1000id,name,description,pcfsystemfield37,pcfsystemfield549,startdate,enddate,pcfsystemfield251,pcfsystemfield252,pcfsystemfield253,pcfsystemfield254,pcfsystemfield255,createdon,modifiedon",
        query
      }),
    });

    return {
      sessions: response.data?.Data || [],
      totalCount: response.data?.Data?.length || 0
    };
  }

  async getSessionDetails(sessionId: string): Promise<FireberrySession | null> {
    const response = await this.makeRequest<{ data: { Data: FireberrySession[] } }>('/query', {
      method: 'POST',
      body: JSON.stringify({
        objecttype: 1000,
        page_size: 1,
        fields: "customobject1000id,name,description,pcfsystemfield37,pcfsystemfield549,startdate,enddate,pcfsystemfield251,pcfsystemfield252,pcfsystemfield253,pcfsystemfield254,pcfsystemfield255,createdon,modifiedon",
        query: `customobject1000id = '${this.escapeString(sessionId)}'`
      }),
    });

    return response.data?.Data?.[0] || null;
  }

  private escapeString(str: string): string {
    return str.replace(/'/g, "''").replace(/\\/g, '\\\\');
  }
}

// Service functions
export class InstructorService {
  private apiClient: FireberryApiClient;

  constructor() {
    this.apiClient = new FireberryApiClient();
  }

  // Transform Fireberry instructor to our format
  private transformInstructor(fireberryInstructor: FireberryInstructor): Instructor {
    return {
      id: fireberryInstructor.instructorid,
      name: fireberryInstructor.name,
      email: fireberryInstructor.emailaddress1,
      phone: fireberryInstructor.telephone1,
      idNumber: fireberryInstructor.pcfsystemfield247,
      specialization: fireberryInstructor.pcfsystemfield249,
      certification: fireberryInstructor.pcfsystemfield248,
      level: fireberryInstructor.pcfsystemfield250,
      status: fireberryInstructor.statuscode === 1 ? 'active' : 'inactive',
      createdOn: fireberryInstructor.createdon,
      modifiedOn: fireberryInstructor.modifiedon
    };
  }

  // Transform Fireberry session to our format
  private transformSession(fireberrySession: FireberrySession, instructorName?: string): InstructorSession {
    const statusMap: Record<number, 'active' | 'inactive' | 'completed' | 'cancelled'> = {
      1: 'active',
      0: 'inactive',
      2: 'completed',
      3: 'cancelled'
    };

    return {
      id: fireberrySession.customobject1000id,
      name: fireberrySession.name,
      description: fireberrySession.description,
      status: statusMap[fireberrySession.pcfsystemfield37] || 'inactive',
      instructorId: fireberrySession.pcfsystemfield251 || '',
      instructorName: instructorName || 'Unknown',
      startDate: fireberrySession.startdate || new Date().toISOString(),
      endDate: fireberrySession.enddate || new Date().toISOString(),
      studentCount: fireberrySession.pcfsystemfield252 || 0,
      maxCapacity: fireberrySession.pcfsystemfield253,
      location: fireberrySession.pcfsystemfield254,
      notes: fireberrySession.pcfsystemfield255,
      createdOn: fireberrySession.createdon,
      modifiedOn: fireberrySession.modifiedon
    };
  }

  async fetchInstructors(): Promise<Instructor[]> {
    try {
      const fireberryInstructors = await this.apiClient.getAllInstructors();
      return fireberryInstructors.map(instructor => this.transformInstructor(instructor));
    } catch (error) {
      console.error('Failed to fetch instructors:', error);
      throw new Error('Failed to load instructors. Please try again.');
    }
  }

  async loginInstructor(name: string, idNumber: string): Promise<LoginResponse> {
    try {
      const fireberryInstructor = await this.apiClient.authenticateInstructor(name, idNumber);

      if (!fireberryInstructor) {
        return {
          success: false,
          message: 'שם המדריך או מספר הזהות שגויים'
        };
      }

      const instructor = this.transformInstructor(fireberryInstructor);
      const token = this.generateSessionToken(instructor);
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes

      return {
        success: true,
        instructor,
        token,
        expiresAt,
        message: 'התחברת בהצלחה'
      };
    } catch (error) {
      console.error('Login failed:', error);
      return {
        success: false,
        message: 'שגיאה בהתחברות. אנא נסה שוב.'
      };
    }
  }

  async fetchCohortsByInstructor(
    instructorId: string,
    filters: { status?: string; search?: string; page?: number; limit?: number } = {}
  ): Promise<SessionsResponse> {
    try {
      const { sessions, totalCount } = await this.apiClient.getInstructorSessions(instructorId, filters);
      const transformedSessions = sessions.map(session => this.transformSession(session));

      const limit = filters.limit || 20;
      const page = filters.page || 1;
      const totalPages = Math.ceil(totalCount / limit);

      return {
        sessions: transformedSessions,
        totalCount,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      };
    } catch (error) {
      console.error('Failed to fetch instructor sessions:', error);
      throw new Error('Failed to load sessions. Please try again.');
    }
  }

  async fetchCohortDetails(cohortId: string): Promise<SessionDetailsResponse> {
    try {
      const fireberrySession = await this.apiClient.getSessionDetails(cohortId);

      if (!fireberrySession) {
        return {
          success: false,
          message: 'מפגש לא נמצא'
        };
      }

      const session = this.transformSession(fireberrySession);

      // Mock student data for now - in real implementation, fetch from Fireberry
      const mockStudents = [
        {
          id: 'student1',
          name: 'יוסי כהן',
          email: 'yossi@example.com',
          status: 'active' as const,
          registrationDate: new Date().toISOString()
        },
        {
          id: 'student2',
          name: 'שרה לוי',
          email: 'sara@example.com',
          status: 'completed' as const,
          registrationDate: new Date().toISOString(),
          completionDate: new Date().toISOString()
        }
      ];

      return {
        success: true,
        data: {
          session,
          students: mockStudents,
          totalStudents: mockStudents.length,
          activeStudents: mockStudents.filter(s => s.status === 'active').length,
          completedStudents: mockStudents.filter(s => s.status === 'completed').length,
          droppedStudents: mockStudents.filter(s => s.status === 'dropped').length
        }
      };
    } catch (error) {
      console.error('Failed to fetch session details:', error);
      return {
        success: false,
        message: 'שגיאה בטעינת פרטי המפגש'
      };
    }
  }

  private generateSessionToken(instructor: Instructor): string {
    // Simple token generation for demo - use proper JWT in production
    const payload = {
      instructorId: instructor.id,
      name: instructor.name,
      exp: Date.now() + 30 * 60 * 1000 // 30 minutes
    };
    return btoa(JSON.stringify(payload));
  }
}

// Export singleton instance
export const instructorService = new InstructorService();