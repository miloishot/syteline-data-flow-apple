import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LoginForm } from "@/components/LoginForm";
import { JobSelector } from "@/components/JobSelector";
import { FilterPanel } from "@/components/FilterPanel";
import { OutputPanel } from "@/components/OutputPanel";
import { ConfigurationModal } from "@/components/ConfigurationModal";
import { Play, Settings, TestTube, LogOut, Plus, Edit, FileDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Types
interface Job {
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

interface LogEntry {
  timestamp: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
}

interface FilterValues {
  [key: string]: string;
}

// Mock data for demonstration
const mockJobs: Job[] = [
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
  },
  {
    job_name: "Inventory_Report",
    ido_name: "OPSIT_Inventory",
    query_params: {
      properties: "Item,Description,QtyOnHand,Location,UOM,LastUpdated",
      recordCap: 500
    },
    output_format: "xlsx",
    filterable_fields: [
      {
        name: "Location",
        prompt: "Select Location",
        type: "string",
        operator: "=",
        input_type: "dropdown"
      },
      {
        name: "Item",
        prompt: "Item Number",
        type: "string",
        operator: "LIKE",
        input_type: "text"
      }
    ]
  }
];

const mockDropdownOptions = {
  "Lot": ["LOT001", "LOT002", "LOT003", "LOT004", "LOT005"],
  "RcvrNum": ["RCV001", "RCV002", "RCV003", "RCV004"],
  "Location": ["MAIN", "WAREHOUSE", "STAGING", "SHIPPING"]
};

const Index = () => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Application state
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [outputDirectory, setOutputDirectory] = useState("/output");
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [dropdownOptions, setDropdownOptions] = useState(mockDropdownOptions);
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

  // Mock authentication
  const handleLogin = async (credentials: { username: string; password: string }) => {
    setIsLoggingIn(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (credentials.username === "demo" && credentials.password === "demo") {
      setIsAuthenticated(true);
      toast({
        title: "Welcome back!",
        description: "Successfully connected to IDO system",
      });
    } else {
      toast({
        title: "Authentication Failed",
        description: "Invalid username or password",
        variant: "destructive",
      });
    }
    setIsLoggingIn(false);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setSelectedJob(null);
    setFilterValues({});
    setLogs([]);
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
    
    addLog("info", `Selected job: ${job.job_name}`);
  };

  const addLog = (type: LogEntry["type"], message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
  };

  const handleRunJob = async () => {
    if (!selectedJob) {
      toast({
        title: "No Job Selected",
        description: "Please select a job before running",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    addLog("info", `Starting job: ${selectedJob.job_name}`);
    
    // Build filter string
    const activeFilters = Object.entries(filterValues)
      .filter(([_, value]) => value.trim() !== "")
      .map(([key, value]) => `${key} = '${value}'`);
    
    if (activeFilters.length > 0) {
      addLog("info", `Applied filters: ${activeFilters.join(", ")}`);
    } else {
      addLog("info", "No filters applied - fetching all records");
    }

    // Simulate API call
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockRecordCount = Math.floor(Math.random() * 500) + 50;
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const mockPath = `${outputDirectory}/${selectedJob.job_name}_${timestamp}.${selectedJob.output_format}`;
      
      setRecordCount(mockRecordCount);
      setLastExportPath(mockPath);
      addLog("success", `Successfully exported ${mockRecordCount} records`);
      addLog("info", `File saved: ${mockPath}`);
      
      toast({
        title: "Export Complete!",
        description: `${mockRecordCount} records exported successfully`,
      });
    } catch (error) {
      addLog("error", `Export failed: ${error}`);
      toast({
        title: "Export Failed",
        description: "An error occurred during export",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleTestConnection = async () => {
    addLog("info", "Testing API connection...");
    
    // Simulate connection test
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const success = Math.random() > 0.3; // 70% success rate for demo
    
    if (success) {
      addLog("success", "API connection successful");
      toast({
        title: "Connection Test",
        description: "✅ Successfully connected to the API!",
      });
    } else {
      addLog("error", "API connection failed");
      toast({
        title: "Connection Failed",
        description: "Unable to connect to the API",
        variant: "destructive",
      });
    }
  };

  const refreshDropdowns = async () => {
    if (!selectedJob) return;
    
    addLog("info", "Refreshing dropdown options...");
    
    // Simulate loading for each dropdown field
    const dropdownFields = selectedJob.filterable_fields.filter(f => f.input_type === "dropdown");
    const loadingState: { [key: string]: boolean } = {};
    
    dropdownFields.forEach(field => {
      loadingState[field.name] = true;
    });
    setLoadingDropdowns(loadingState);
    
    // Simulate API calls
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setLoadingDropdowns({});
    addLog("success", "Dropdown options refreshed");
  };

  const clearLogs = () => {
    setLogs([]);
  };

  // Get available columns for modification
  const availableColumns = selectedJob 
    ? selectedJob.query_params.properties.split(",").map(col => col.trim())
    : [];

  if (!isAuthenticated) {
    return (
      <LoginForm 
        onLogin={handleLogin} 
        onOpenConfig={() => setShowConfigModal(true)}
        isLoading={isLoggingIn}
      />
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
            >
              <TestTube className="w-4 h-4" />
              Test Connection
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowConfigModal(true)}
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
              jobs={mockJobs}
              selectedJob={selectedJob}
              onJobSelect={handleJobSelect}
              outputDirectory={outputDirectory}
              onOutputDirectoryChange={setOutputDirectory}
              onBrowseDirectory={() => {
                // In a real app, this would open a directory picker
                toast({
                  title: "Directory Browser",
                  description: "Directory picker would open here",
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
                disabled={isRunning}
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

      {/* Configuration Modal */}
      <ConfigurationModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onSave={async (config) => {
          // In a real app, save the configuration
          await new Promise(resolve => setTimeout(resolve, 1000));
          addLog("success", "Configuration saved successfully");
        }}
      />
    </div>
  );
};

export default Index;
