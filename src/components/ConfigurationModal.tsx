import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, Settings, Server, User, Shield, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ConfigData {
  api: {
    base_url: string;
    config: string;
    timeout: string;
    retry_count: string;
    retry_delay: string;
  };
  user: {
    username: string;
    password: string;
  };
  security: {
    encryption_password: string;
    confirm_password: string;
  };
}

interface ConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: ConfigData) => void;
  initialConfig?: Partial<ConfigData>;
}

export function ConfigurationModal({ 
  isOpen, 
  onClose, 
  onSave, 
  initialConfig 
}: ConfigurationModalProps) {
  const [config, setConfig] = useState<ConfigData>({
    api: {
      base_url: initialConfig?.api?.base_url || "",
      config: initialConfig?.api?.config || "",
      timeout: initialConfig?.api?.timeout || "30",
      retry_count: initialConfig?.api?.retry_count || "3",
      retry_delay: initialConfig?.api?.retry_delay || "1",
    },
    user: {
      username: initialConfig?.user?.username || "",
      password: initialConfig?.user?.password || "",
    },
    security: {
      encryption_password: "",
      confirm_password: "",
    }
  });

  const [showPasswords, setShowPasswords] = useState({
    user: false,
    encryption: false,
    confirm: false,
  });

  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const updateConfig = (section: keyof ConfigData, field: string, value: string) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const validateAndSave = async () => {
    // Validation
    const requiredFields = [
      config.api.base_url,
      config.api.config,
      config.user.username,
      config.user.password,
      config.security.encryption_password,
      config.security.confirm_password
    ];

    if (requiredFields.some(field => !field.trim())) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (config.security.encryption_password !== config.security.confirm_password) {
      toast({
        title: "Password Mismatch",
        description: "Encryption passwords do not match",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave(config);
      toast({
        title: "Configuration Saved",
        description: "Your settings have been saved successfully",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save configuration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card border-border/50 max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Settings className="w-6 h-6 text-primary" />
            API Configuration
          </DialogTitle>
          <DialogDescription>
            Configure your connection to the Infor SyteLine system
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="api" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="api" className="flex items-center gap-2">
              <Server className="w-4 h-4" />
              API Settings
            </TabsTrigger>
            <TabsTrigger value="user" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              User Account
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Security
            </TabsTrigger>
          </TabsList>

          <div className="max-h-96 overflow-y-auto custom-scrollbar pr-2">
            <TabsContent value="api" className="space-y-4">
              <Card className="border-border/50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">API Connection</CardTitle>
                  <CardDescription>
                    Configure the connection to your Infor SyteLine API endpoint
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="base_url">Base URL *</Label>
                      <Input
                        id="base_url"
                        placeholder="https://your-server/syteline"
                        value={config.api.base_url}
                        onChange={(e) => updateConfig('api', 'base_url', e.target.value)}
                        className="bg-background/50 border-border/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="config">Configuration *</Label>
                      <Input
                        id="config"
                        placeholder="Configuration name"
                        value={config.api.config}
                        onChange={(e) => updateConfig('api', 'config', e.target.value)}
                        className="bg-background/50 border-border/50"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="timeout">Timeout (s)</Label>
                      <Input
                        id="timeout"
                        type="number"
                        value={config.api.timeout}
                        onChange={(e) => updateConfig('api', 'timeout', e.target.value)}
                        className="bg-background/50 border-border/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="retry_count">Retry Count</Label>
                      <Input
                        id="retry_count"
                        type="number"
                        value={config.api.retry_count}
                        onChange={(e) => updateConfig('api', 'retry_count', e.target.value)}
                        className="bg-background/50 border-border/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="retry_delay">Retry Delay (s)</Label>
                      <Input
                        id="retry_delay"
                        type="number"
                        value={config.api.retry_delay}
                        onChange={(e) => updateConfig('api', 'retry_delay', e.target.value)}
                        className="bg-background/50 border-border/50"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="user" className="space-y-4">
              <Card className="border-border/50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">User Credentials</CardTitle>
                  <CardDescription>
                    Your SyteLine system login credentials
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username *</Label>
                    <Input
                      id="username"
                      placeholder="Your SyteLine username"
                      value={config.user.username}
                      onChange={(e) => updateConfig('user', 'username', e.target.value)}
                      className="bg-background/50 border-border/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user_password">Password *</Label>
                    <div className="relative">
                      <Input
                        id="user_password"
                        type={showPasswords.user ? "text" : "password"}
                        placeholder="Your SyteLine password"
                        value={config.user.password}
                        onChange={(e) => updateConfig('user', 'password', e.target.value)}
                        className="bg-background/50 border-border/50 pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('user')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPasswords.user ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-4">
              <Card className="border-border/50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Encryption Settings</CardTitle>
                  <CardDescription>
                    Set a password to encrypt your stored credentials
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="enc_password">Encryption Password *</Label>
                    <div className="relative">
                      <Input
                        id="enc_password"
                        type={showPasswords.encryption ? "text" : "password"}
                        placeholder="Choose a strong encryption password"
                        value={config.security.encryption_password}
                        onChange={(e) => updateConfig('security', 'encryption_password', e.target.value)}
                        className="bg-background/50 border-border/50 pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('encryption')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPasswords.encryption ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm_password">Confirm Password *</Label>
                    <div className="relative">
                      <Input
                        id="confirm_password"
                        type={showPasswords.confirm ? "text" : "password"}
                        placeholder="Confirm your encryption password"
                        value={config.security.confirm_password}
                        onChange={(e) => updateConfig('security', 'confirm_password', e.target.value)}
                        className="bg-background/50 border-border/50 pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('confirm')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
                    <p className="text-sm text-muted-foreground">
                      💡 <strong>Security Note:</strong> This password will be used to encrypt your API credentials locally. 
                      Choose a strong password and remember it - you'll need it to access the application.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border/50">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            variant="gradient"
            onClick={validateAndSave}
            disabled={isSaving}
            className="min-w-24"
          >
            {isSaving ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Saving...
              </div>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Configuration
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}