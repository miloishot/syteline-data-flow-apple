import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Settings, 
  Users, 
  Database, 
  Shield, 
  Save, 
  Plus, 
  Edit, 
  Trash2,
  Globe,
  Crown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface GlobalConfig {
  id: string;
  config_key: string;
  config_value: any;
  description: string;
  is_public: boolean;
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  company: string;
  department: string;
  is_active: boolean;
  last_login: string;
  created_at: string;
}

interface AdminUser {
  id: string;
  user_id: string;
  role: string;
  permissions: any;
}

export function AdminPanel() {
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingConfig, setEditingConfig] = useState<GlobalConfig | null>(null);
  const [newConfigKey, setNewConfigKey] = useState("");
  const [newConfigValue, setNewConfigValue] = useState("");
  const [newConfigDescription, setNewConfigDescription] = useState("");
  const [newConfigIsPublic, setNewConfigIsPublic] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    loadGlobalConfig();
    loadUsers();
    loadAdminUsers();
  }, []);

  const loadGlobalConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('global_config')
        .select('*')
        .order('config_key');

      if (error) throw error;
      setGlobalConfig(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to load global config: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to load users: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const loadAdminUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdminUsers(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to load admin users: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const saveGlobalConfig = async (config: Partial<GlobalConfig>) => {
    setIsLoading(true);
    try {
      if (config.id) {
        // Update existing
        const { error } = await supabase
          .from('global_config')
          .update({
            config_key: config.config_key,
            config_value: config.config_value,
            description: config.description,
            is_public: config.is_public
          })
          .eq('id', config.id);
        
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('global_config')
          .insert({
            config_key: config.config_key!,
            config_value: config.config_value!,
            description: config.description,
            is_public: config.is_public
          });
        
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Global configuration updated successfully",
      });

      await loadGlobalConfig();
      setEditingConfig(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to save config: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addNewConfig = async () => {
    if (!newConfigKey.trim()) {
      toast({
        title: "Error",
        description: "Config key is required",
        variant: "destructive",
      });
      return;
    }

    let parsedValue;
    try {
      parsedValue = JSON.parse(newConfigValue);
    } catch {
      parsedValue = newConfigValue;
    }

    await saveGlobalConfig({
      config_key: newConfigKey,
      config_value: parsedValue,
      description: newConfigDescription,
      is_public: newConfigIsPublic
    });

    setNewConfigKey("");
    setNewConfigValue("");
    setNewConfigDescription("");
    setNewConfigIsPublic(false);
  };

  const deleteConfig = async (id: string) => {
    try {
      const { error } = await supabase
        .from('global_config')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Configuration deleted successfully",
      });

      await loadGlobalConfig();
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to delete config: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: !isActive })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `User ${!isActive ? 'activated' : 'deactivated'} successfully`,
      });

      await loadUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to update user status: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/50 to-background p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
                <Crown className="w-8 h-8 text-primary" />
                Admin Panel
              </h1>
              <p className="text-muted-foreground">
                Manage global configuration, users, and system settings
              </p>
            </div>
          </div>
        </header>

        <Tabs defaultValue="config" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Global Config
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              System
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  Global Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add New Config */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-2">
                    <Label>Config Key</Label>
                    <Input
                      placeholder="config_key"
                      value={newConfigKey}
                      onChange={(e) => setNewConfigKey(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Value (JSON)</Label>
                    <Input
                      placeholder='"value" or {"key": "value"}'
                      value={newConfigValue}
                      onChange={(e) => setNewConfigValue(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      placeholder="Description"
                      value={newConfigDescription}
                      onChange={(e) => setNewConfigDescription(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Actions</Label>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={newConfigIsPublic}
                        onCheckedChange={setNewConfigIsPublic}
                      />
                      <span className="text-sm">Public</span>
                      <Button onClick={addNewConfig} size="sm">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Config List */}
                <ScrollArea className="h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Key</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Public</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {globalConfig.map((config) => (
                        <TableRow key={config.id}>
                          <TableCell className="font-mono text-sm">{config.config_key}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {JSON.stringify(config.config_value)}
                          </TableCell>
                          <TableCell>{config.description}</TableCell>
                          <TableCell>
                            <Badge variant={config.is_public ? "default" : "secondary"}>
                              {config.is_public ? "Public" : "Private"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingConfig(config)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteConfig(config.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  User Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.full_name || "N/A"}</TableCell>
                          <TableCell>{user.company || "N/A"}</TableCell>
                          <TableCell>{user.department || "N/A"}</TableCell>
                          <TableCell>
                            <Badge variant={user.is_active ? "default" : "secondary"}>
                              {user.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleUserStatus(user.user_id, user.is_active)}
                            >
                              {user.is_active ? "Deactivate" : "Activate"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" />
                  System Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-semibold mb-2">Database Status</h3>
                    <p className="text-sm text-muted-foreground">Connected to Supabase</p>
                    <Badge className="mt-2">Online</Badge>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-semibold mb-2">Total Users</h3>
                    <p className="text-2xl font-bold">{users.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}