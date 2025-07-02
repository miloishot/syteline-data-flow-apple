import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LoginForm } from "@/components/LoginForm";
import { JobSelector } from "@/components/JobSelector";
import { FilterPanel } from "@/components/FilterPanel";
import { OutputPanel } from "@/components/OutputPanel";
import { ConfigurationModal } from "@/components/ConfigurationModal";
import { Play, Settings, TestTube, LogOut, Plus, Edit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Import all our services
import { CredentialsService } from "@/services/encryption";
import { ApiService } from "@/services/api";
import { JobService, SettingsService } from "@/services/storage";
import { ExportService, FilterUtils } from "@/services/export";
import type { Job, LogEntry, FilterValues, ApiConfig, UserCredentials } from "@/types";

const Index = () => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [apiService, setApiService] = useState<ApiService | null>(null);
  const [currentCredentials, setCurrentCredentials] = useState<{ api: ApiConfig; user: UserCredentials } | null>(null);

  // Application state
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [outputDirectory, setOutputDirectory] = useState<string>(() => 
    SettingsService.getSetting("output_dir", "/output")
  );
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [dropdownOptions, setDropdownOptions] = useState<{ [key: string]: string[] }>({});
  const [loadingDropdowns, setLoadingDropdowns] = useState<{ [key: string]: boolean }>({});
  
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

  // Initialize jobs on component mount
  useEffect(() => {
    const loadedJobs = JobService.getJobs();
    setJobs(loadedJobs);
  }, []);

  // Helper function to add logs
  const addLog = (type: LogEntry["type"], message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
    console.log(`[${type.toUpperCase()}] ${message}`);
  };

  // Handle opening configuration modal
  const handleOpenConfig = () => {
    console.log("Opening configuration modal");
    setShowConfigModal(true);
  };

  // Handle closing configuration modal
  const handleCloseConfig = () => {
    console.log("Closing configuration modal");
    setShowConfigModal(false);
  };

  // Updated authentication - the password field should be the ENCRYPTION password, not user password
  const handleLogin = async (credentials: { username: string; password: string }) => {
    setIsLoggingIn(true);
    
    try {
      // Check if credentials exist
      if (!CredentialsService.hasCredentials()) {
        throw new Error("No configuration found. Please configure your connection first.");
      }

      // The password field in the login form is actually the ENCRYPTION password
      const encryptionPassword = credentials.password;
      
      // Try to load encrypted credentials using the encryption password
      addLog("info", "Loading encrypted credentials...");
      const decryptedCredentials = await CredentialsService.loadCredentials(encryptionPassword);
      
      // Verify username matches the stored username
      if (decryptedCredentials.user.username !== credentials.username) {
        throw new Error("Username does not match stored credentials");
      }

      addLog("info", `Loaded credentials for user: ${decryptedCredentials.user.username}`);
      addLog("info", `API Base URL: ${decryptedCredentials.api.base_url}`);
      addLog("info", `API Config: ${decryptedCredentials.api.config}`);

      // Create API service instance with the decrypted credentials
      const api = new ApiService(decryptedCredentials.api, decryptedCredentials.user);
      
      // Test connection using the actual user credentials (not encryption password)
      addLog("info", "Testing API connection...");
      const testResult = await api.testConnection();
      
      if (!testResult.success) {
        addLog("error", `Connection test failed: ${testResult.error}`);
        if (testResult.details) {
          addLog("info", `Test details: ${JSON.stringify(testResult.details, null, 2)}`);
        }
        throw new Error(testResult.error || "Connection test failed");
      }

      setApiService(api);
      setCurrentCredentials(decryptedCredentials);
      setIsAuthenticated(true);
      
      addLog("success", "Successfully authenticated and connected to IDO system");
      toast({
        title: "Welcome back!",
        description: "Successfully connected to IDO system",
      });
    } catch (error: any) {
      console.error("Login error:", error);
      addLog("error", `Authentication failed: ${error.message}`);
      
      // Provide more helpful error messages
      let errorMessage = error.message;
      if (error.message.includes("Failed to load credentials")) {
        errorMessage = "Invalid encryption password. Please enter the password you used when configuring the connection.";
      } else if (error.message.includes("Username does not match")) {
        errorMessage = "Username does not match the configured credentials. Please check your username.";
      } else if (error.message.includes("Network error") || error.message.includes("Failed to fetch")) {
        errorMessage = "Cannot reach the API server. Please check:\n• Server URL is correct\n• Server is running\n• Network connection\n• Firewall settings";
      }
      
      toast({
        title: "Authentication Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setApiService(null);
    setCurrentCredentials(null);
    setSelectedJob(null);
    setFilterValues({});
    setLogs([]);
    setDropdownOptions({});
    toast({
      title: "Logged out",
      description: "Session ended successfully",
    });
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
    
    // Load dropdown options for the new job
    loadDropdownsForJob(job);
  };

  const loadDropdownsForJob = async (job: Job) => {
    if (!apiService) return;

    const dropdownFields = job.filterable_fields.filter(f => f.input_type === "dropdown");
    if (dropdownFields.length === 0) return;

    addLog("info", "Loading dropdown options...");
    
    // Set loading state for all dropdown fields
    const loadingState: { [key: string]: boolean } = {};
    dropdownFields.forEach(field => {
      loadingState[field.name] = true;
    });
    setLoadingDropdowns(loadingState);

    // Load options for each dropdown field
    const optionsPromises = dropdownFields.map(async (field) => {
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
          addLog("info", `Loaded ${result.options.length} options for ${result.fieldName}`);
        }
      });

      setDropdownOptions(newOptions);
    } catch (error: any) {
      addLog("error", `Failed to load dropdown options: ${error.message}`);
    } finally {
      setLoadingDropdowns({});
    }
  };

  const handleRunJob = async () => {
    if (!selectedJob || !apiService) {
      toast({
        title: "Cannot Run Job",
        description: "Please select a job and ensure you're connected",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    addLog("info", `Starting job: ${selectedJob.job_name}`);
    
    try {
      // Build filter string using the same logic as Python
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
      
      // Save output directory setting
      SettingsService.saveSetting("output_dir", outputDirectory);
      
      toast({
        title: "Export Complete!",
        description: `${exportResult.recordCount} records exported successfully`,
      });

    } catch (error: any) {
      addLog("error", `Export failed: ${error.message}`);
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
        description: "Please login first",
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
        if (result.details) {
          addLog("info", `Test details: ${JSON.stringify(result.details, null, 2)}`);
        }
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

  const handleSaveConfiguration = async (configData: any) => {
    try {
      addLog("info", "Saving configuration...");
      addLog("info", `API Base URL: ${configData.api.base_url}`);
      addLog("info", `API Config: ${configData.api.config}`);
      addLog("info", `Username: ${configData.user.username}`);
      
      // Convert the config data to the format expected by our services
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

      // Save encrypted credentials
      await CredentialsService.saveCredentials(credentials, configData.security.encryption_password);
      
      addLog("success", "Configuration saved successfully");
      
      toast({
        title: "Configuration Saved",
        description: "Your API configuration has been saved securely. You can now log in using your username and the encryption password you just set.",
      });
    } catch (error: any) {
      addLog("error", `Failed to save configuration: ${error.message}`);
      throw error; // Re-throw so the modal can handle it
    }
  };

  // Get available columns for modification
  const availableColumns = selectedJob 
    ? selectedJob.query_params.properties.split(",").map(col => col.trim())
    : [];

  if (!isAuthenticated) {
    return (
      <>
        <LoginForm 
          onLogin={handleLogin} 
          onOpenConfig={handleOpenConfig}
          isLoading={isLoggingIn}
        />
        
        {/* Configuration Modal - Always render but control visibility with isOpen */}
        <ConfigurationModal
          isOpen={showConfigModal}
          onClose={handleCloseConfig}
          onSave={handleSaveConfiguration}
          initialConfig={currentCredentials ? {
            api: {
              ...currentCredentials.api,
              timeout: currentCredentials.api.timeout.toString(),
              retry_count: currentCredentials.api.retry_count.toString(),
              retry_delay: currentCredentials.api.retry_delay.toString(),
            },
            user: currentCredentials.user
          } : undefined}
        />
      </>
    );
  }

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
            <Button
              variant="ghost"
              onClick={handleOpenConfig}
              className="flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Button>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Job Selection & Filters */}
        <div className="lg:col-span-1 space-y-6">
          <div className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <JobSelector
              jobs={jobs}
              selectedJob={selectedJob}
              onJobSelect={handleJobSelect}
              outputDirectory={outputDirectory}
              onOutputDirectoryChange={(dir) => {
                setOutputDirectory(dir);
                SettingsService.saveSetting("output_dir", dir);
              }}
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
                    <Plus className="w-5 h-5 text-primary" />
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
                    <div className="grid grid-cols-2 gap-3 animate-fade-in">
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
                    <Edit className="w-5 h-5 text-primary" />
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
                    <div className="grid grid-cols-2 gap-3 animate-fade-in">
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

        {/* Right Column - Output */}
        <div className="lg:col-span-2 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <OutputPanel
            logs={logs}
            isRunning={isRunning}
            lastExportPath={lastExportPath}
            recordCount={recordCount}
            onClearLogs={clearLogs}
          />
        </div>
      </div>

      {/* Configuration Modal - Always render but control visibility with isOpen */}
      <ConfigurationModal
        isOpen={showConfigModal}
        onClose={handleCloseConfig}
        onSave={handleSaveConfiguration}
        initialConfig={currentCredentials ? {
          api: {
            ...currentCredentials.api,
            timeout: currentCredentials.api.timeout.toString(),
            retry_count: currentCredentials.api.retry_count.toString(),
            retry_delay: currentCredentials.api.retry_delay.toString(),
          },
          user: currentCredentials.user
        } : undefined}
      />
    </div>
  );
};

export default Index;