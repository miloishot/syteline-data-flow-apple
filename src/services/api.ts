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

  // Get the base URL - use proxy in development, direct URL in production
  private getBaseUrl(): string {
    // In development, use the proxy to avoid CORS issues
    if (import.meta.env.DEV) {
      return '/api';
    }
    // In production, use the actual API URL
    return this.config.base_url;
  }

  // Equivalent to your get_auth_headers function - EXACT Python logic
  async getAuthHeaders(): Promise<{ headers: HeadersInit; error?: string }> {
    try {
      if (this.token) {
        return {
          headers: {
            "X-Infor-MongooseConfig": this.config.config,
            "Authorization": this.token,
            "accept": "application/json"
          }
        };
      }

      // Get token - EXACT same as Python: BASE/IDORequestService/ido/token/CFIG/USER/PWD
      const BASE = this.getBaseUrl();
      const CFIG = this.config.config;
      const USER = this.userCredentials.username;
      const PWD = this.userCredentials.password;
      
      // Build URL exactly like Python - no URL encoding of path segments
      const tokenUrl = `${BASE}/IDORequestService/ido/token/${CFIG}/${USER}/${PWD}`;
      
      console.log("Token URL (masked):", tokenUrl.replace(PWD, "***"));
      
      const response = await fetch(tokenUrl, {
        method: 'GET',
        headers: {
          "accept": "application/json"
        },
        // Use same timeout as Python (30 seconds default)
        signal: AbortSignal.timeout(30000)
      });

      console.log("Token response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Token request failed:", errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
      }

      const tokenData = await response.json();
      console.log("Token response received");
      
      if (!tokenData.Token) {
        throw new Error("No token received from server");
      }
      
      this.token = tokenData.Token;

      // Return headers exactly like Python
      return {
        headers: {
          "X-Infor-MongooseConfig": CFIG,
          "Authorization": this.token,
          "accept": "application/json"
        }
      };
    } catch (error: any) {
      console.error("Authentication error:", error);
      
      // Better error messages for common issues
      let errorMessage = error.message;
      if (error.name === 'TimeoutError') {
        errorMessage = "Request timeout - server may be slow or unreachable";
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = `Cannot reach server. This might be due to:\n• CORS policy blocking the request\n• Server not responding\n• Network connectivity issues\n• Invalid server URL`;
      } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        errorMessage = "Invalid username or password for SyteLine system";
      } else if (error.message.includes('404')) {
        errorMessage = "API endpoint not found - check base URL and configuration name";
      }
      
      return { 
        headers: {},
        error: errorMessage
      };
    }
  }

  // Equivalent to your get_distinct_values function - EXACT Python logic
  async getDistinctValues(
    idoName: string, 
    propertyName: string, 
    recordCap: number = 1000, 
    cacheDuration: number = 300
  ): Promise<{ values?: string[]; error?: string }> {
    const cacheKey = `${idoName}_${propertyName}`;
    const cached = this.cache.get(cacheKey);
    
    // Check cache first (same as Python)
    if (cached && Date.now() < cached.expiry) {
      console.log(`Using cached values for ${cacheKey}`);
      return { values: cached.data };
    }

    try {
      console.log(`Loading distinct values for ${idoName}.${propertyName}`);
      
      const authResult = await this.getAuthHeaders();
      if (authResult.error) {
        return { error: authResult.error };
      }

      const BASE = this.getBaseUrl();
      // Build URL exactly like Python
      const url = `${BASE}/IDORequestService/ido/load/${idoName}`;
      
      // Build params exactly like Python
      const params = new URLSearchParams({
        properties: propertyName,
        distinct: "true",
        recordCap: recordCap.toString()
      });

      console.log("Distinct values request:", `${url}?${params}`);

      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: authResult.headers,
        signal: AbortSignal.timeout(30000)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Distinct values API error:", errorText);
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const items = data.Items || [];
      
      console.log(`Received ${items.length} items for distinct values`);
      
      // Process values exactly like Python
      const rawValues = items.map((item: any) => String(item[propertyName] || "").trim());
      
      // Remove empty values and duplicates - same logic as Python
      const uniqueValues: string[] = [];
      const seen = new Set<string>();
      for (const value of rawValues) {
        if (value && !seen.has(value)) {
          uniqueValues.push(value);
          seen.add(value);
        }
      }
      
      // Sort values (same as Python)
      uniqueValues.sort();

      console.log(`Processed ${uniqueValues.length} unique values for ${propertyName}`);

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

  // Equivalent to your load_collection function - EXACT Python logic
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

      const BASE = this.getBaseUrl();
      
      // Build params exactly like Python
      const params = new URLSearchParams({
        properties,
        recordCap: recordCap.toString(),
        ...additionalParams
      });

      // Custom URL encoding to handle spaces correctly (EXACT same as Python)
      // Python: encoded.replace('+', '%20')
      const encodedParams = params.toString().replace(/\+/g, '%20');
      const url = `${BASE}/IDORequestService/ido/load/${idoName}?${encodedParams}`;

      console.log("Load collection request:", url);

      const response = await fetch(url, {
        method: 'GET',
        headers: authResult.headers,
        signal: AbortSignal.timeout(30000)
      });

      if (response.ok) {
        const data = await response.json();
        return { response, data };
      } else {
        const errorText = await response.text();
        return { error: `API Error ${response.status}: ${errorText}` };
      }
    } catch (error: any) {
      console.error("Load collection error:", error);
      
      if (error.name === 'TimeoutError') {
        return { error: `Request timeout after 30 seconds` };
      }
      
      if (error.message.includes('Failed to fetch')) {
        return { error: `Network error: Cannot reach the API server. This might be due to CORS policy restrictions when calling external APIs from the browser.` };
      }
      
      return { error: `Request failed: ${error.message}` };
    }
  }

  // Test API connection - simplified to match Python approach
  async testConnection(): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      console.log("Testing connection...");
      console.log("Base URL:", this.getBaseUrl());
      console.log("Config:", this.config.config);
      console.log("Username:", this.userCredentials.username);
      
      // Just try to get auth headers - this will test the full auth flow
      const authResult = await this.getAuthHeaders();
      if (authResult.error) {
        return { 
          success: false, 
          error: authResult.error,
          details: {
            step: "authentication",
            config: {
              base_url: this.getBaseUrl(),
              config: this.config.config,
              timeout: this.config.timeout
            }
          }
        };
      }

      // If we got here, authentication worked
      console.log("Authentication successful");
      
      return { 
        success: true,
        details: {
          message: "Successfully authenticated with SyteLine API",
          config: this.config.config,
          base_url: this.getBaseUrl()
        }
      };
    } catch (error: any) {
      console.error("Test connection error:", error);
      
      return { 
        success: false, 
        error: error.message,
        details: {
          step: "connection_test",
          error: error.message
        }
      };
    }
  }

  // Cache management - same as Python
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

  clearCacheForIdo(idoName: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => key.startsWith(`${idoName}_`));
    keysToDelete.forEach(key => this.cache.delete(key));
    this.saveCache();
  }
}