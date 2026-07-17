import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import axios from "axios";
import { API } from "@/App";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Save, TestTube, Upload, Image as ImageIcon, CheckCircle2, XCircle } from "lucide-react";

const AdminSettingsPage = ({ user, onLogout }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testDialog, setTestDialog] = useState({ open: false, type: null });
  const [testCredentials, setTestCredentials] = useState({ username: "", password: "", email: "" });
  const [updatingSystem, setUpdatingSystem] = useState(false);
  const [updateLogs, setUpdateLogs] = useState("");
  const [updateStatus, setUpdateStatus] = useState("idle");
  const [isPolling, setIsPolling] = useState(false);
  const terminalEndRef = useRef(null);
  const fileInputRef = useRef(null);

  
  const [settings, setSettings] = useState({
    // LDAP
    ldap_enabled: false,
    ldap_server: "",
    ldap_port: 389,
    ldap_use_ssl: false,
    ldap_base_dn: "",
    ldap_bind_dn: "",
    ldap_bind_password: "",
    ldap_group_filter: "",
    ldap_user_attr: "sAMAccountName",
    ldap_mail_attr: "mail",
    ldap_display_attr: "displayName",
    ldap_upn_suffix: "",
    // SMTP
    smtp_enabled: false,
    smtp_server: "",
    smtp_port: 587,
    smtp_username: "",
    smtp_password: "",
    smtp_from_email: "",
    smtp_from_name: "MSO Fortbildungssystem",
    smtp_use_tls: true,
    // JWT SSO
    jwt_sso_enabled: false,
    jwt_sso_secret: "",
    jwt_sso_url: "",
    // School
    school_name: "MSO - Fortbildungssystem",
    school_logo_base64: "",
    logout_text: "Abmelden",
    logout_url: ""
  });


  useEffect(() => {
    fetchSettings();
    
    // Check initial update status
    const checkInitialStatus = async () => {
      try {
        const response = await axios.get(`${API}/settings/update-status`);
        setUpdateStatus(response.data.status);
        setUpdateLogs(response.data.logs || "");
        if (response.data.status === "running") {
          setUpdatingSystem(true);
          setIsPolling(true);
          const poll = async () => {
            try {
              const res = await axios.get(`${API}/settings/update-status`);
              const { status, logs } = res.data;
              setUpdateStatus(status);
              setUpdateLogs(logs || "");
              if (status === "running") {
                setTimeout(poll, 1500);
              } else {
                setUpdatingSystem(false);
                setIsPolling(false);
              }
            } catch (e) {
              setTimeout(poll, 2500);
            }
          };
          setTimeout(poll, 1500);
        }
      } catch (e) {
        console.error("Error fetching initial update status:", e);
      }
    };
    checkInitialStatus();
  }, []);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [updateLogs]);

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

  const pollUpdateStatus = async () => {
    try {
      const response = await axios.get(`${API}/settings/update-status`);
      const { status, logs } = response.data;
      setUpdateStatus(status);
      setUpdateLogs(logs || "");
      
      if (status === "running") {
        setTimeout(pollUpdateStatus, 1500);
      } else {
        setIsPolling(false);
        setUpdatingSystem(false);
        if (status === "success") {
          toast.success("System erfolgreich aktualisiert!");
        } else if (status === "failed") {
          toast.error("System-Update fehlgeschlagen.");
        }
      }
    } catch (error) {
      setTimeout(pollUpdateStatus, 2500);
    }
  };

  const handleRunUpdate = async () => {
    if (updatingSystem) return;
    setUpdatingSystem(true);
    setUpdateStatus("running");
    setIsPolling(true);
    setUpdateLogs("System-Update wird im Hintergrund gestartet...\n");
    
    try {
      await axios.post(`${API}/settings/update-system`);
      toast.info("Update-Prozess gestartet...");
      setTimeout(pollUpdateStatus, 1500);
    } catch (error) {
      console.error("Error starting update:", error);
      toast.error(error.response?.data?.detail || "Fehler beim Starten des Updates");
      setUpdatingSystem(false);
      setUpdateStatus("failed");
      setIsPolling(false);
    }
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

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Bitte wählen Sie eine Bilddatei");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Datei zu groß (max. 2MB)");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post(`${API}/settings/upload-logo`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setSettings({
        ...settings,
        school_logo_base64: response.data.logo
      });

      toast.success("Logo erfolgreich hochgeladen");
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Fehler beim Hochladen des Logos");
    }
  };

  const handleTestLDAP = async () => {
    if (!testCredentials.username || !testCredentials.password) {
      toast.error("Bitte Benutzername und Passwort eingeben");
      return;
    }

    setTesting(true);
    try {
      const response = await axios.post(`${API}/settings/test-ldap`, {
        username: testCredentials.username,
        password: testCredentials.password
      });

      if (response.data.success) {
        toast.success(response.data.message);
        if (response.data.user_data) {
          toast.info(`Gefundener Benutzer: ${response.data.user_data.name} (${response.data.user_data.email})`);
        }
        setTestDialog({ open: false, type: null });
        setTestCredentials({ username: "", password: "", email: "" });
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error("Error testing LDAP:", error);
      toast.error("LDAP-Test fehlgeschlagen");
    } finally {
      setTesting(false);
    }
  };

  const handleTestSMTP = async () => {
    if (!testCredentials.email) {
      toast.error("Bitte Test-E-Mail-Adresse eingeben");
      return;
    }

    setTesting(true);
    try {
      const response = await axios.post(`${API}/settings/test-smtp`, {
        email: testCredentials.email
      });

      if (response.data.success) {
        toast.success(response.data.message);
        setTestDialog({ open: false, type: null });
        setTestCredentials({ username: "", password: "", email: "" });
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error("Error testing SMTP:", error);
      toast.error("SMTP-Test fehlgeschlagen");
    } finally {
      setTesting(false);
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="ldap">LDAP</TabsTrigger>
            <TabsTrigger value="smtp">SMTP</TabsTrigger>
            <TabsTrigger value="school">Schule</TabsTrigger>
            <TabsTrigger value="jwt_sso">JWT SSO</TabsTrigger>
            <TabsTrigger value="update">Update</TabsTrigger>
          </TabsList>


          <TabsContent value="ldap" className="space-y-4">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>LDAP-Konfiguration</CardTitle>
                    <CardDescription>
                      Verbinden Sie das System mit Ihrem LDAP-Server für die Benutzerauthentifizierung
                    </CardDescription>
                  </div>
                  {settings.ldap_enabled && (
                    <Button
                      variant="outline"
                      onClick={() => setTestDialog({ open: true, type: "ldap" })}
                      className="border-blue-200 text-blue-700"
                      data-testid="test-ldap-button"
                    >
                      <TestTube className="w-4 h-4 mr-2" />
                      Test
                    </Button>
                  )}
                </div>
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
                        <Label htmlFor="ldap_server">LDAP Server *</Label>
                        <Input
                          id="ldap_server"
                          placeholder="ldap.schule.local"
                          value={settings.ldap_server}
                          onChange={(e) => handleChange("ldap_server", e.target.value)}
                          data-testid="ldap-server-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ldap_port">Port *</Label>
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
                      <Label htmlFor="ldap_base_dn">Basis-DN *</Label>
                      <Input
                        id="ldap_base_dn"
                        placeholder="dc=schule,dc=local"
                        value={settings.ldap_base_dn}
                        onChange={(e) => handleChange("ldap_base_dn", e.target.value)}
                        data-testid="ldap-base-dn-input"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="ldap_bind_dn">Bind-DN *</Label>
                        <Input
                          id="ldap_bind_dn"
                          placeholder="cn=service,dc=schule,dc=local"
                          value={settings.ldap_bind_dn}
                          onChange={(e) => handleChange("ldap_bind_dn", e.target.value)}
                          data-testid="ldap-bind-dn-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ldap_bind_password">Bind-Passwort *</Label>
                        <Input
                          id="ldap_bind_password"
                          type="password"
                          value={settings.ldap_bind_password}
                          onChange={(e) => handleChange("ldap_bind_password", e.target.value)}
                          data-testid="ldap-bind-password-input"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="ldap_user_attr">Benutzerattribut</Label>
                        <Input
                          id="ldap_user_attr"
                          placeholder="sAMAccountName"
                          value={settings.ldap_user_attr}
                          onChange={(e) => handleChange("ldap_user_attr", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ldap_mail_attr">E-Mail-Attribut</Label>
                        <Input
                          id="ldap_mail_attr"
                          placeholder="mail"
                          value={settings.ldap_mail_attr}
                          onChange={(e) => handleChange("ldap_mail_attr", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="ldap_display_attr">Anzeigenamen-Attribut</Label>
                        <Input
                          id="ldap_display_attr"
                          placeholder="displayName"
                          value={settings.ldap_display_attr}
                          onChange={(e) => handleChange("ldap_display_attr", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ldap_upn_suffix">UPN-Suffix (optional)</Label>
                        <Input
                          id="ldap_upn_suffix"
                          placeholder="@schule.local"
                          value={settings.ldap_upn_suffix}
                          onChange={(e) => handleChange("ldap_upn_suffix", e.target.value)}
                        />
                      </div>
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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>SMTP-Konfiguration</CardTitle>
                    <CardDescription>
                      Konfigurieren Sie den E-Mail-Versand für Benachrichtigungen
                    </CardDescription>
                  </div>
                  {settings.smtp_enabled && (
                    <Button
                      variant="outline"
                      onClick={() => setTestDialog({ open: true, type: "smtp" })}
                      className="border-blue-200 text-blue-700"
                      data-testid="test-smtp-button"
                    >
                      <TestTube className="w-4 h-4 mr-2" />
                      Test
                    </Button>
                  )}
                </div>
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
                        <Label htmlFor="smtp_server">SMTP Server *</Label>
                        <Input
                          id="smtp_server"
                          placeholder="smtp.schule.de"
                          value={settings.smtp_server}
                          onChange={(e) => handleChange("smtp_server", e.target.value)}
                          data-testid="smtp-server-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="smtp_port">Port *</Label>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="smtp_username">Benutzername *</Label>
                        <Input
                          id="smtp_username"
                          value={settings.smtp_username}
                          onChange={(e) => handleChange("smtp_username", e.target.value)}
                          data-testid="smtp-username-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="smtp_password">Passwort *</Label>
                        <Input
                          id="smtp_password"
                          type="password"
                          value={settings.smtp_password}
                          onChange={(e) => handleChange("smtp_password", e.target.value)}
                          data-testid="smtp-password-input"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="smtp_from_email">Absender-E-Mail *</Label>
                        <Input
                          id="smtp_from_email"
                          type="email"
                          placeholder="fortbildung@schule.de"
                          value={settings.smtp_from_email}
                          onChange={(e) => handleChange("smtp_from_email", e.target.value)}
                          data-testid="smtp-from-email-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="smtp_from_name">Absendername *</Label>
                        <Input
                          id="smtp_from_name"
                          placeholder="MSO Fortbildungssystem"
                          value={settings.smtp_from_name}
                          onChange={(e) => handleChange("smtp_from_name", e.target.value)}
                          data-testid="smtp-from-name-input"
                        />
                      </div>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="school_name">Schulname *</Label>
                    <Input
                      id="school_name"
                      placeholder="MSO - Fortbildungssystem"
                      value={settings.school_name}
                      onChange={(e) => handleChange("school_name", e.target.value)}
                      data-testid="school-name-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="logout_text">Abmelde-Button Text</Label>
                    <Input
                      id="logout_text"
                      placeholder="Abmelden"
                      value={settings.logout_text || ""}
                      onChange={(e) => handleChange("logout_text", e.target.value)}
                      data-testid="logout-text-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logout_url">Abmelde-Weiterleitungs-URL</Label>
                  <Input
                    id="logout_url"
                    placeholder="z.B. https://portal.schule.de (Optional)"
                    value={settings.logout_url || ""}
                    onChange={(e) => handleChange("logout_url", e.target.value)}
                    data-testid="logout-url-input"
                  />
                  <p className="text-xs text-slate-500">
                    Geben Sie eine externe URL an, zu welcher der Benutzer nach dem Abmelden weitergeleitet werden soll (z.B. Ihr Schulportal). Falls leer, wird er zur lokalen Login-Seite weitergeleitet.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Schullogo</Label>
                  {settings.school_logo_base64 && (
                    <div className="mb-4 p-4 border rounded-lg bg-slate-50 flex items-center space-x-4">
                      <img src={settings.school_logo_base64} alt="School Logo" className="w-20 h-20 object-contain" />
                      <div>
                        <p className="text-sm text-slate-600">Aktuelles Logo</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleChange("school_logo_base64", "")}
                          className="mt-2 text-red-600"
                        >
                          Logo entfernen
                        </Button>
                      </div>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    data-testid="logo-upload-input"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-dashed"
                    data-testid="logo-upload-button"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Logo hochladen (max. 2MB)
                  </Button>
                  <p className="text-xs text-slate-500">
                    Das Logo wird auf Teilnahmeurkunden angezeigt
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="jwt_sso" className="space-y-4">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle>JWT SSO-Konfiguration</CardTitle>
                <CardDescription>
                  Aktivieren und konfigurieren Sie Single Sign-On via JWT (JSON Web Token)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="jwt_sso_enabled" className="text-base font-medium">JWT SSO aktivieren</Label>
                    <p className="text-sm text-slate-500">Erlaubt Benutzern das Anmelden über einen JWT-Token in der URL</p>
                  </div>
                  <Switch
                    id="jwt_sso_enabled"
                    checked={settings.jwt_sso_enabled}
                    onCheckedChange={(checked) => handleChange("jwt_sso_enabled", checked)}
                    data-testid="jwt-sso-enabled-switch"
                  />
                </div>

                {settings.jwt_sso_enabled && (
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="space-y-2">
                      <Label htmlFor="jwt_sso_secret">JWT Secret / Pre-Shared Key *</Label>
                      <Input
                        id="jwt_sso_secret"
                        type="password"
                        placeholder="Geben Sie den Schlüssel ein, mit dem die Tokens signiert werden"
                        value={settings.jwt_sso_secret || ""}
                        onChange={(e) => handleChange("jwt_sso_secret", e.target.value)}
                        data-testid="jwt-sso-secret-input"
                      />
                      <p className="text-xs text-slate-500">
                        Dieser Schlüssel muss dem Identity Provider bekannt sein, um die Signaturen zu verifizieren.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="jwt_sso_url">Identity Provider Login-URL (Redirect)</Label>
                      <Input
                        id="jwt_sso_url"
                        type="text"
                        placeholder="https://cloud.mso-hef.de/novus/api/tiles/sso/15"
                        value={settings.jwt_sso_url || ""}
                        onChange={(e) => handleChange("jwt_sso_url", e.target.value)}
                        data-testid="jwt-sso-url-input"
                      />
                      <p className="text-xs text-slate-500">
                        Die URL des Identity Providers, auf die Benutzer zum Einloggen weitergeleitet werden.
                      </p>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 space-y-2">
                      <h4 className="text-sm font-semibold text-blue-900">Integration mit Ihrem Identity Provider (IDP)</h4>
                      <p className="text-sm text-blue-800">
                        Geben Sie beim IDP folgenden Weiterleitungs-Link an:
                      </p>
                      <code className="block bg-white p-2 rounded border border-blue-200 text-xs font-mono select-all">
                        {window.location.origin}/fortbildung/?token=JWT_TOKEN
                      </code>
                      <p className="text-xs text-blue-700">
                        Der Token muss im Payload die Felder <code className="bg-blue-100 px-1 py-0.5 rounded font-semibold">email</code> (E-Mail des Nutzers), <code className="bg-blue-100 px-1 py-0.5 rounded font-semibold">display_name</code> (Vollständiger Name) und <code className="bg-blue-100 px-1 py-0.5 rounded font-semibold">username</code> (Benutzername) enthalten.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="update" className="space-y-4">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle>System-Update (One-Click)</CardTitle>
                <CardDescription>
                  Aktualisieren Sie das Fortbildungssystem auf die neueste Version von GitHub mit einem Klick.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-800 flex items-center">
                      Status: 
                      {updateStatus === "idle" && <span className="ml-2 text-slate-500 font-normal">Bereit für Update</span>}
                      {updateStatus === "running" && <span className="ml-2 text-blue-600 font-semibold animate-pulse">Wird aktualisiert...</span>}
                      {updateStatus === "success" && <span className="ml-2 text-green-600 font-semibold flex items-center"><CheckCircle2 className="w-4 h-4 mr-1" /> Erfolgreich</span>}
                      {updateStatus === "failed" && <span className="ml-2 text-red-600 font-semibold flex items-center"><XCircle className="w-4 h-4 mr-1" /> Fehlgeschlagen</span>}
                    </p>
                    <p className="text-xs text-slate-500">
                      Dieser Vorgang holt den neuesten Code, installiert Abhängigkeiten, baut das Frontend und startet den Server neu.
                    </p>
                  </div>
                  <Button
                    onClick={handleRunUpdate}
                    disabled={updateStatus === "running"}
                    className="bg-blue-600 hover:bg-blue-700 h-10 animate-fade-in"
                  >
                    {updateStatus === "running" ? (
                      <span className="flex items-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Wird aktualisiert...
                      </span>
                    ) : (
                      "Update jetzt ausführen"
                    )}
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Update-Protokoll (Build-Logs)</Label>
                  <div className="bg-slate-950 text-emerald-400 font-mono text-xs p-4 rounded-lg h-96 overflow-y-auto border border-slate-800 whitespace-pre-wrap select-all">
                    {updateLogs || "Keine Protokolleinträge vorhanden. Starten Sie das Update, um die Logs zu sehen."}
                    <div ref={terminalEndRef} />
                  </div>
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

      {/* LDAP Test Dialog */}
      <Dialog open={testDialog.open && testDialog.type === "ldap"} onOpenChange={(open) => {
        if (!open) {
          setTestDialog({ open: false, type: null });
          setTestCredentials({ username: "", password: "", email: "" });
        }
      }}>
        <DialogContent data-testid="ldap-test-dialog">
          <DialogHeader>
            <DialogTitle>LDAP-Verbindung testen</DialogTitle>
            <DialogDescription>
              Geben Sie Ihre LDAP-Zugangsdaten ein, um die Verbindung zu testen
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="test-ldap-username">Benutzername</Label>
              <Input
                id="test-ldap-username"
                value={testCredentials.username}
                onChange={(e) => setTestCredentials({ ...testCredentials, username: e.target.value })}
                placeholder="max.mustermann"
                data-testid="ldap-test-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="test-ldap-password">Passwort</Label>
              <Input
                id="test-ldap-password"
                type="password"
                value={testCredentials.password}
                onChange={(e) => setTestCredentials({ ...testCredentials, password: e.target.value })}
                data-testid="ldap-test-password"
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setTestDialog({ open: false, type: null });
                setTestCredentials({ username: "", password: "", email: "" });
              }}
              disabled={testing}
            >
              Abbrechen
            </Button>
            <Button onClick={handleTestLDAP} disabled={testing} className="bg-blue-600 hover:bg-blue-700" data-testid="ldap-test-submit">
              {testing ? "Teste..." : "Verbindung testen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SMTP Test Dialog */}
      <Dialog open={testDialog.open && testDialog.type === "smtp"} onOpenChange={(open) => {
        if (!open) {
          setTestDialog({ open: false, type: null });
          setTestCredentials({ username: "", password: "", email: "" });
        }
      }}>
        <DialogContent data-testid="smtp-test-dialog">
          <DialogHeader>
            <DialogTitle>SMTP-Verbindung testen</DialogTitle>
            <DialogDescription>
              Geben Sie eine E-Mail-Adresse ein, an die eine Test-E-Mail gesendet werden soll
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="test-smtp-email">Test-E-Mail-Adresse</Label>
              <Input
                id="test-smtp-email"
                type="email"
                value={testCredentials.email}
                onChange={(e) => setTestCredentials({ ...testCredentials, email: e.target.value })}
                placeholder="ihre.email@schule.de"
                data-testid="smtp-test-email"
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setTestDialog({ open: false, type: null });
                setTestCredentials({ username: "", password: "", email: "" });
              }}
              disabled={testing}
            >
              Abbrechen
            </Button>
            <Button onClick={handleTestSMTP} disabled={testing} className="bg-blue-600 hover:bg-blue-700" data-testid="smtp-test-submit">
              {testing ? "Sende..." : "Test-E-Mail senden"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default AdminSettingsPage;
