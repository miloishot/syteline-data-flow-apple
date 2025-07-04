import { supabase } from "@/integrations/supabase/client";
import type { Job, LogEntry, FilterValues, ApiConfig, UserCredentials } from "@/types";

// Cloud Database Service using Supabase
export class CloudDatabaseService {
  // User Management
  static async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  }

  static async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  }

  static async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  }

  static async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  // Job Configuration Management
  static async saveJob(job: Job) {
    const user = await this.getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from('jobs')
      .upsert({
        id: job.job_name,
        user_id: user.id,
        job_name: job.job_name,
        ido_name: job.ido_name,
        query_params: job.query_params,
        output_format: job.output_format,
        filterable_fields: job.filterable_fields,
        updated_at: new Date().toISOString()
      });

    return { data, error };
  }

  static async getJobs(): Promise<Job[]> {
    const user = await this.getCurrentUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching jobs:', error);
      return [];
    }

    return data?.map(row => ({
      job_name: row.job_name,
      ido_name: row.ido_name,
      query_params: row.query_params as any,
      output_format: row.output_format,
      filterable_fields: row.filterable_fields as any
    })) || [];
  }

  static async deleteJob(jobName: string) {
    const user = await this.getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('user_id', user.id)
      .eq('job_name', jobName);

    return { error };
  }

  // API Configuration Management
  static async saveApiConfig(config: ApiConfig & UserCredentials, encryptionKey: string) {
    const user = await this.getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    // Encrypt sensitive data before storing
    const encryptedConfig = await this.encryptData(JSON.stringify(config), encryptionKey);

    const { data, error } = await supabase
      .from('api_configs')
      .upsert({
        user_id: user.id,
        config_name: config.config || 'default',
        encrypted_config: encryptedConfig,
        base_url: config.base_url,
        username: config.username,
        updated_at: new Date().toISOString()
      });

    return { data, error };
  }

  static async getApiConfigs() {
    const user = await this.getCurrentUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('api_configs')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    return { data, error };
  }

  // Execution History
  static async saveExecutionHistory(
    jobName: string,
    filters: FilterValues,
    recordCount: number,
    filePath: string,
    status: 'success' | 'error',
    errorMessage?: string
  ) {
    const user = await this.getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from('execution_history')
      .insert({
        user_id: user.id,
        job_name: jobName,
        filters_applied: filters,
        record_count: recordCount,
        file_path: filePath,
        status,
        error_message: errorMessage,
        executed_at: new Date().toISOString()
      });

    return { data, error };
  }

  static async getExecutionHistory(limit: number = 50) {
    const user = await this.getCurrentUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('execution_history')
      .select('*')
      .eq('user_id', user.id)
      .order('executed_at', { ascending: false })
      .limit(limit);

    return { data, error };
  }

  // Settings Management
  static async saveSetting(key: string, value: any) {
    const user = await this.getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        setting_key: key,
        setting_value: value,
        updated_at: new Date().toISOString()
      });

    return { data, error };
  }

  static async getSetting(key: string, defaultValue: any = null) {
    const user = await this.getCurrentUser();
    if (!user) return defaultValue;

    const { data, error } = await supabase
      .from('user_settings')
      .select('setting_value')
      .eq('user_id', user.id)
      .eq('setting_key', key)
      .single();

    if (error || !data) return defaultValue;
    return data.setting_value;
  }

  // Data Export Storage (for sharing/backup)
  static async saveExportData(
    jobName: string,
    data: any[],
    metadata: {
      filters: FilterValues;
      recordCount: number;
      exportFormat: string;
    }
  ) {
    const user = await this.getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    const { data: result, error } = await supabase
      .from('export_data')
      .insert({
        user_id: user.id,
        job_name: jobName,
        export_data: data,
        metadata,
        created_at: new Date().toISOString()
      });

    return { data: result, error };
  }

  static async getExportData(exportId: string) {
    const user = await this.getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from('export_data')
      .select('*')
      .eq('user_id', user.id)
      .eq('id', exportId)
      .single();

    return { data, error };
  }

  // Utility functions
  private static async encryptData(data: string, key: string): Promise<string> {
    // Simple encryption - in production, use proper encryption
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key);
    const dataArray = encoder.encode(data);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      dataArray
    );

    const result = new Uint8Array(iv.length + encrypted.byteLength);
    result.set(iv);
    result.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...result));
  }

  private static async decryptData(encryptedData: string, key: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    const data = new Uint8Array(atob(encryptedData).split('').map(c => c.charCodeAt(0)));
    const iv = data.slice(0, 12);
    const encrypted = data.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }
}