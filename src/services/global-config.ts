import { supabase } from "@/integrations/supabase/client";

// Global Configuration Service
export class GlobalConfigService {
  private static cache: Map<string, any> = new Map();
  private static cacheExpiry: Map<string, number> = new Map();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Get a configuration value with caching
  static async getConfig(key: string, defaultValue: any = null): Promise<any> {
    // Check cache first
    const cached = this.cache.get(key);
    const expiry = this.cacheExpiry.get(key);
    
    if (cached !== undefined && expiry && Date.now() < expiry) {
      return cached;
    }

    try {
      const { data, error } = await supabase
        .from('global_config')
        .select('config_value')
        .eq('config_key', key)
        .single();

      if (error || !data) {
        return defaultValue;
      }

      // Cache the result
      this.cache.set(key, data.config_value);
      this.cacheExpiry.set(key, Date.now() + this.CACHE_DURATION);

      return data.config_value;
    } catch (error) {
      console.error(`Failed to get config ${key}:`, error);
      return defaultValue;
    }
  }

  // Get multiple configuration values
  static async getConfigs(keys: string[]): Promise<Record<string, any>> {
    const result: Record<string, any> = {};
    
    try {
      const { data, error } = await supabase
        .from('global_config')
        .select('config_key, config_value')
        .in('config_key', keys);

      if (error) throw error;

      data?.forEach(item => {
        result[item.config_key] = item.config_value;
        // Cache individual items
        this.cache.set(item.config_key, item.config_value);
        this.cacheExpiry.set(item.config_key, Date.now() + this.CACHE_DURATION);
      });

      return result;
    } catch (error) {
      console.error('Failed to get configs:', error);
      return result;
    }
  }

  // Get all public configuration values
  static async getPublicConfigs(): Promise<Record<string, any>> {
    try {
      const { data, error } = await supabase
        .from('global_config')
        .select('config_key, config_value')
        .eq('is_public', true);

      if (error) throw error;

      const result: Record<string, any> = {};
      data?.forEach(item => {
        result[item.config_key] = item.config_value;
      });

      return result;
    } catch (error) {
      console.error('Failed to get public configs:', error);
      return {};
    }
  }

  // Clear cache for a specific key or all keys
  static clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
    } else {
      this.cache.clear();
      this.cacheExpiry.clear();
    }
  }

  // Preload commonly used configurations
  static async preloadConfigs(): Promise<void> {
    const commonKeys = [
      'app_name',
      'app_version',
      'default_base_url',
      'default_config_name',
      'max_record_cap',
      'supported_formats',
      'maintenance_mode',
      'user_registration_enabled',
      'default_timeout',
      'cache_duration'
    ];

    await this.getConfigs(commonKeys);
  }

  // Check if the application is in maintenance mode
  static async isMaintenanceMode(): Promise<boolean> {
    return await this.getConfig('maintenance_mode', false);
  }

  // Check if user registration is enabled
  static async isRegistrationEnabled(): Promise<boolean> {
    return await this.getConfig('user_registration_enabled', true);
  }

  // Get default API configuration
  static async getDefaultApiConfig(): Promise<{
    base_url: string;
    config_name: string;
    timeout: number;
    max_record_cap: number;
  }> {
    const configs = await this.getConfigs([
      'default_base_url',
      'default_config_name',
      'default_timeout',
      'max_record_cap'
    ]);

    return {
      base_url: configs.default_base_url || '',
      config_name: configs.default_config_name || 'SL',
      timeout: configs.default_timeout || 30,
      max_record_cap: configs.max_record_cap || 10000
    };
  }

  // Get supported export formats
  static async getSupportedFormats(): Promise<string[]> {
    return await this.getConfig('supported_formats', ['csv', 'xlsx']);
  }

  // Get application info
  static async getAppInfo(): Promise<{
    name: string;
    version: string;
  }> {
    const configs = await this.getConfigs(['app_name', 'app_version']);
    
    return {
      name: configs.app_name || 'IDO Data Extractor',
      version: configs.app_version || '1.0.0'
    };
  }
}