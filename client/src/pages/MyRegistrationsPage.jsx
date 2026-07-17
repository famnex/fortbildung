import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import axios from "axios";
import { API } from "@/App";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { MapPin, Calendar, Download, X, CheckCircle2, Clock, AlertCircle } from "lucide-react";

const MyRegistrationsPage = ({ user, onLogout }) => {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelDialog, setCancelDialog] = useState({ open: false, registration: null });
  const [canceling, setCanceling] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const getEarliestStartDate = (training) => {
    if (!training || !training.dates || training.dates.length === 0) return null;
    const dates = training.dates.map(d => new Date(d.start_datetime));
    return new Date(Math.min(...dates));
  };

  const getLatestEndDate = (training) => {
    if (!training || !training.dates || training.dates.length === 0) return null;
    const dates = training.dates.map(d => new Date(d.end_datetime));
    return new Date(Math.max(...dates));
  };

  useEffect(() => {
    fetchRegistrations();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [showArchive]);

  const now = new Date();

  const activeRegistrations = registrations.filter(item => {
    if (item.status === "cancelled") return false;
    const lastEnd = getLatestEndDate(item.training);
    return !lastEnd || lastEnd >= now;
  });

  const archivedRegistrations = registrations.filter(item => {
    if (item.status === "cancelled") return false;
    const lastEnd = getLatestEndDate(item.training);
    return lastEnd && lastEnd < now;
  });

  const currentList = showArchive ? archivedRegistrations : activeRegistrations;

  const sortedList = [...currentList].sort((a, b) => {
    const startA = getEarliestStartDate(a.training);
    const startB = getEarliestStartDate(b.training);
    if (!startA && !startB) return 0;
    if (!startA) return 1;
    if (!startB) return -1;
    return startA - startB;
  });

  const itemsPerPage = 20;
  const totalPages = Math.ceil(sortedList.length / itemsPerPage);
  const paginatedList = sortedList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const fetchRegistrations = async () => {
    try {
      const response = await axios.get(`${API}/registrations/my`);
      setRegistrations(response.data);
    } catch (error) {
      console.error("Error fetching registrations:", error);
      toast.error("Fehler beim Laden der Anmeldungen");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelDialog.registration) return;

    setCanceling(true);
    try {
      await axios.delete(`${API}/registrations/${cancelDialog.registration.registration_id}`);
      toast.success("Anmeldung erfolgreich storniert");
      setCancelDialog({ open: false, registration: null });
      fetchRegistrations();
    } catch (error) {
      console.error("Error canceling registration:", error);
      toast.error(error.response?.data?.detail || "Stornierung fehlgeschlagen");
    } finally {
      setCanceling(false);
    }
  };

  const downloadCertificate = async (participationId) => {
    try {
      const response = await axios.get(`${API}/pdfs/certificate/${participationId}`, {
        responseType: "blob"
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `teilnahmeurkunde_${participationId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Urkunde erfolgreich heruntergeladen");
    } catch (error) {
      console.error("Error downloading certificate:", error);
      toast.error("Fehler beim Herunterladen der Urkunde");
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
            <p className="mt-4 text-slate-600">Lade Anmeldungen...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="space-y-6" data-testid="my-registrations-page">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Meine Anmeldungen</h1>
            <p className="text-slate-600 mt-2">
              {showArchive ? "Archivierte Anmeldungen" : "Aktive Anmeldungen"} ({currentList.length})
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

        {paginatedList.length === 0 ? (
          <Card className="border-0 shadow-md">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="w-12 h-12 text-slate-400 mb-4" />
              <p className="text-slate-600 text-lg mb-2">Keine Anmeldungen vorhanden</p>
              <p className="text-slate-500 text-sm">Melden Sie sich für Fortbildungen im Katalog an</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4">
              {paginatedList.map((item) => {
                const registration = item;
                const { training, participation } = item;

                return (
                  <Card key={registration.registration_id} className="border-0 shadow-md hover:shadow-lg transition-all" data-testid="registration-card">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <CardTitle className="text-xl text-slate-800">{training.title}</CardTitle>
                            {registration.status === "waitlist" && (
                              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Warteliste</Badge>
                            )}
                            {registration.status === "registered" && (
                              <Badge variant="default" className="bg-green-100 text-green-800">Angemeldet</Badge>
                            )}
                          </div>
                          <CardDescription className="mt-2">{training.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center text-sm text-slate-600 mb-2">
                            <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                            {training.location}
                          </div>
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
                          <div className="flex items-center text-sm text-slate-600">
                            <Clock className="w-4 h-4 mr-2 text-slate-400" />
                            Angemeldet am: {formatDate(registration.registered_at)}
                          </div>
                          {participation ? (
                            <div className="flex items-center text-sm text-green-700">
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Teilnahme bestätigt
                            </div>
                          ) : (
                            <div className="flex items-center text-sm text-slate-600">
                              <Clock className="w-4 h-4 mr-2 text-slate-400" />
                              Teilnahme ausstehend
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex space-x-3 pt-2 border-t border-slate-100">
                        {participation && participation.confirmed && (
                          <Button
                            onClick={() => downloadCertificate(participation.participation_id)}
                            className="bg-green-600 hover:bg-green-700"
                            data-testid="download-certificate-button"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Urkunde herunterladen
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          onClick={() => setCancelDialog({ open: true, registration: item })}
                          className="border-red-200 text-red-600 hover:bg-red-50"
                          data-testid="cancel-registration-button"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Abmelden
                        </Button>
                      </div>
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

      {/* Cancel Dialog */}
      <AlertDialog open={cancelDialog.open} onOpenChange={(open) => setCancelDialog({ ...cancelDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anmeldung stornieren?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie Ihre Anmeldung für "{cancelDialog.registration?.training.title}" wirklich stornieren?
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={canceling}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={canceling}
              className="bg-red-600 hover:bg-red-700"
            >
              {canceling ? "Storniere..." : "Stornieren"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default MyRegistrationsPage;
