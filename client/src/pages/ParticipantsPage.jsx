import { useState, useEffect, useCallback } from "react";
import Layout from "@/components/Layout";
import axios from "axios";
import { API } from "@/App";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Download, CheckCircle2, Clock, Trash2, UserPlus, Search, Loader2 } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";

const ParticipantsPage = ({ user, onLogout }) => {
  const { trainingId } = useParams();
  const navigate = useNavigate();
  const [training, setTraining] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, participant: null });
  const [deleting, setDeleting] = useState(false);

  // Add participant modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [adding, setAdding] = useState(null); // user_id being added

  useEffect(() => {
    fetchData();
  }, [trainingId]);

  const fetchData = async () => {
    try {
      const [trainingRes, participantsRes] = await Promise.all([
        axios.get(`${API}/trainings/${trainingId}`),
        axios.get(`${API}/trainings/${trainingId}/participants`)
      ]);
      setTraining(trainingRes.data);
      setParticipants(participantsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Fehler beim Laden der Teilnehmer");
      navigate("/my-trainings");
    } finally {
      setLoading(false);
    }
  };

  // Debounced user search
  const searchUsers = useCallback(async (q) => {
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await axios.get(`${API}/users/search`, { params: { q: q.trim() } });
      // Filter out already-registered participants
      const registeredIds = participants.map(p => p.user_id);
      setSearchResults(res.data.filter(u => !registeredIds.includes(u.user_id)));
    } catch (error) {
      console.error("User search error:", error);
    } finally {
      setSearchLoading(false);
    }
  }, [participants]);

  useEffect(() => {
    const timer = setTimeout(() => searchUsers(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  const handleAddParticipant = async (targetUser) => {
    setAdding(targetUser.user_id);
    try {
      await axios.post(`${API}/trainings/${trainingId}/participants/add`, { user_id: targetUser.user_id });
      toast.success(`${targetUser.name} wurde erfolgreich hinzugefügt`);
      await fetchData();
      // Remove from search results
      setSearchResults(prev => prev.filter(u => u.user_id !== targetUser.user_id));
    } catch (error) {
      console.error("Error adding participant:", error);
      toast.error(error.response?.data?.detail || "Fehler beim Hinzufügen");
    } finally {
      setAdding(null);
    }
  };

  const handleConfirm = async () => {
    if (selectedParticipants.length === 0) {
      toast.error("Bitte wählen Sie mindestens einen Teilnehmer aus");
      return;
    }

    setConfirming(true);
    try {
      await axios.post(`${API}/trainings/${trainingId}/participants/confirm`, selectedParticipants);
      toast.success("Teilnahmen erfolgreich bestätigt");
      setSelectedParticipants([]);
      fetchData();
    } catch (error) {
      console.error("Error confirming participants:", error);
      toast.error(error.response?.data?.detail || "Bestätigung fehlgeschlagen");
    } finally {
      setConfirming(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.participant) return;

    setDeleting(true);
    try {
      await axios.delete(`${API}/trainings/${trainingId}/participants/${deleteDialog.participant.registration_id}`);
      toast.success("Teilnehmer erfolgreich entfernt");
      setDeleteDialog({ open: false, participant: null });
      fetchData();
    } catch (error) {
      console.error("Error deleting participant:", error);
      toast.error(error.response?.data?.detail || "Löschen fehlgeschlagen");
    } finally {
      setDeleting(false);
    }
  };

  const isTrainingFinished = () => {
    if (!training || !training.dates || training.dates.length === 0) return false;
    const lastDate = training.dates.reduce((latest, current) => {
      return new Date(current.end_datetime) > new Date(latest.end_datetime) ? current : latest;
    });
    return new Date(lastDate.end_datetime) < new Date();
  };

  const downloadParticipantList = async () => {
    try {
      const response = await axios.get(`${API}/pdfs/participant-list/${trainingId}`, {
        responseType: "blob"
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `teilnehmerliste_${trainingId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Teilnehmerliste erfolgreich heruntergeladen");
    } catch (error) {
      console.error("Error downloading list:", error);
      toast.error("Fehler beim Herunterladen der Liste");
    }
  };

  const toggleParticipant = (userId) => {
    if (selectedParticipants.includes(userId)) {
      setSelectedParticipants(selectedParticipants.filter(id => id !== userId));
    } else {
      setSelectedParticipants([...selectedParticipants, userId]);
    }
  };

  const selectAll = () => {
    if (selectedParticipants.length === participants.filter(p => !p.confirmed).length) {
      setSelectedParticipants([]);
    } else {
      setSelectedParticipants(participants.filter(p => !p.confirmed).map(p => p.user_id));
    }
  };

  const formatDate = (dateString) => {
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
            <p className="mt-4 text-slate-600">Lade Teilnehmer...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const confirmedCount = participants.filter(p => p.confirmed).length;
  const pendingCount = participants.filter(p => !p.confirmed).length;

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="space-y-6" data-testid="participants-page">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Teilnehmerverwaltung</h1>
          <p className="text-slate-600 mt-2">{training?.title}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-blue-600">{participants.length}</div>
              <p className="text-sm text-slate-600 mt-1">Gesamt Teilnehmer</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-green-600">{confirmedCount}</div>
              <p className="text-sm text-slate-600 mt-1">Bestätigt</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-orange-600">{pendingCount}</div>
              <p className="text-sm text-slate-600 mt-1">Ausstehend</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={downloadParticipantList}
            variant="outline"
            className="border-blue-200 text-blue-700"
            data-testid="download-list-button"
          >
            <Download className="w-4 h-4 mr-2" />
            Teilnehmerliste herunterladen
          </Button>
          {pendingCount > 0 && (
            <Button
              onClick={selectAll}
              variant="outline"
              data-testid="select-all-button"
            >
              {selectedParticipants.length === pendingCount ? "Alle abwählen" : "Alle auswählen"}
            </Button>
          )}
          <Button
            onClick={() => {
              setSearchQuery("");
              setSearchResults([]);
              setAddModalOpen(true);
            }}
            className="bg-green-600 hover:bg-green-700"
            data-testid="add-participant-button"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Teilnehmer hinzufügen
          </Button>
        </div>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Teilnehmerliste</CardTitle>
            <CardDescription>
              {pendingCount > 0 ? "Wählen Sie Teilnehmer aus und bestätigen Sie deren Teilnahme" : "Alle Teilnahmen wurden bestätigt"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {participants.length === 0 ? (
              <div className="text-center py-8 text-slate-600">
                Noch keine Anmeldungen vorhanden
              </div>
            ) : (
              <div className="space-y-3">
                {participants.map((participant) => (
                  <div
                    key={participant.user_id}
                    className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-200"
                    data-testid="participant-item"
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      {!participant.confirmed && (
                        <Checkbox
                          checked={selectedParticipants.includes(participant.user_id)}
                          onCheckedChange={() => toggleParticipant(participant.user_id)}
                          data-testid={`participant-checkbox-${participant.user_id}`}
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-slate-800">{participant.user_name}</p>
                        <p className="text-sm text-slate-600">{participant.user_email}</p>
                        {participant.form_responses && Object.keys(participant.form_responses).length > 0 && training?.form_fields && (
                          <div className="text-sm text-slate-500 mt-1 space-y-1">
                            {Object.entries(participant.form_responses).map(([fieldId, value]) => {
                              const field = training.form_fields.find(f => f.field_id === fieldId);
                              const fieldLabel = field?.label || "Antwort";
                              return (
                                <p key={fieldId}>
                                  <span className="font-medium">{fieldLabel}:</span> {Array.isArray(value) ? value.join(", ") : value}
                                </p>
                              );
                            })}
                          </div>
                        )}
                        <p className="text-xs text-slate-500 mt-1">
                          Angemeldet: {formatDate(participant.registered_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {participant.confirmed ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Bestätigt
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                          <Clock className="w-3 h-3 mr-1" />
                          Ausstehend
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteDialog({ open: true, participant })}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Teilnehmer entfernen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {pendingCount > 0 && selectedParticipants.length > 0 && (
              <div className="mt-6 pt-6 border-t border-slate-200">
                {!isTrainingFinished() && (
                  <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-800">
                      <strong>Hinweis:</strong> Teilnahmebestätigungen können erst nach Ende des letzten Termins ausgestellt werden.
                    </p>
                  </div>
                )}
                <Button
                  onClick={handleConfirm}
                  disabled={confirming || !isTrainingFinished()}
                  className="w-full bg-green-600 hover:bg-green-700"
                  data-testid="confirm-button"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {confirming ? "Bestätige..." : `${selectedParticipants.length} Teilnahme(n) bestätigen`}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Teilnehmer entfernen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie {deleteDialog.participant?.user_name} wirklich von der Fortbildung abmelden?
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? "Entferne..." : "Entfernen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Participant Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <UserPlus className="w-5 h-5 text-green-600" />
              <span>Teilnehmer hinzufügen</span>
            </DialogTitle>
            <DialogDescription>
              Suchen Sie nach Benutzern anhand von Name oder E-Mail-Adresse.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Name oder E-Mail eingeben..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                autoFocus
              />
              {searchLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
              )}
            </div>

            {searchQuery.trim().length > 0 && searchQuery.trim().length < 2 && (
              <p className="text-xs text-slate-500 text-center">Mindestens 2 Zeichen eingeben...</p>
            )}

            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {searchResults.map((u) => (
                  <div
                    key={u.user_id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200"
                  >
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{u.name}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddParticipant(u)}
                      disabled={adding === u.user_id}
                      className="bg-green-600 hover:bg-green-700 shrink-0"
                    >
                      {adding === u.user_id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="w-3 h-3 mr-1" />
                          Hinzufügen
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {searchQuery.trim().length >= 2 && !searchLoading && searchResults.length === 0 && (
              <div className="text-center py-6 text-slate-500">
                <Search className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">Keine Benutzer gefunden</p>
                <p className="text-xs mt-1">Alle passenden Benutzer sind möglicherweise bereits angemeldet.</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModalOpen(false)}>
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default ParticipantsPage;
