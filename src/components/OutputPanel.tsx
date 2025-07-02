import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Terminal, Download, FileText, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LogEntry {
  timestamp: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
}

interface OutputPanelProps {
  logs: LogEntry[];
  isRunning: boolean;
  lastExportPath?: string;
  recordCount?: number;
  onClearLogs: () => void;
}

export function OutputPanel({ 
  logs, 
  isRunning, 
  lastExportPath, 
  recordCount,
  onClearLogs 
}: OutputPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const copyPath = () => {
    if (lastExportPath) {
      navigator.clipboard.writeText(lastExportPath);
      toast({
        title: "Copied!",
        description: "File path copied to clipboard",
      });
    }
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case "success":
        return "✅";
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      default:
        return "ℹ️";
    }
  };

  const getLogColor = (type: string) => {
    switch (type) {
      case "success":
        return "text-green-600";
      case "error":
        return "text-red-600";
      case "warning":
        return "text-yellow-600";
      default:
        return "text-blue-600";
    }
  };

  return (
    <Card className="glass-card hover-glow h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-primary" />
          <CardTitle>Execution Output</CardTitle>
          {isRunning && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              Running...
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {lastExportPath && (
            <Button
              variant="ghost"
              size="sm"
              onClick={copyPath}
              className="h-8"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Path
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearLogs}
            className="h-8"
          >
            Clear
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0">
        {/* Export Summary */}
        {lastExportPath && recordCount !== undefined && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg animate-fade-in">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <Download className="w-4 h-4" />
              <span className="font-medium">Export Completed</span>
            </div>
            <div className="mt-1 text-sm text-green-600 dark:text-green-400">
              {recordCount} records exported successfully
            </div>
            <div className="mt-1 text-xs text-green-600/80 dark:text-green-400/80 font-mono break-all">
              {lastExportPath}
            </div>
          </div>
        )}

        {/* Logs */}
        <ScrollArea className="flex-1 custom-scrollbar" ref={scrollRef}>
          <div className="space-y-2 p-2 font-mono text-sm">
            {logs.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No output yet. Run a job to see results here.</p>
              </div>
            ) : (
              logs.map((log, index) => (
                <div
                  key={index}
                  className={`flex gap-2 p-2 rounded-md bg-muted/30 animate-fade-in ${getLogColor(log.type)}`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <span className="shrink-0">{getLogIcon(log.type)}</span>
                  <span className="text-xs text-muted-foreground shrink-0 min-w-0">
                    [{log.timestamp}]
                  </span>
                  <span className="break-words flex-1">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}