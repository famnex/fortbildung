import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import axios from "axios";
import { API } from "@/App";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MapPin, Calendar, Users, Search, Clock, AlertCircle } from "lucide-react";
import DynamicForm from "@/components/DynamicForm";

const TrainingsPage = ({ user, onLogout }) => {
  const [trainings, setTrainings] = useState([]);
  const [filteredTrainings, setFilteredTrainings] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [formResponses, setFormResponses] = useState({});
  const [registering, setRegistering] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchTrainings();
  }, []);

  useEffect(() => {
    const filtered = trainings.filter((training) => {
      const search = searchTerm.toLowerCase();
      return (
        training.title.toLowerCase().includes(search) ||
        training.description.toLowerCase().includes(search) ||
        training.location.toLowerCase().includes(search) ||
        training.created_by_name.toLowerCase().includes(search)
      );
    });
    setFilteredTrainings(filtered);
  }, [searchTerm, trainings]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, showArchive]);

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

  const now = new Date();

  const activeTrainings = filteredTrainings.filter(t => {
    const lastEnd = getLatestEndDate(t);
    return !lastEnd || lastEnd >= now;
  });

  const archivedTrainings = filteredTrainings.filter(t => {
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
      const response = await axios.get(`${API}/trainings`);
      setTrainings(response.data);
      setFilteredTrainings(response.data);
    } catch (error) {
      console.error("Error fetching trainings:", error);
      toast.error("Fehler beim Laden der Fortbildungen");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!selectedTraining) return;

    setRegistering(true);
    try {
      await axios.post(`${API}/registrations`, {
        training_id: selectedTraining.training_id,
        form_responses: formResponses
      });
      toast.success("Erfolgreich angemeldet!");
      setShowRegisterDialog(false);
      setFormResponses({});
      fetchTrainings();
    } catch (error) {
      console.error("Error registering:", error);
      toast.error(error.response?.data?.detail || "Anmeldung fehlgeschlagen");
    } finally {
      setRegistering(false);
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

  const isDeadlinePassed = (deadline) => {
    return new Date(deadline) < new Date();
  };

  const isFull = (training) => {
    return training.current_participants >= training.max_participants;
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
      <div className="space-y-6" data-testid="trainings-page">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Fortbildungskatalog</h1>
            <p className="text-slate-600 mt-2">
              {showArchive ? "Archivierte Fortbildungen" : "Aktuelle Fortbildungen"} ({currentList.length})
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
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Fortbildungen durchsuchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12 border-slate-200"
            data-testid="search-input"
          />
        </div>

        {paginatedList.length === 0 ? (
          <Card className="border-0 shadow-md">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="w-12 h-12 text-slate-400 mb-4" />
              <p className="text-slate-600 text-lg">Keine Fortbildungen gefunden</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {paginatedList.map((training) => {
                const deadlinePassed = isDeadlinePassed(training.registration_deadline);
                const full = isFull(training);
                const canRegister = !deadlinePassed && !full;

                return (
                  <Card key={training.training_id} className="border-0 shadow-md hover:shadow-xl transition-all duration-300" data-testid="training-card">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl text-slate-800">{training.title}</CardTitle>
                          <CardDescription className="mt-2">{training.description}</CardDescription>
                        </div>
                        {full && (
                          <Badge variant="destructive" className="ml-2">Ausgebucht</Badge>
                        )}
                        {deadlinePassed && !full && (
                          <Badge variant="secondary" className="ml-2">Frist abgelaufen</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center text-sm text-slate-600">
                        <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                        {training.location}
                      </div>

                      {training.dates && training.dates.length > 0 && (
                        <div className="space-y-2">
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

                      <div className="flex items-center text-sm text-slate-600">
                        <Users className="w-4 h-4 mr-2 text-slate-400" />
                        {training.current_participants} / {training.max_participants} Teilnehmer
                      </div>

                      <div className="flex items-center text-sm text-slate-600">
                        <Clock className="w-4 h-4 mr-2 text-slate-400" />
                        Anmeldefrist: {formatDate(training.registration_deadline)}
                      </div>

                      <div className="pt-2 border-t border-slate-100">
                        <p className="text-xs text-slate-500">Anbieter: {training.created_by_name}</p>
                      </div>

                      <Button
                        onClick={() => {
                          setSelectedTraining(training);
                          setShowRegisterDialog(true);
                        }}
                        disabled={!canRegister}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        data-testid="register-button"
                      >
                        {full ? "Ausgebucht" : deadlinePassed ? "Frist abgelaufen" : "Jetzt anmelden"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
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

      {/* Registration Dialog */}
      <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
        <DialogContent data-testid="register-dialog">
          <DialogHeader>
            <DialogTitle>Anmeldung bestätigen</DialogTitle>
            <DialogDescription>
              Sie melden sich für die Fortbildung "{selectedTraining?.title}" an.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {selectedTraining?.form_fields && selectedTraining.form_fields.length > 0 && (
              <DynamicForm
                fields={selectedTraining.form_fields}
                values={formResponses}
                onChange={setFormResponses}
              />
            )}
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowRegisterDialog(false)}
                className="flex-1"
                disabled={registering}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleRegister}
                disabled={registering}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                data-testid="confirm-register-button"
              >
                {registering ? "Anmelden..." : "Bestätigen"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default TrainingsPage;
