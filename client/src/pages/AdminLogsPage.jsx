import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import axios from "axios";
import { API } from "@/App";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileText } from "lucide-react";

const AdminLogsPage = ({ user, onLogout }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await axios.get(`${API}/admin/logs`);
      setLogs(response.data);
    } catch (error) {
      console.error("Error fetching logs:", error);
      toast.error("Fehler beim Laden der Protokolle");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  const getActionColor = (action) => {
    if (action.includes("erstellt")) return "bg-green-100 text-green-800";
    if (action.includes("aktualisiert") || action.includes("geändert")) return "bg-blue-100 text-blue-800";
    if (action.includes("gelöscht")) return "bg-red-100 text-red-800";
    return "bg-slate-100 text-slate-800";
  };

  if (loading) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-slate-600">Lade Protokolle...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="space-y-6" data-testid="admin-logs-page">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Änderungsprotokoll</h1>
          <p className="text-slate-600 mt-2">{logs.length} Protokolleinträge</p>
        </div>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Aktivitätsverlauf</CardTitle>
            <CardDescription>
              Alle Änderungen an Fortbildungen im System
            </CardDescription>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <div className="text-center py-8 text-slate-600">
                Keine Protokolleinträge vorhanden
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => (
                  <div
                    key={log.log_id}
                    className="flex items-start space-x-4 p-4 rounded-lg bg-slate-50 border border-slate-200"
                    data-testid="log-item"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge className={getActionColor(log.action)}>
                          {log.action}
                        </Badge>
                        <span className="text-xs text-slate-500">
                          {formatDate(log.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-800">
                        <span className="font-medium">{log.user_name}</span>
                      </p>
                      {log.changes && Object.keys(log.changes).length > 0 && (
                        <div className="mt-2 p-2 bg-white rounded text-xs text-slate-600 border border-slate-200">
                          <pre className="whitespace-pre-wrap overflow-x-auto">
                            {JSON.stringify(log.changes, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AdminLogsPage;
