export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface FireberryQueryParams {
  objecttype: number;
  page_size?: number;
  fields?: string;
  query?: string;
  page?: number;
}

export interface FireberryResponse<T = unknown> {
  data: T[];
  total_records?: number;
  page?: number;
  page_size?: number;
}

export interface RateLimitInfo {
  requests: number;
  windowStart: number;
  remaining: number;
}