import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import axios from "axios";
import { API } from "@/App";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Save } from "lucide-react";

const AdminSettingsPage = ({ user, onLogout }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    // LDAP
    ldap_enabled: false,
    ldap_server: "",
    ldap_port: 389,
    ldap_use_ssl: false,
    ldap_base_dn: "",
    ldap_bind_dn: "",
    ldap_bind_password: "",
    ldap_user_filter: "(uid={username})",
    ldap_group_filter: "",
    // SMTP
    smtp_enabled: false,
    smtp_server: "",
    smtp_port: 587,
    smtp_username: "",
    smtp_password: "",
    smtp_from_email: "",
    smtp_use_tls: true,
    // School
    school_name: "MSO - Fortbildungssystem",
    school_logo_url: ""
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings`);
      setSettings(response.data);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Fehler beim Laden der Einstellungen");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings({
      ...settings,
      [field]: value
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/settings`, settings);
      toast.success("Einstellungen erfolgreich gespeichert");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error(error.response?.data?.detail || "Fehler beim Speichern der Einstellungen");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-slate-600">Lade Einstellungen...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="space-y-6" data-testid="admin-settings-page">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Systemeinstellungen</h1>
          <p className="text-slate-600 mt-2">Konfigurieren Sie LDAP, SMTP und Schulinformationen</p>
        </div>

        <Tabs defaultValue="ldap" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ldap">LDAP</TabsTrigger>
            <TabsTrigger value="smtp">SMTP</TabsTrigger>
            <TabsTrigger value="school">Schule</TabsTrigger>
          </TabsList>

          <TabsContent value="ldap" className="space-y-4">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle>LDAP-Konfiguration</CardTitle>
                <CardDescription>
                  Verbinden Sie das System mit Ihrem LDAP-Server für die Benutzerauthentifizierung
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="ldap_enabled" className="text-base font-medium">LDAP aktivieren</Label>
                    <p className="text-sm text-slate-500">Aktivieren Sie die LDAP-Authentifizierung</p>
                  </div>
                  <Switch
                    id="ldap_enabled"
                    checked={settings.ldap_enabled}
                    onCheckedChange={(checked) => handleChange("ldap_enabled", checked)}
                    data-testid="ldap-enabled-switch"
                  />
                </div>

                {settings.ldap_enabled && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="ldap_server">LDAP Server</Label>
                        <Input
                          id="ldap_server"
                          placeholder="ldap.schule.local"
                          value={settings.ldap_server}
                          onChange={(e) => handleChange("ldap_server", e.target.value)}
                          data-testid="ldap-server-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ldap_port">Port</Label>
                        <Input
                          id="ldap_port"
                          type="number"
                          value={settings.ldap_port}
                          onChange={(e) => handleChange("ldap_port", parseInt(e.target.value))}
                          data-testid="ldap-port-input"
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="ldap_use_ssl"
                        checked={settings.ldap_use_ssl}
                        onCheckedChange={(checked) => handleChange("ldap_use_ssl", checked)}
                      />
                      <Label htmlFor="ldap_use_ssl">SSL/TLS verwenden</Label>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ldap_base_dn">Basis-DN</Label>
                      <Input
                        id="ldap_base_dn"
                        placeholder="dc=schule,dc=local"
                        value={settings.ldap_base_dn}
                        onChange={(e) => handleChange("ldap_base_dn", e.target.value)}
                        data-testid="ldap-base-dn-input"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ldap_bind_dn">Bind-DN</Label>
                      <Input
                        id="ldap_bind_dn"
                        placeholder="cn=service,dc=schule,dc=local"
                        value={settings.ldap_bind_dn}
                        onChange={(e) => handleChange("ldap_bind_dn", e.target.value)}
                        data-testid="ldap-bind-dn-input"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ldap_bind_password">Bind-Passwort</Label>
                      <Input
                        id="ldap_bind_password"
                        type="password"
                        value={settings.ldap_bind_password}
                        onChange={(e) => handleChange("ldap_bind_password", e.target.value)}
                        data-testid="ldap-bind-password-input"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ldap_user_filter">Benutzer-Filter</Label>
                      <Input
                        id="ldap_user_filter"
                        placeholder="(uid={username})"
                        value={settings.ldap_user_filter}
                        onChange={(e) => handleChange("ldap_user_filter", e.target.value)}
                        data-testid="ldap-user-filter-input"
                      />
                      <p className="text-xs text-slate-500">Verwenden Sie {'{username}'} als Platzhalter</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ldap_group_filter">Gruppen-Filter (optional)</Label>
                      <Input
                        id="ldap_group_filter"
                        placeholder="cn=Lehrer,ou=groups,dc=schule,dc=local"
                        value={settings.ldap_group_filter}
                        onChange={(e) => handleChange("ldap_group_filter", e.target.value)}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="smtp" className="space-y-4">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle>SMTP-Konfiguration</CardTitle>
                <CardDescription>
                  Konfigurieren Sie den E-Mail-Versand für Benachrichtigungen
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="smtp_enabled" className="text-base font-medium">SMTP aktivieren</Label>
                    <p className="text-sm text-slate-500">Aktivieren Sie den E-Mail-Versand</p>
                  </div>
                  <Switch
                    id="smtp_enabled"
                    checked={settings.smtp_enabled}
                    onCheckedChange={(checked) => handleChange("smtp_enabled", checked)}
                    data-testid="smtp-enabled-switch"
                  />
                </div>

                {settings.smtp_enabled && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="smtp_server">SMTP Server</Label>
                        <Input
                          id="smtp_server"
                          placeholder="smtp.schule.de"
                          value={settings.smtp_server}
                          onChange={(e) => handleChange("smtp_server", e.target.value)}
                          data-testid="smtp-server-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="smtp_port">Port</Label>
                        <Input
                          id="smtp_port"
                          type="number"
                          value={settings.smtp_port}
                          onChange={(e) => handleChange("smtp_port", parseInt(e.target.value))}
                          data-testid="smtp-port-input"
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="smtp_use_tls"
                        checked={settings.smtp_use_tls}
                        onCheckedChange={(checked) => handleChange("smtp_use_tls", checked)}
                      />
                      <Label htmlFor="smtp_use_tls">TLS verwenden</Label>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="smtp_username">Benutzername</Label>
                      <Input
                        id="smtp_username"
                        value={settings.smtp_username}
                        onChange={(e) => handleChange("smtp_username", e.target.value)}
                        data-testid="smtp-username-input"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="smtp_password">Passwort</Label>
                      <Input
                        id="smtp_password"
                        type="password"
                        value={settings.smtp_password}
                        onChange={(e) => handleChange("smtp_password", e.target.value)}
                        data-testid="smtp-password-input"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="smtp_from_email">Absender-E-Mail</Label>
                      <Input
                        id="smtp_from_email"
                        type="email"
                        placeholder="fortbildung@schule.de"
                        value={settings.smtp_from_email}
                        onChange={(e) => handleChange("smtp_from_email", e.target.value)}
                        data-testid="smtp-from-email-input"
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="school" className="space-y-4">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle>Schulinformationen</CardTitle>
                <CardDescription>
                  Passen Sie die Schulinformationen an
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="school_name">Schulname</Label>
                  <Input
                    id="school_name"
                    placeholder="MSO - Fortbildungssystem"
                    value={settings.school_name}
                    onChange={(e) => handleChange("school_name", e.target.value)}
                    data-testid="school-name-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="school_logo_url">Logo-URL (optional)</Label>
                  <Input
                    id="school_logo_url"
                    placeholder="https://example.com/logo.png"
                    value={settings.school_logo_url}
                    onChange={(e) => handleChange("school_logo_url", e.target.value)}
                    data-testid="school-logo-url-input"
                  />
                  <p className="text-xs text-slate-500">URL zu einem öffentlich zugänglichen Schullogo</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="save-settings-button"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Speichern..." : "Einstellungen speichern"}
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default AdminSettingsPage;
