import { Job } from "../types";

// Job management service - equivalent to your Python job file handling
export class JobService {
  private static readonly JOBS_STORAGE_KEY = "ido_jobs";
  private static readonly DEFAULT_JOBS: Job[] = [
    {
      job_name: "QC_Receipt_Tags_Full",
      ido_name: "OPSIT_RS_QCInspSups",
      query_params: {
        properties: "Item,ItmDescription,ItmRevision,Lot,vend_lot,overview,TransDate,CreateDate,UpdatedBy,CreatedBy,InspId,RcvrNum,RcvEntity,PoInfo,DerPOItemStat,QtyAccepted,Name",
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
          name: "RcvrNum",
          prompt: "Select Receiver Number",
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
    }
  ];

  static getJobs(): Job[] {
    try {
      const stored = localStorage.getItem(this.JOBS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      // Initialize with default jobs if none exist
      this.saveJobs(this.DEFAULT_JOBS);
      return this.DEFAULT_JOBS;
    } catch (error) {
      console.error("Failed to load jobs:", error);
      return this.DEFAULT_JOBS;
    }
  }

  static saveJobs(jobs: Job[]): void {
    try {
      localStorage.setItem(this.JOBS_STORAGE_KEY, JSON.stringify(jobs));
    } catch (error) {
      console.error("Failed to save jobs:", error);
    }
  }

  static addJob(job: Job): void {
    const jobs = this.getJobs();
    const existingIndex = jobs.findIndex(j => j.job_name === job.job_name);
    
    if (existingIndex >= 0) {
      jobs[existingIndex] = job;
    } else {
      jobs.push(job);
    }
    
    this.saveJobs(jobs);
  }

  static deleteJob(jobName: string): void {
    const jobs = this.getJobs();
    const filtered = jobs.filter(j => j.job_name !== jobName);
    this.saveJobs(filtered);
  }

  static getJob(jobName: string): Job | null {
    const jobs = this.getJobs();
    return jobs.find(j => j.job_name === jobName) || null;
  }
}

// Settings service - equivalent to your Python user settings
export class SettingsService {
  private static readonly SETTINGS_KEY = "ido_user_settings";

  static getSettings(): Record<string, any> {
    try {
      const stored = localStorage.getItem(this.SETTINGS_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error("Failed to load settings:", error);
      return {};
    }
  }

  static saveSetting(key: string, value: any): void {
    try {
      const settings = this.getSettings();
      settings[key] = value;
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error("Failed to save setting:", error);
    }
  }

  static getSetting(key: string, defaultValue: any = null): any {
    const settings = this.getSettings();
    return settings[key] !== undefined ? settings[key] : defaultValue;
  }
}