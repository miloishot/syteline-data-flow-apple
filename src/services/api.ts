import { ApiConfig, UserCredentials, CacheEntry } from "../types";

// API Service - implements exact same logic as your Python API calls
export class ApiService {
  private config: ApiConfig;
  private userCredentials: UserCredentials;
  private cache: Map<string, CacheEntry> = new Map();
  private token: string | null = null;

  constructor(config: ApiConfig, userCredentials: UserCredentials) {
    this.config = config;
    this.userCredentials = userCredentials;
    this.loadCache();
  }

  // Equivalent to your get_auth_headers function
  async getAuthHeaders(): Promise<{ headers: HeadersInit; error?: string }> {
    try {
      if (this.token) {
        return {
          headers: {
            "X-Infor-MongooseConfig": this.config.config,
            "Authorization": this.token,
            "accept": "application/json",
            "Content-Type": "application/json"
          }
        };
      }

      // Get token - equivalent to your token request
      const tokenUrl = `${this.config.base_url}/IDORequestService/ido/token/${this.config.config}/${this.userCredentials.username}/${this.userCredentials.password}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout * 1000);
      
      const response = await fetch(tokenUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          "accept": "application/json"
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const tokenData = await response.json();
      this.token = tokenData.Token;

      return {
        headers: {
          "X-Infor-MongooseConfig": this.config.config,
          "Authorization": this.token,
          "accept": "application/json",
          "Content-Type": "application/json"
        }
      };
    } catch (error: any) {
      return { 
        headers: {},
        error: `Authentication failed: ${error.message}` 
      };
    }
  }

  // Equivalent to your get_distinct_values function
  async getDistinctValues(
    idoName: string, 
    propertyName: string, 
    recordCap: number = 1000, 
    cacheDuration: number = 300
  ): Promise<{ values?: string[]; error?: string }> {
    const cacheKey = `${idoName}_${propertyName}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() < cached.expiry) {
      return { values: cached.data };
    }

    try {
      const authResult = await this.getAuthHeaders();
      if (authResult.error) {
        return { error: authResult.error };
      }

      const url = `${this.config.base_url}/IDORequestService/ido/load/${idoName}`;
      const params = new URLSearchParams({
        properties: propertyName,
        distinct: "true",
        recordCap: recordCap.toString()
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout * 1000);

      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: authResult.headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const items = data.Items || [];
      
      // Remove empty values and duplicates - same logic as Python
      const rawValues = items.map((item: any) => String(item[propertyName] || "").trim());
      const uniqueValues = [...new Set(rawValues.filter(value => value))] as string[];
      uniqueValues.sort();

      // Cache the results
      this.cache.set(cacheKey, {
        data: uniqueValues,
        expiry: Date.now() + (cacheDuration * 1000)
      });
      this.saveCache();

      return { values: uniqueValues };
    } catch (error: any) {
      return { error: `Request failed: ${error.message}` };
    }
  }

  // Equivalent to your load_collection function
  async loadCollection(
    idoName: string,
    properties: string,
    recordCap: number = 100,
    additionalParams: Record<string, string> = {}
  ): Promise<{ response?: Response; data?: any; error?: string }> {
    try {
      const authResult = await this.getAuthHeaders();
      if (authResult.error) {
        return { error: authResult.error };
      }

      const params = new URLSearchParams({
        properties,
        recordCap: recordCap.toString(),
        ...additionalParams
      });

      // Custom URL encoding to handle spaces correctly (like your Python version)
      const encodedParams = params.toString().replace(/\+/g, '%20');
      const url = `${this.config.base_url}/IDORequestService/ido/load/${idoName}?${encodedParams}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout * 1000);

      const response = await fetch(url, {
        method: 'GET',
        headers: authResult.headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return { response, data };
      } else {
        const errorText = await response.text();
        return { error: `API Error ${response.status}: ${errorText}` };
      }
    } catch (error: any) {
      return { error: `Request failed: ${error.message}` };
    }
  }

  // Test API connection - equivalent to your test function
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const authResult = await this.getAuthHeaders();
      if (authResult.error) {
        return { success: false, error: authResult.error };
      }

      // Try a simple request
      const url = `${this.config.base_url}/IDORequestService/ido/token/${this.config.config}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        method: 'GET',
        headers: authResult.headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      return { 
        success: response.ok,
        error: response.ok ? undefined : `Status: ${response.status} ${response.statusText}`
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Cache management - equivalent to your Python cache functions
  private loadCache(): void {
    try {
      const cached = localStorage.getItem("ido_api_cache");
      if (cached) {
        const cacheData = JSON.parse(cached);
        Object.entries(cacheData).forEach(([key, value]: [string, any]) => {
          if (value.expiry > Date.now()) {
            this.cache.set(key, value);
          }
        });
      }
    } catch (error) {
      console.error("Failed to load cache:", error);
    }
  }

  private saveCache(): void {
    try {
      const cacheData: Record<string, CacheEntry> = {};
      this.cache.forEach((value, key) => {
        if (value.expiry > Date.now()) {
          cacheData[key] = value;
        }
      });
      localStorage.setItem("ido_api_cache", JSON.stringify(cacheData));
    } catch (error) {
      console.error("Failed to save cache:", error);
    }
  }

  clearCache(): void {
    this.cache.clear();
    localStorage.removeItem("ido_api_cache");
  }

  // Refresh cache for specific IDO - equivalent to your refresh functionality
  clearCacheForIdo(idoName: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => key.startsWith(`${idoName}_`));
    keysToDelete.forEach(key => this.cache.delete(key));
    this.saveCache();
  }
}