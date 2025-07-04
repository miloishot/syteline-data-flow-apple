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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Settings, 
  Users, 
  Database, 
  Shield, 
  Save, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  Server,
  Globe,
  UserPlus,
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
  email: string;
  is_active: boolean;
  last_login: string;
  created_at: string;
}

interface AdminUser {
  id: string;
  user_id: string;
  role: string;
  permissions: any;
  email: string;
  full_name: string;
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
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminRole, setNewAdminRole] = useState("admin");
  
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
        .select(`
          *,
          user:auth.users(email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const usersWithEmail = data?.map(profile => ({
        ...profile,
        email: profile.user?.email || 'N/A'
      })) || [];
      
      setUsers(usersWithEmail);
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
        .select(`
          *,
          user:auth.users(email),
          profile:user_profiles(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const adminsWithDetails = data?.map(admin => ({
        ...admin,
        email: admin.user?.email || 'N/A',
        full_name: admin.profile?.full_name || 'N/A'
      })) || [];
      
      setAdminUsers(adminsWithDetails);
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
      const { error } = await supabase
        .from('global_config')
        .upsert({
          ...config,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

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

  const addAdminUser = async () => {
    if (!newAdminEmail.trim()) {
      toast({
        title: "Error",
        description: "Email is required",
        variant: "destructive",
      });
      return;
    }

    try {
      // First, find the user by email
      const { data: userData, error: userError } = await supabase
        .from('auth.users')
        .select('id')
        .eq('email', newAdminEmail)
        .single();

      if (userError) {
        toast({
          title: "Error",
          description: "User not found with that email",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('admin_users')
        .insert({
          user_id: userData.id,
          role: newAdminRole,
          permissions: {}
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Admin user added successfully",
      });

      setNewAdminEmail("");
      setNewAdminRole("admin");
      setShowAddAdmin(false);
      await loadAdminUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to add admin user: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const removeAdminUser = async (adminId: string) => {
    try {
      const { error } = await supabase
        .from('admin_users')
        .delete()
        .eq('id', adminId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Admin user removed successfully",
      });

      await loadAdminUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to remove admin user: ${error.message}`,
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Global Config
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="admins" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Admins
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
                        <TableHead>Email</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>{user.full_name || 'N/A'}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.company || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant={user.is_active ? "default" : "secondary"}>
                              {user.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleUserStatus(user.user_id, user.is_active)}
                            >
                              {user.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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

          <TabsContent value="admins" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Admin Users
                  </div>
                  <Dialog open={showAddAdmin} onOpenChange={setShowAddAdmin}>
                    <DialogTrigger asChild>
                      <Button>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add Admin
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Admin User</DialogTitle>
                        <DialogDescription>
                          Grant admin privileges to an existing user
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>User Email</Label>
                          <Input
                            placeholder="user@example.com"
                            value={newAdminEmail}
                            onChange={(e) => setNewAdminEmail(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Role</Label>
                          <Select value={newAdminRole} onValueChange={setNewAdminRole}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="moderator">Moderator</SelectItem>
                              <SelectItem value="super_admin">Super Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={addAdminUser} className="flex-1">
                            Add Admin
                          </Button>
                          <Button variant="outline" onClick={() => setShowAddAdmin(false)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminUsers.map((admin) => (
                      <TableRow key={admin.id}>
                        <TableCell>{admin.full_name}</TableCell>
                        <TableCell>{admin.email}</TableCell>
                        <TableCell>
                          <Badge variant={admin.role === 'super_admin' ? 'default' : 'secondary'}>
                            {admin.role.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(admin.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAdminUser(admin.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="w-5 h-5 text-primary" />
                    System Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Database Status</span>
                    <Badge variant="default">Connected</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Users</span>
                    <span>{users.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Users</span>
                    <span>{users.filter(u => u.is_active).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Admin Users</span>
                    <span>{adminUsers.length}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="w-full" onClick={loadGlobalConfig}>
                    Refresh Configuration
                  </Button>
                  <Button className="w-full" onClick={loadUsers}>
                    Refresh Users
                  </Button>
                  <Button className="w-full" variant="outline">
                    Export System Data
                  </Button>
                  <Button className="w-full" variant="outline">
                    View System Logs
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Config Modal */}
        {editingConfig && (
          <Dialog open={!!editingConfig} onOpenChange={() => setEditingConfig(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Configuration</DialogTitle>
                <DialogDescription>
                  Modify the global configuration setting
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Key</Label>
                  <Input value={editingConfig.config_key} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Value (JSON)</Label>
                  <Textarea
                    value={JSON.stringify(editingConfig.config_value, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        setEditingConfig({
                          ...editingConfig,
                          config_value: parsed
                        });
                      } catch {
                        // Invalid JSON, keep as string
                        setEditingConfig({
                          ...editingConfig,
                          config_value: e.target.value
                        });
                      }
                    }}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={editingConfig.description}
                    onChange={(e) => setEditingConfig({
                      ...editingConfig,
                      description: e.target.value
                    })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={editingConfig.is_public}
                    onCheckedChange={(checked) => setEditingConfig({
                      ...editingConfig,
                      is_public: checked
                    })}
                  />
                  <Label>Public (visible to all users)</Label>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => saveGlobalConfig(editingConfig)}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setEditingConfig(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}