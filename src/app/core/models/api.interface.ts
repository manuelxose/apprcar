// =================== src/app/core/models/api.interface.ts ===================
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

export interface ResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: ResponseMeta;
}
