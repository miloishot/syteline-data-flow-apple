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
      
      console.log("Attempting to get token from:", tokenUrl.replace(this.userCredentials.password, "***"));
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout * 1000);
      
      try {
        const response = await fetch(tokenUrl, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            "accept": "application/json"
          }
        });

        clearTimeout(timeoutId);

        console.log("Token response status:", response.status);
        console.log("Token response headers:", Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Token request failed:", errorText);
          throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
        }

        const tokenData = await response.json();
        console.log("Token response data:", tokenData);
        
        if (!tokenData.Token) {
          throw new Error("No token received from server");
        }
        
        this.token = tokenData.Token;

        return {
          headers: {
            "X-Infor-MongooseConfig": this.config.config,
            "Authorization": this.token,
            "accept": "application/json",
            "Content-Type": "application/json"
          }
        };
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          throw new Error(`Request timeout after ${this.config.timeout} seconds`);
        }
        
        // Check for common network errors
        if (fetchError.message.includes('Failed to fetch')) {
          throw new Error(`Network error: Cannot reach ${this.config.base_url}. Please check:\n1. URL is correct\n2. Server is running\n3. No CORS issues\n4. Network connectivity`);
        }
        
        throw fetchError;
      }
    } catch (error: any) {
      console.error("Authentication error:", error);
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

      console.log("Making distinct values request to:", `${url}?${params}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout * 1000);

      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: authResult.headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
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
      console.error("Get distinct values error:", error);
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

      console.log("Making load collection request to:", url);

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
      console.error("Load collection error:", error);
      
      if (error.name === 'AbortError') {
        return { error: `Request timeout after ${this.config.timeout} seconds` };
      }
      
      if (error.message.includes('Failed to fetch')) {
        return { error: `Network error: Cannot reach the API server. Please check your connection and server status.` };
      }
      
      return { error: `Request failed: ${error.message}` };
    }
  }

  // Test API connection - equivalent to your test function
  async testConnection(): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      console.log("Testing connection to:", this.config.base_url);
      console.log("Using config:", this.config.config);
      console.log("Username:", this.userCredentials.username);
      
      // First, try a simple ping to the base URL
      try {
        const pingUrl = this.config.base_url;
        const pingResponse = await fetch(pingUrl, { 
          method: 'HEAD',
          mode: 'no-cors' // This will help with CORS issues for basic connectivity test
        });
        console.log("Base URL ping successful");
      } catch (pingError) {
        console.warn("Base URL ping failed:", pingError);
        // Continue anyway, as no-cors mode doesn't give us much info
      }

      const authResult = await this.getAuthHeaders();
      if (authResult.error) {
        return { 
          success: false, 
          error: authResult.error,
          details: {
            step: "authentication",
            config: {
              base_url: this.config.base_url,
              config: this.config.config,
              timeout: this.config.timeout
            }
          }
        };
      }

      // Try a simple request to verify the connection works
      const testUrl = `${this.config.base_url}/IDORequestService/ido/token/${this.config.config}`;
      console.log("Testing with URL:", testUrl);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(testUrl, {
        method: 'GET',
        headers: authResult.headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log("Test response status:", response.status);
      console.log("Test response headers:", Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const responseData = await response.text();
        console.log("Test response data:", responseData);
      }

      return { 
        success: response.ok,
        error: response.ok ? undefined : `Status: ${response.status} ${response.statusText}`,
        details: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        }
      };
    } catch (error: any) {
      console.error("Test connection error:", error);
      
      let errorMessage = error.message;
      let details: any = { step: "connection_test" };
      
      if (error.name === 'AbortError') {
        errorMessage = "Connection timeout - server may be unreachable";
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = "Cannot reach server - check URL, network, and CORS settings";
        details.possibleCauses = [
          "Incorrect base URL",
          "Server is down",
          "Network connectivity issues",
          "CORS policy blocking the request",
          "Firewall blocking the connection"
        ];
      }
      
      return { 
        success: false, 
        error: errorMessage,
        details
      };
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