import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { JobSelector } from "@/components/JobSelector";
import { FilterPanel } from "@/components/FilterPanel";
import { OutputPanel } from "@/components/OutputPanel";
import { CloudSync } from "@/components/CloudSync";
import { Play, TestTube, Settings, Database } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Import services
import { CloudDatabaseService } from "@/services/cloud-database";
import { GlobalConfigService } from "@/services/global-config";
import { ApiService } from "@/services/api";
import { ExportService, FilterUtils } from "@/services/export";
import type { Job, LogEntry, FilterValues, ApiConfig, UserCredentials } from "@/types";

const Index = () => {
  // Application state
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [outputDirectory, setOutputDirectory] = useState<string>("/output");
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [dropdownOptions, setDropdownOptions] = useState<{ [key: string]: string[] }>({});
  const [loadingDropdowns, setLoadingDropdowns] = useState<{ [key: string]: boolean }>({});
  
  // Global configuration
  const [globalConfig, setGlobalConfig] = useState<any>({});
  const [apiService, setApiService] = useState<ApiService | null>(null);
  
  // Job execution state
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [lastExportPath, setLastExportPath] = useState<string>();
  const [recordCount, setRecordCount] = useState<number>();

  // Column modification state
  const [addColumn, setAddColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnValue, setNewColumnValue] = useState("");
  const [modifyColumn, setModifyColumn] = useState(false);
  const [modifyColumnName, setModifyColumnName] = useState("");
  const [modifyColumnValue, setModifyColumnValue] = useState("");

  const { toast } = useToast();

  // Initialize application
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Load global configuration
      await GlobalConfigService.preloadConfigs();
      const config = await GlobalConfigService.getDefaultApiConfig();
      setGlobalConfig(config);
      
      // Initialize API service with global config
      if (config.base_url) {
        const apiConfig: ApiConfig = {
          base_url: config.base_url,
          config: config.config_name,
          timeout: config.timeout,
          retry_count: 3,
          retry_delay: 1
        };
        
        // For now, we'll need user credentials - this will be handled by the auth system
        const userCredentials: UserCredentials = {
          username: "", // Will be set when user configures
          password: ""
        };
        
        // Don't initialize API service until user provides credentials
        addLog("info", "Application initialized with global configuration");
        addLog("info", `Default server: ${config.base_url}`);
        addLog("info", `Default config: ${config.config_name}`);
      }
      
      // Load jobs from cloud
      await loadJobsFromCloud();
      
    } catch (error: any) {
      addLog("error", `Failed to initialize application: ${error.message}`);
    }
  };

  const loadJobsFromCloud = async () => {
    try {
      const cloudJobs = await CloudDatabaseService.getJobs();
      if (cloudJobs.length > 0) {
        setJobs(cloudJobs);
        addLog("success", `Loaded ${cloudJobs.length} jobs from cloud storage`);
      } else {
        // Load default jobs if none in cloud
        const defaultJobs = getDefaultJobs();
        setJobs(defaultJobs);
        addLog("info", "Using default job configurations");
      }
    } catch (error: any) {
      addLog("warning", `Could not load jobs from cloud: ${error.message}`);
      // Fallback to default jobs
      const defaultJobs = getDefaultJobs();
      setJobs(defaultJobs);
    }
  };

  const getDefaultJobs = (): Job[] => {
    return [
      {
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
      }
    ];
  };

  // Helper function to add logs
  const addLog = (type: LogEntry["type"], message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
    console.log(`[${type.toUpperCase()}] ${message}`);
  };

  const handleJobSelect = (job: Job) => {
    setSelectedJob(job);
    // Reset filter values when job changes
    const initialValues: FilterValues = {};
    job.filterable_fields.forEach(field => {
      initialValues[field.name] = "";
    });
    setFilterValues(initialValues);
    setDropdownOptions({});
    
    addLog("info", `Selected job: ${job.job_name}`);
    addLog("info", `IDO Name: ${job.ido_name}`);
    addLog("info", `Properties: ${job.query_params.properties}`);
    
    // Load dropdown options for the new job
    if (apiService) {
      loadDropdownsForJob(job);
    }
  };

  const loadDropdownsForJob = async (job: Job) => {
    if (!apiService) {
      addLog("warning", "API service not available - cannot load dropdown options");
      return;
    }

    const dropdownFields = job.filterable_fields.filter(f => f.input_type === "dropdown");
    if (dropdownFields.length === 0) {
      addLog("info", "No dropdown fields configured for this job");
      return;
    }

    addLog("info", `Loading dropdown options for ${dropdownFields.length} fields...`);
    
    // Set loading state for all dropdown fields
    const loadingState: { [key: string]: boolean } = {};
    dropdownFields.forEach(field => {
      loadingState[field.name] = true;
    });
    setLoadingDropdowns(loadingState);

    // Load options for each dropdown field
    const optionsPromises = dropdownFields.map(async (field) => {
      addLog("info", `Loading options for field: ${field.name}`);
      
      const result = await apiService.getDistinctValues(
        job.ido_name,
        field.name,
        1000,
        field.cache_duration || 300
      );
      
      return {
        fieldName: field.name,
        options: result.values || [],
        error: result.error
      };
    });

    try {
      const results = await Promise.all(optionsPromises);
      const newOptions: { [key: string]: string[] } = {};
      
      results.forEach(result => {
        if (result.error) {
          addLog("warning", `Failed to load options for ${result.fieldName}: ${result.error}`);
          newOptions[result.fieldName] = [];
        } else {
          newOptions[result.fieldName] = result.options;
          addLog("success", `Loaded ${result.options.length} options for ${result.fieldName}`);
        }
      });

      setDropdownOptions(newOptions);
      addLog("success", "Dropdown options loaded successfully");
    } catch (error: any) {
      addLog("error", `Failed to load dropdown options: ${error.message}`);
    } finally {
      setLoadingDropdowns({});
    }
  };

  const handleRunJob = async () => {
    if (!selectedJob) {
      toast({
        title: "Cannot Run Job",
        description: "Please select a job first",
        variant: "destructive",
      });
      return;
    }

    if (!apiService) {
      toast({
        title: "API Not Configured",
        description: "Please configure your API connection first",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    addLog("info", `Starting job: ${selectedJob.job_name}`);
    
    try {
      // Build filter string
      const filterResult = FilterUtils.buildFiltersFromValues(selectedJob.filterable_fields, filterValues);
      if (filterResult.error) {
        addLog("error", filterResult.error);
        toast({
          title: "Filter Error",
          description: filterResult.error,
          variant: "destructive",
        });
        return;
      }

      if (filterResult.filter) {
        addLog("info", `Applied filters: ${filterResult.filter}`);
      } else {
        addLog("info", "No filters applied - fetching all records");
      }

      // Prepare API parameters
      const params: Record<string, string> = {};
      if (filterResult.filter) {
        params.filter = filterResult.filter;
      }

      // Make API call
      addLog("info", "Executing API request...");
      const result = await apiService.loadCollection(
        selectedJob.ido_name,
        selectedJob.query_params.properties,
        selectedJob.query_params.recordCap,
        params
      );

      if (result.error) {
        throw new Error(result.error);
      }

      if (!result.data || !result.data.Items) {
        throw new Error("No data received from API");
      }

      let items = result.data.Items;
      
      if (items.length === 0) {
        addLog("warning", "No records found matching the criteria");
        toast({
          title: "No Data",
          description: "No records found matching your filter criteria",
          variant: "destructive",
        });
        return;
      }

      addLog("success", `Retrieved ${items.length} records from API`);

      // Add custom column if requested
      if (addColumn && newColumnName.trim()) {
        items = items.map((item: any) => ({
          ...item,
          [newColumnName.trim()]: newColumnValue
        }));
        addLog("info", `Added custom column: ${newColumnName.trim()}`);
      }

      // Modify existing column if requested
      if (modifyColumn && modifyColumnName.trim()) {
        items = items.map((item: any) => ({
          ...item,
          [modifyColumnName.trim()]: modifyColumnValue
        }));
        addLog("info", `Modified column: ${modifyColumnName.trim()}`);
      }

      // Export data
      addLog("info", "Exporting data...");
      const exportResult = await ExportService.exportData(
        items,
        selectedJob.job_name,
        selectedJob.output_format,
        outputDirectory
      );

      setRecordCount(exportResult.recordCount);
      setLastExportPath(exportResult.filePath);
      
      addLog("success", `Successfully exported ${exportResult.recordCount} records`);
      addLog("info", `File saved: ${exportResult.filePath}`);
      
      // Save execution history to cloud
      await CloudDatabaseService.saveExecutionHistory(
        selectedJob.job_name,
        filterValues,
        exportResult.recordCount,
        exportResult.filePath,
        'success'
      );
      
      toast({
        title: "Export Complete!",
        description: `${exportResult.recordCount} records exported successfully`,
      });

    } catch (error: any) {
      addLog("error", `Export failed: ${error.message}`);
      
      // Save error to execution history
      if (selectedJob) {
        await CloudDatabaseService.saveExecutionHistory(
          selectedJob.job_name,
          filterValues,
          0,
          '',
          'error',
          error.message
        );
      }
      
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleTestConnection = async () => {
    if (!apiService) {
      toast({
        title: "Not Connected",
        description: "Please configure API connection first",
        variant: "destructive",
      });
      return;
    }

    addLog("info", "Testing API connection...");
    
    try {
      const result = await apiService.testConnection();
      
      if (result.success) {
        addLog("success", "API connection test successful");
        if (result.details) {
          addLog("info", `Connection details: ${JSON.stringify(result.details, null, 2)}`);
        }
        toast({
          title: "Connection Test",
          description: "✅ Successfully connected to the API!",
        });
      } else {
        addLog("error", `API connection test failed: ${result.error}`);
        toast({
          title: "Connection Failed",
          description: result.error || "Unable to connect to the API",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      addLog("error", `Connection test error: ${error.message}`);
      toast({
        title: "Connection Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const refreshDropdowns = async () => {
    if (!selectedJob || !apiService) return;
    
    addLog("info", "Refreshing dropdown options...");
    
    // Clear cache for current job
    apiService.clearCacheForIdo(selectedJob.ido_name);
    
    // Reload dropdown options
    await loadDropdownsForJob(selectedJob);
    
    addLog("success", "Dropdown options refreshed");
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const handleJobsSync = (syncedJobs: Job[]) => {
    setJobs(syncedJobs);
    addLog("success", `Synced ${syncedJobs.length} jobs from cloud`);
  };

  const handleSettingsSync = (settings: any) => {
    if (settings.output_dir) {
      setOutputDirectory(settings.output_dir);
    }
    addLog("success", "Settings synced from cloud");
  };

  // Get available columns for modification
  const availableColumns = selectedJob 
    ? selectedJob.query_params.properties.split(",").map(col => col.trim())
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/50 to-background p-6">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div className="animate-fade-in">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              IDO Data Extraction Tool
            </h1>
            <p className="text-muted-foreground">
              Extract and export data from Infor SyteLine systems
            </p>
          </div>
          <div className="flex gap-3 animate-slide-in">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              className="flex items-center gap-2"
              disabled={!apiService}
            >
              <TestTube className="w-4 h-4" />
              Test Connection
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column - Job Selection & Filters */}
        <div className="lg:col-span-1 space-y-6">
          <div className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <JobSelector
              jobs={jobs}
              selectedJob={selectedJob}
              onJobSelect={handleJobSelect}
              outputDirectory={outputDirectory}
              onOutputDirectoryChange={setOutputDirectory}
              onBrowseDirectory={() => {
                toast({
                  title: "Directory Selection",
                  description: "Files will be downloaded to your browser's default download folder",
                });
              }}
            />
          </div>

          {selectedJob && (
            <div className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <FilterPanel
                fields={selectedJob.filterable_fields}
                values={filterValues}
                onValuesChange={setFilterValues}
                onRefreshDropdowns={refreshDropdowns}
                dropdownOptions={dropdownOptions}
                loadingDropdowns={loadingDropdowns}
              />
            </div>
          )}

          {/* Column Modification Options */}
          {selectedJob && (
            <div className="space-y-4 animate-fade-in" style={{ animationDelay: "0.3s" }}>
              {/* Add Column */}
              <Card className="glass-card">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Settings className="w-5 h-5 text-primary" />
                    Add Custom Column
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="add-column"
                      checked={addColumn}
                      onCheckedChange={setAddColumn}
                    />
                    <Label htmlFor="add-column">Add new column to output</Label>
                  </div>
                  {addColumn && (
                    <div className="grid grid-cols-1 gap-3 animate-fade-in">
                      <div className="space-y-2">
                        <Label htmlFor="new-column-name">Column Name</Label>
                        <Input
                          id="new-column-name"
                          placeholder="Column name"
                          value={newColumnName}
                          onChange={(e) => setNewColumnName(e.target.value)}
                          className="bg-background/50 border-border/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-column-value">Value</Label>
                        <Input
                          id="new-column-value"
                          placeholder="Column value"
                          value={newColumnValue}
                          onChange={(e) => setNewColumnValue(e.target.value)}
                          className="bg-background/50 border-border/50"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Modify Column */}
              <Card className="glass-card">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Settings className="w-5 h-5 text-primary" />
                    Modify Existing Column
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="modify-column"
                      checked={modifyColumn}
                      onCheckedChange={setModifyColumn}
                    />
                    <Label htmlFor="modify-column">Modify existing column</Label>
                  </div>
                  {modifyColumn && (
                    <div className="grid grid-cols-1 gap-3 animate-fade-in">
                      <div className="space-y-2">
                        <Label htmlFor="modify-column-name">Column</Label>
                        <Select value={modifyColumnName} onValueChange={setModifyColumnName}>
                          <SelectTrigger className="bg-background/50 border-border/50">
                            <SelectValue placeholder="Select column..." />
                          </SelectTrigger>
                          <SelectContent className="glass-card border-border/50">
                            {availableColumns.map((col) => (
                              <SelectItem key={col} value={col}>
                                {col}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="modify-column-value">New Value</Label>
                        <Input
                          id="modify-column-value"
                          placeholder="New value"
                          value={modifyColumnValue}
                          onChange={(e) => setModifyColumnValue(e.target.value)}
                          className="bg-background/50 border-border/50"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Run Job Button */}
          {selectedJob && (
            <div className="animate-fade-in" style={{ animationDelay: "0.4s" }}>
              <Button
                variant="gradient"
                size="lg"
                onClick={handleRunJob}
                disabled={isRunning || !apiService}
                className="w-full"
              >
                {isRunning ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Running Job...
                  </div>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Run Data Extraction
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Middle Column - Output */}
        <div className="lg:col-span-2 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <OutputPanel
            logs={logs}
            isRunning={isRunning}
            lastExportPath={lastExportPath}
            recordCount={recordCount}
            onClearLogs={clearLogs}
          />
        </div>

        {/* Right Column - Cloud Sync */}
        <div className="lg:col-span-1 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <CloudSync
            onJobsSync={handleJobsSync}
            onSettingsSync={handleSettingsSync}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;