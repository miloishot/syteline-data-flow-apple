import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileText, FolderOpen, Database, Filter } from "lucide-react";

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

interface JobSelectorProps {
  jobs: Job[];
  selectedJob: Job | null;
  onJobSelect: (job: Job) => void;
  outputDirectory: string;
  onOutputDirectoryChange: (dir: string) => void;
  onBrowseDirectory: () => void;
}

export function JobSelector({
  jobs,
  selectedJob,
  onJobSelect,
  outputDirectory,
  onOutputDirectoryChange,
  onBrowseDirectory
}: JobSelectorProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (selectedJob) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [selectedJob]);

  return (
    <Card className="glass-card hover-glow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" />
          Job Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Job Selection */}
        <div className="space-y-2">
          <Label htmlFor="job-select" className="text-sm font-medium">
            Select Data Extraction Job
          </Label>
          <Select
            value={selectedJob?.job_name || ""}
            onValueChange={(value) => {
              const job = jobs.find(j => j.job_name === value);
              if (job) onJobSelect(job);
            }}
          >
            <SelectTrigger className="h-12 bg-background/50 border-border/50 focus:bg-background transition-all duration-300">
              <SelectValue placeholder="Choose a job..." />
            </SelectTrigger>
            <SelectContent className="glass-card border-border/50">
              {jobs.map((job) => (
                <SelectItem key={job.job_name} value={job.job_name} className="hover:bg-accent/50">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>{job.job_name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Job Details */}
        {selectedJob && (
          <div className={`space-y-4 animate-fade-in ${isAnimating ? 'animate-slide-in' : ''}`}>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Database className="w-3 h-3" />
                IDO: {selectedJob.ido_name}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                Format: {selectedJob.output_format.toUpperCase()}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Filter className="w-3 h-3" />
                Filters: {selectedJob.filterable_fields.length}
              </Badge>
            </div>

            {/* Properties Preview */}
            <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
              <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                Data Columns
              </Label>
              <p className="text-sm font-mono text-foreground/80 break-words">
                {selectedJob.query_params.properties}
              </p>
            </div>
          </div>
        )}

        {/* Output Directory */}
        <div className="space-y-2">
          <Label htmlFor="output-dir" className="text-sm font-medium">
            Output Directory
          </Label>
          <div className="flex gap-2">
            <Input
              id="output-dir"
              type="text"
              placeholder="Select output directory..."
              value={outputDirectory}
              onChange={(e) => onOutputDirectoryChange(e.target.value)}
              className="h-12 bg-background/50 border-border/50 focus:bg-background transition-all duration-300"
            />
            <Button
              variant="outline"
              size="default"
              onClick={onBrowseDirectory}
              className="h-12 px-4"
            >
              <FolderOpen className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}