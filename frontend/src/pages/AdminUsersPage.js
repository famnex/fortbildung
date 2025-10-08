import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import axios from "axios";
import { API } from "@/App";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Shield, User, Plus, Edit, Trash2 } from "lucide-react";

const AdminUsersPage = ({ user, onLogout }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialog, setCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState({ open: false, user: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null });
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    password: "",
    role: "user"
  });

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

  const handleCreate = async () => {
    if (!formData.email || !formData.name || !formData.password) {
      toast.error("Bitte alle Felder ausfüllen");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Bitte geben Sie eine gültige E-Mail-Adresse ein");
      return;
    }

    setSaving(true);
    try {
      await axios.post(`${API}/users`, formData);
      toast.success("Benutzer erfolgreich erstellt");
      setCreateDialog(false);
      setFormData({ email: "", name: "", password: "", role: "user" });
      fetchUsers();
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error(error.response?.data?.detail || "Fehler beim Erstellen des Benutzers");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!formData.email || !formData.name) {
      toast.error("Bitte alle Pflichtfelder ausfüllen");
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        email: formData.email,
        name: formData.name,
        role: formData.role
      };
      
      if (formData.password) {
        updateData.password = formData.password;
      }

      await axios.put(`${API}/users/${editDialog.user.user_id}`, updateData);
      toast.success("Benutzer erfolgreich aktualisiert");
      setEditDialog({ open: false, user: null });
      setFormData({ email: "", name: "", password: "", role: "user" });
      fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error(error.response?.data?.detail || "Fehler beim Aktualisieren des Benutzers");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await axios.delete(`${API}/users/${deleteDialog.user.user_id}`);
      toast.success("Benutzer erfolgreich gelöscht");
      setDeleteDialog({ open: false, user: null });
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error(error.response?.data?.detail || "Fehler beim Löschen des Benutzers");
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (userToEdit) => {
    setFormData({
      email: userToEdit.email,
      name: userToEdit.name,
      password: "",
      role: userToEdit.role
    });
    setEditDialog({ open: true, user: userToEdit });
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Benutzerverwaltung</h1>
            <p className="text-slate-600 mt-2">{users.length} Benutzer im System</p>
          </div>
          <Button
            onClick={() => {
              setFormData({ email: "", name: "", password: "", role: "user" });
              setCreateDialog(true);
            }}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="create-user-button"
          >
            <Plus className="w-4 h-4 mr-2" />
            Benutzer erstellen
          </Button>
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
                        {u.user_id === user.user_id && (
                          <Badge variant="secondary" className="text-xs">Sie</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">{u.email}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Erstellt: {formatDate(u.created_at)} | Letzter Login: {formatDate(u.last_login)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={u.role === "admin" ? "bg-orange-100 text-orange-800" : "bg-blue-100 text-blue-800"}>
                      {u.role === "admin" ? "Administrator" : "Benutzer"}
                    </Badge>
                    {u.auth_source === "local" && u.user_id !== user.user_id && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(u)}
                          data-testid={`edit-user-${u.user_id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDeleteDialog({ open: true, user: u })}
                          className="border-red-200 text-red-600 hover:bg-red-50"
                          data-testid={`delete-user-${u.user_id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
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
              <strong>Hinweis:</strong> Sie können Ihre eigene Rolle nicht ändern. LDAP-Benutzer werden automatisch bei der ersten Anmeldung erstellt und können nicht bearbeitet oder gelöscht werden.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent data-testid="create-user-dialog">
          <DialogHeader>
            <DialogTitle>Neuen Benutzer erstellen</DialogTitle>
            <DialogDescription>
              Erstellen Sie einen neuen lokalen Benutzer für das System
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="create-email">E-Mail *</Label>
              <Input
                id="create-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="benutzer@schule.de"
                data-testid="create-email-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-name">Name *</Label>
              <Input
                id="create-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Max Mustermann"
                data-testid="create-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-password">Passwort *</Label>
              <Input
                id="create-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                data-testid="create-password-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-role">Rolle *</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger data-testid="create-role-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Benutzer</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setCreateDialog(false)} disabled={saving}>
              Abbrechen
            </Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-blue-600 hover:bg-blue-700" data-testid="create-user-submit">
              {saving ? "Erstelle..." : "Erstellen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ ...editDialog, open })}>
        <DialogContent data-testid="edit-user-dialog">
          <DialogHeader>
            <DialogTitle>Benutzer bearbeiten</DialogTitle>
            <DialogDescription>
              Bearbeiten Sie die Daten von {editDialog.user?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-email">E-Mail *</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                data-testid="edit-email-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="edit-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password">Neues Passwort (optional)</Label>
              <Input
                id="edit-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Leer lassen für keine Änderung"
                data-testid="edit-password-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Rolle *</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger data-testid="edit-role-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Benutzer</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setEditDialog({ open: false, user: null })} disabled={saving}>
              Abbrechen
            </Button>
            <Button onClick={handleEdit} disabled={saving} className="bg-blue-600 hover:bg-blue-700" data-testid="edit-user-submit">
              {saving ? "Speichere..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Benutzer löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie den Benutzer "{deleteDialog.user?.name}" wirklich löschen?
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700"
            >
              {saving ? "Lösche..." : "Löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default AdminUsersPage;
