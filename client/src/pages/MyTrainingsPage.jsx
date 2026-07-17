import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import axios from "axios";
import { API } from "@/App";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Users, Eye, EyeOff, MapPin, Calendar, AlertCircle, Copy } from "lucide-react";
import { useNavigate } from "react-router-dom";

const MyTrainingsPage = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, training: null });
  const [deleting, setDeleting] = useState(false);
  const [publishing, setPublishing] = useState(null);
  const [showArchive, setShowArchive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const getEarliestStartDate = (t) => {
    if (!t.dates || t.dates.length === 0) return null;
    const dates = t.dates.map(d => new Date(d.start_datetime));
    return new Date(Math.min(...dates));
  };

  const getLatestEndDate = (t) => {
    if (!t.dates || t.dates.length === 0) return null;
    const dates = t.dates.map(d => new Date(d.end_datetime));
    return new Date(Math.max(...dates));
  };

  useEffect(() => {
    fetchTrainings();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [showArchive]);

  const now = new Date();

  const activeTrainings = trainings.filter(t => {
    const lastEnd = getLatestEndDate(t);
    return !lastEnd || lastEnd >= now;
  });

  const archivedTrainings = trainings.filter(t => {
    const lastEnd = getLatestEndDate(t);
    return lastEnd && lastEnd < now;
  });

  const currentList = showArchive ? archivedTrainings : activeTrainings;

  const sortedList = [...currentList].sort((a, b) => {
    const startA = getEarliestStartDate(a);
    const startB = getEarliestStartDate(b);
    if (!startA && !startB) return 0;
    if (!startA) return 1;
    if (!startB) return -1;
    return startA - startB;
  });

  const itemsPerPage = 20;
  const totalPages = Math.ceil(sortedList.length / itemsPerPage);
  const paginatedList = sortedList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const fetchTrainings = async () => {
    try {
      const response = await axios.get(`${API}/trainings/my`);
      setTrainings(response.data);
    } catch (error) {
      console.error("Error fetching trainings:", error);
      toast.error("Fehler beim Laden der Fortbildungen");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.training) return;

    setDeleting(true);
    try {
      await axios.delete(`${API}/trainings/${deleteDialog.training.training_id}`);
      toast.success("Fortbildung erfolgreich gelöscht");
      setDeleteDialog({ open: false, training: null });
      fetchTrainings();
    } catch (error) {
      console.error("Error deleting training:", error);
      toast.error(error.response?.data?.detail || "Löschen fehlgeschlagen");
    } finally {
      setDeleting(false);
    }
  };

  const handlePublishToggle = async (training) => {
    setPublishing(training.training_id);
    try {
      await axios.put(`${API}/trainings/${training.training_id}/publish`);
      const newStatus = training.status === "draft" ? "veröffentlicht" : "zurückgezogen";
      toast.success(`Fortbildung erfolgreich ${newStatus}`);
      fetchTrainings();
    } catch (error) {
      console.error("Error publishing training:", error);
      toast.error(error.response?.data?.detail || "Statusänderung fehlgeschlagen");
    } finally {
      setPublishing(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("de-DE", {
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
            <p className="mt-4 text-slate-600">Lade Fortbildungen...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="space-y-6" data-testid="my-trainings-page">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Meine Angebote</h1>
            <p className="text-slate-600 mt-2">
              {showArchive ? "Archivierte Angebote" : "Aktive Angebote"} ({currentList.length})
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant={showArchive ? "default" : "outline"}
              onClick={() => setShowArchive(false)}
              className="h-10 px-4"
            >
              Aktuell
            </Button>
            <Button
              variant={showArchive ? "outline" : "default"}
              onClick={() => setShowArchive(true)}
              className={`h-10 px-4 ${showArchive ? "" : "bg-slate-800 text-white hover:bg-slate-700"}`}
            >
              Archiv
            </Button>
            <Button
              onClick={() => navigate("/create-training")}
              className="bg-blue-600 hover:bg-blue-700 h-10 px-4"
              data-testid="create-training-button"
            >
              <Plus className="w-4 h-4 mr-2" />
              Neue Fortbildung
            </Button>
          </div>
        </div>

        {paginatedList.length === 0 ? (
          <Card className="border-0 shadow-md">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="w-12 h-12 text-slate-400 mb-4" />
              <p className="text-slate-600 text-lg mb-2">Keine Fortbildungen erstellt</p>
              <p className="text-slate-500 text-sm mb-4">Erstellen Sie Ihre erste Fortbildung</p>
              <Button onClick={() => navigate("/create-training")} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Fortbildung erstellen
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4">
              {paginatedList.map((training) => (
                <Card key={training.training_id} className="border-0 shadow-md hover:shadow-lg transition-all" data-testid="training-card">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <CardTitle className="text-xl text-slate-800">{training.title}</CardTitle>
                          {training.status === "draft" ? (
                            <Badge variant="secondary" className="bg-slate-100 text-slate-700">Entwurf</Badge>
                          ) : (
                            <Badge variant="default" className="bg-green-100 text-green-800">Veröffentlicht</Badge>
                          )}
                          {training.type === "external" && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
                              Externe Veranstaltung
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="mt-2">{training.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        {training.location && (
                          <div className="flex items-center text-sm text-slate-600 mb-2">
                            <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                            {training.location}
                          </div>
                        )}
                        {training.dates && training.dates.length > 0 && (
                          <div className="space-y-1">
                            <div className="flex items-center text-sm font-medium text-slate-700">
                              <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                              Termine:
                            </div>
                            <div className="pl-6 space-y-1">
                              {training.dates.map((date, index) => (
                                <div key={index} className="text-sm text-slate-600">
                                  {formatDate(date.start_datetime)} | {formatTime(date.start_datetime)} - {formatTime(date.end_datetime)}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        {training.type !== "external" && (
                          <div className="flex items-center text-sm text-slate-600">
                            <Users className="w-4 h-4 mr-2 text-slate-400" />
                            {training.current_participants} / {training.max_participants} Teilnehmer
                          </div>
                        )}
                        {training.registration_deadline && (
                          <div className="text-sm text-slate-600">
                            Anmeldefrist: {formatDate(training.registration_deadline)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                      <Button
                        onClick={() => handlePublishToggle(training)}
                        disabled={publishing === training.training_id}
                        variant="outline"
                        className={training.status === "draft" ? "border-green-200 text-green-700 hover:bg-green-50" : "border-slate-200"}
                        data-testid="publish-toggle-button"
                      >
                        {training.status === "draft" ? (
                          <>
                            <Eye className="w-4 h-4 mr-2" />
                            Veröffentlichen
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-4 h-4 mr-2" />
                            Zurückziehen
                          </>
                        )}
                      </Button>
                      {training.type !== "external" && (
                        <Button
                          onClick={() => navigate(`/participants/${training.training_id}`)}
                          variant="outline"
                          className="border-blue-200 text-blue-700 hover:bg-blue-50"
                          data-testid="participants-button"
                        >
                          <Users className="w-4 h-4 mr-2" />
                          Teilnehmer ({training.current_participants})
                        </Button>
                      )}
                      <Button
                        onClick={() => navigate(`/edit-training/${training.training_id}`)}
                        variant="outline"
                        className="border-slate-200"
                        data-testid="edit-button"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Bearbeiten
                      </Button>
                      <Button
                        onClick={() => navigate(`/create-training?copyFrom=${training.training_id}`)}
                        variant="outline"
                        className="border-slate-200"
                        title="Kopieren"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Kopieren
                      </Button>
                      <Button
                        onClick={() => setDeleteDialog({ open: true, training })}
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50"
                        data-testid="delete-button"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Löschen
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Zurück
                </Button>
                <span className="text-sm text-slate-600">
                  Seite {currentPage} von {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Weiter
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fortbildung löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie die Fortbildung "{deleteDialog.training?.title}" wirklich löschen?
              Alle Anmeldungen werden ebenfalls gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? "Lösche..." : "Löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default MyTrainingsPage;
