import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import axios from "axios";
import { API } from "@/App";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Shield, User } from "lucide-react";

const AdminUsersPage = ({ user, onLogout }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingRole, setUpdatingRole] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`);
      setUsers(response.data);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Fehler beim Laden der Benutzer");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingRole(userId);
    try {
      await axios.put(`${API}/users/${userId}/role?role=${newRole}`);
      toast.success("Benutzerrolle erfolgreich geändert");
      fetchUsers();
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error(error.response?.data?.detail || "Fehler beim Ändern der Rolle");
    } finally {
      setUpdatingRole(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Nie";
    const date = new Date(dateString);
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-slate-600">Lade Benutzer...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="space-y-6" data-testid="admin-users-page">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Benutzerverwaltung</h1>
          <p className="text-slate-600 mt-2">{users.length} Benutzer im System</p>
        </div>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Benutzerübersicht</CardTitle>
            <CardDescription>
              Verwalten Sie Benutzerrollen und Berechtigungen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {users.map((u) => (
                <div
                  key={u.user_id}
                  className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-200"
                  data-testid="user-item"
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      u.role === "admin" ? "bg-orange-100" : "bg-blue-100"
                    }`}>
                      {u.role === "admin" ? (
                        <Shield className="w-6 h-6 text-orange-600" />
                      ) : (
                        <User className="w-6 h-6 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-slate-800">{u.name}</p>
                        {u.auth_source === "ldap" && (
                          <Badge variant="outline" className="text-xs">LDAP</Badge>
                        )}
                        {u.auth_source === "local" && (
                          <Badge variant="outline" className="text-xs">Lokal</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">{u.email}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Erstellt: {formatDate(u.created_at)} | Letzter Login: {formatDate(u.last_login)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Select
                      value={u.role}
                      onValueChange={(newRole) => handleRoleChange(u.user_id, newRole)}
                      disabled={updatingRole === u.user_id || u.user_id === user.user_id}
                    >
                      <SelectTrigger className="w-32" data-testid={`role-select-${u.user_id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Benutzer</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                    {u.user_id === user.user_id && (
                      <Badge variant="secondary" className="text-xs">Sie</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-blue-50 border-blue-100">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-700">
              <strong>Hinweis:</strong> Sie können Ihre eigene Rolle nicht ändern. LDAP-Benutzer werden automatisch bei der ersten Anmeldung erstellt.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AdminUsersPage;
