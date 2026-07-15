import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { GraduationCap } from "lucide-react";

const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showLocalForm, setShowLocalForm] = useState(false);
  const [config, setConfig] = useState({
    sso_or_ldap_active: false,
    non_local_admin_exists: false,
    sso_login_url: ""
  });

  useEffect(() => {
    const fetchLoginConfig = async () => {
      try {
        const response = await axios.get(`${API}/auth/login-config`);
        setConfig(response.data);
      } catch (error) {
        console.error("Error loading login config:", error);
      }
    };
    fetchLoginConfig();

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("local") === "true") {
      setShowLocalForm(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      onLogin(response.data.token, response.data.user);
      toast.success("Erfolgreich angemeldet!");
    } catch (error) {
      console.error("Login error:", error);
      toast.error(error.response?.data?.detail || "Anmeldung fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  };

  const forceSSO = config.sso_or_ldap_active && config.non_local_admin_exists && !showLocalForm;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-0" data-testid="login-card">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold text-slate-800">Fortbildungssystem</CardTitle>
            <CardDescription className="text-base mt-2">
              {forceSSO ? "Zentraler Login" : "Melden Sie sich mit Ihren Zugangsdaten an"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {forceSSO ? (
            <div className="space-y-6 text-center">
              <p className="text-slate-600 text-sm">
                Die Anmeldung erfolgt über den zentralen Identity Provider (IDP).
              </p>
              <Button
                onClick={() => {
                  if (config.sso_login_url) {
                    window.location.href = config.sso_login_url;
                  } else {
                    toast.error("SSO Login URL ist nicht konfiguriert.");
                  }
                }}
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium shadow-md hover:shadow-lg transition-all"
              >
                Über Identity Provider Anmelden
              </Button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">E-Mail / Benutzername</Label>
                <Input
                  id="email"
                  type="text"
                  placeholder="benutzer@schule.de"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                  data-testid="login-email-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Passwort</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11"
                  data-testid="login-password-input"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md hover:shadow-lg transition-all"
                disabled={loading}
                data-testid="login-submit-button"
              >
                {loading ? "Anmelden..." : "Anmelden"}
              </Button>
              {config.sso_or_ldap_active && config.non_local_admin_exists && (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setShowLocalForm(false)}
                    className="text-xs text-blue-600 hover:text-blue-700 hover:underline transition"
                  >
                    Zurück zur SSO-Anmeldung
                  </button>
                </div>
              )}
            </form>
          )}

          {(!forceSSO || showLocalForm) && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm text-slate-700 font-medium mb-1">🔑 Standard-Admin:</p>
              <p className="text-xs text-slate-600">E-Mail: <code className="bg-white px-1.5 py-0.5 rounded">admin@fortbildung.mso</code></p>
              <p className="text-xs text-slate-600">Passwort: <code className="bg-white px-1.5 py-0.5 rounded">admin123</code></p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
