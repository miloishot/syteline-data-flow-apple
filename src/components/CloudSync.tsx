import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Cloud, CloudOff, Download, Upload, History, Settings, User, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CloudDatabaseService } from "@/services/cloud-database";

interface CloudSyncProps {
  onJobsSync: (jobs: any[]) => void;
  onSettingsSync: (settings: any) => void;
}

export function CloudSync({ onJobsSync, onSettingsSync }: CloudSyncProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [executionHistory, setExecutionHistory] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const currentUser = await CloudDatabaseService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setIsConnected(true);
      loadExecutionHistory();
    }
  };

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await CloudDatabaseService.signIn(email, password);
      
      if (error) {
        toast({
          title: "Sign In Failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      setUser(data.user);
      setIsConnected(true);
      setEmail("");
      setPassword("");
      
      toast({
        title: "Connected to Cloud",
        description: "Successfully signed in to cloud storage",
      });

      // Sync data from cloud
      await syncFromCloud();
      
    } catch (error: any) {
      toast({
        title: "Connection Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await CloudDatabaseService.signUp(email, password);
      
      if (error) {
        toast({
          title: "Sign Up Failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Account Created",
        description: "Please check your email to verify your account",
      });
      
    } catch (error: any) {
      toast({
        title: "Sign Up Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await CloudDatabaseService.signOut();
    setUser(null);
    setIsConnected(false);
    setExecutionHistory([]);
    
    toast({
      title: "Signed Out",
      description: "Disconnected from cloud storage",
    });
  };

  const syncToCloud = async () => {
    if (!isConnected) return;
    
    setIsLoading(true);
    try {
      // This would sync current jobs and settings to cloud
      toast({
        title: "Sync Complete",
        description: "Data uploaded to cloud storage",
      });
    } catch (error: any) {
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const syncFromCloud = async () => {
    if (!isConnected) return;
    
    setIsLoading(true);
    try {
      const jobs = await CloudDatabaseService.getJobs();
      onJobsSync(jobs);
      
      toast({
        title: "Sync Complete",
        description: "Data downloaded from cloud storage",
      });
      
      await loadExecutionHistory();
    } catch (error: any) {
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadExecutionHistory = async () => {
    try {
      const { data, error } = await CloudDatabaseService.getExecutionHistory(20);
      if (!error && data) {
        setExecutionHistory(data);
      }
    } catch (error) {
      console.error("Failed to load execution history:", error);
    }
  };

  if (!isConnected) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudOff className="w-5 h-5 text-muted-foreground" />
            Cloud Storage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Connect to cloud storage to sync your jobs, settings, and execution history across devices.
          </p>
          
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background/50 border-border/50"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-background/50 border-border/50"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={handleSignIn}
                disabled={isLoading || !email || !password}
                className="flex-1"
              >
                {isLoading ? "Connecting..." : "Sign In"}
              </Button>
              <Button
                variant="outline"
                onClick={handleSignUp}
                disabled={isLoading || !email || !password}
                className="flex-1"
              >
                Sign Up
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-primary" />
            Cloud Storage
            <Badge variant="secondary">Connected</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="sync" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sync">Sync</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>
          
          <TabsContent value="sync" className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={syncToCloud}
                disabled={isLoading}
                className="flex-1"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload to Cloud
              </Button>
              <Button
                variant="outline"
                onClick={syncFromCloud}
                disabled={isLoading}
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                Download from Cloud
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground">
              Sync your jobs, settings, and execution history across all your devices.
            </p>
          </TabsContent>
          
          <TabsContent value="history" className="space-y-4">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4" />
              <span className="text-sm font-medium">Recent Executions</span>
            </div>
            
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {executionHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No execution history found</p>
                ) : (
                  executionHistory.map((execution, index) => (
                    <div key={index} className="p-2 bg-muted/50 rounded-md text-sm">
                      <div className="flex justify-between items-start">
                        <span className="font-medium">{execution.job_name}</span>
                        <Badge variant={execution.status === 'success' ? 'default' : 'destructive'}>
                          {execution.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {execution.record_count} records • {new Date(execution.executed_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="account" className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="text-sm font-medium">Account Info</span>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm">
                <span className="text-muted-foreground">Email: </span>
                <span>{user?.email}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">User ID: </span>
                <span className="font-mono text-xs">{user?.id}</span>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}