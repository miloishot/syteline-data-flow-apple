import { supabase } from "@/integrations/supabase/client";
import { EncryptionService } from "./encryption";
import type { Job } from "@/types";

export interface UserConfiguration {
  id: string;
  user_id: string;
  username: string;
  encrypted_data: string;
  salt: string;
  iv: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseJob {
  id: string;
  user_id: string;
  job_name: string;
  ido_name: string;
  query_params: any;
  output_format: string;
  filterable_fields: any;
  created_at: string;
  updated_at: string;
}

// Database service for user configurations
export class ConfigurationService {
  static async saveConfiguration(
    username: string,
    configData: any,
    encryptionPassword: string
  ): Promise<{ success: boolean; error?: string; existingConfig?: UserConfiguration }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: "User not authenticated" };
      }

      // Check if configuration with this username already exists for any user
      const { data: existingConfigs } = await supabase
        .from('user_configurations')
        .select('*')
        .eq('username', username);

      // If configuration exists for current user, update it
      const existingUserConfig = existingConfigs?.find(config => config.user_id === user.id);
      
      // If configuration exists for different user, return existing config info
      const existingOtherConfig = existingConfigs?.find(config => config.user_id !== user.id);
      if (existingOtherConfig) {
        return { 
          success: false, 
          error: "Configuration with this username already exists", 
          existingConfig: existingOtherConfig 
        };
      }

      // Prepare data to encrypt
      const credentials = {
        api: {
          base_url: configData.api.base_url,
          config: configData.api.config,
          timeout: parseInt(configData.api.timeout) || 30,
          retry_count: parseInt(configData.api.retry_count) || 3,
          retry_delay: parseInt(configData.api.retry_delay) || 1,
        },
        user: {
          username: configData.user.username,
          password: configData.user.password,
        },
        logging: {
          level: "INFO"
        }
      };

      // Encrypt the configuration data
      const encrypted = await EncryptionService.encrypt(
        JSON.stringify(credentials), 
        encryptionPassword
      );

      if (existingUserConfig) {
        // Update existing configuration
        const { error } = await supabase
          .from('user_configurations')
          .update({
            encrypted_data: encrypted.encrypted,
            salt: encrypted.salt,
            iv: encrypted.iv,
          })
          .eq('id', existingUserConfig.id);

        if (error) {
          return { success: false, error: error.message };
        }
      } else {
        // Insert new configuration
        const { error } = await supabase
          .from('user_configurations')
          .insert({
            user_id: user.id,
            username: username,
            encrypted_data: encrypted.encrypted,
            salt: encrypted.salt,
            iv: encrypted.iv,
          });

        if (error) {
          return { success: false, error: error.message };
        }
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async loadConfiguration(
    username: string,
    encryptionPassword: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: "User not authenticated" };
      }

      // Get user's configuration by username
      const { data: config, error } = await supabase
        .from('user_configurations')
        .select('*')
        .eq('user_id', user.id)
        .eq('username', username)
        .single();

      if (error || !config) {
        return { success: false, error: "Configuration not found" };
      }

      // Decrypt the configuration data
      const decrypted = await EncryptionService.decrypt(
        config.encrypted_data,
        config.salt,
        config.iv,
        encryptionPassword
      );

      const credentials = JSON.parse(decrypted);
      return { success: true, data: credentials };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async getUserConfigurations(): Promise<{ success: boolean; data?: UserConfiguration[]; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: "User not authenticated" };
      }

      const { data: configs, error } = await supabase
        .from('user_configurations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: configs || [] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async deleteConfiguration(configId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: "User not authenticated" };
      }

      const { error } = await supabase
        .from('user_configurations')
        .delete()
        .eq('id', configId)
        .eq('user_id', user.id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

// Database service for jobs
export class DatabaseJobService {
  static async saveJob(job: Job): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: "User not authenticated" };
      }

      // Check if job already exists for user
      const { data: existingJob } = await supabase
        .from('jobs')
        .select('id')
        .eq('user_id', user.id)
        .eq('job_name', job.job_name)
        .single();

      if (existingJob) {
        // Update existing job
        const { error } = await supabase
          .from('jobs')
          .update({
            ido_name: job.ido_name,
            query_params: job.query_params,
            output_format: job.output_format,
            filterable_fields: job.filterable_fields,
          })
          .eq('id', existingJob.id);

        if (error) {
          return { success: false, error: error.message };
        }
      } else {
        // Insert new job
        const { error } = await supabase
          .from('jobs')
          .insert({
            user_id: user.id,
            job_name: job.job_name,
            ido_name: job.ido_name,
            query_params: job.query_params,
            output_format: job.output_format,
            filterable_fields: job.filterable_fields,
          });

        if (error) {
          return { success: false, error: error.message };
        }
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async getJobs(): Promise<{ success: boolean; data?: Job[]; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: "User not authenticated" };
      }

      const { data: jobs, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      // Convert database jobs to Job interface
      const convertedJobs: Job[] = (jobs || []).map(job => ({
        job_name: job.job_name,
        ido_name: job.ido_name,
        query_params: job.query_params as { properties: string; recordCap: number },
        output_format: job.output_format,
        filterable_fields: job.filterable_fields as Array<{
          name: string;
          prompt: string;
          type: string;
          operator: string;
          input_type: string;
          cache_duration?: number;
        }>,
      }));

      return { success: true, data: convertedJobs };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async deleteJob(jobName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: "User not authenticated" };
      }

      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('user_id', user.id)
        .eq('job_name', jobName);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Migrate default job from localStorage to database
  static async migrateDefaultJob(): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: "User not authenticated" };
      }

      // Check if default job already exists in database
      const { data: existingJob } = await supabase
        .from('jobs')
        .select('id')
        .eq('user_id', user.id)
        .eq('job_name', 'Staging_Area_Label')
        .single();

      if (existingJob) {
        return { success: true }; // Already migrated
      }

      // Default job from storage.ts
      const defaultJob: Job = {
        job_name: "Staging_Area_Label",
        ido_name: "OPSIT_RS_QCInspIps",
        query_params: {
          properties: "Name,Lot,rcvd_qty,CreateDate,Item,TransDate,u_m,itmDescription,Job,overview",
          recordCap: 100
        },
        output_format: "csv",
        filterable_fields: [
          {
            name: "Lot",
            prompt: "Select Lot",
            type: "string",
            operator: "=",
            input_type: "dropdown",
            cache_duration: 300
          },
          {
            name: "Item",
            prompt: "Select Item code",
            type: "string",
            operator: "=",
            input_type: "dropdown",
            cache_duration: 300
          },
          {
            name: "TransDate",
            prompt: "Select Transaction Date",
            type: "date",
            operator: ">=",
            input_type: "calendar"
          }
        ]
      };

      return await this.saveJob(defaultJob);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}