// Core types matching your Python application
export interface ApiConfig {
  base_url: string;
  config: string;
  timeout: number;
  retry_count: number;
  retry_delay: number;
}

export interface UserCredentials {
  username: string;
  password: string;
}

export interface EncryptedCredentials {
  api: ApiConfig;
  user: UserCredentials;
  logging: {
    level: string;
  };
}

export interface Job {
  job_name: string;
  ido_name: string;
  query_params: {
    properties: string;
    recordCap: number;
  };
  output_format: string;
  filterable_fields: Array<{
    name: string;
    prompt: string;
    type: string;
    operator: string;
    input_type: string;
    cache_duration?: number;
  }>;
}

export interface FilterValues {
  [key: string]: string;
}

export interface CacheEntry {
  data: any;
  expiry: number;
}

export interface ApiCache {
  [key: string]: CacheEntry;
}

export interface LogEntry {
  timestamp: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
}