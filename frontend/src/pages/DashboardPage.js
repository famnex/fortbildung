import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { BookOpen, Users, Calendar, Settings, FileText, UserCog } from "lucide-react";

const DashboardPage = ({ user, onLogout }) => {
  const navigate = useNavigate();

  const userActions = [
    {
      title: "Fortbildungskatalog",
      description: "Alle verfügbaren Fortbildungen durchsuchen",
      icon: BookOpen,
      color: "from-blue-500 to-blue-600",
      path: "/trainings",
      testId: "dashboard-catalog-button"
    },
    {
      title: "Meine Anmeldungen",
      description: "Ihre registrierten Fortbildungen verwalten",
      icon: Calendar,
      color: "from-green-500 to-green-600",
      path: "/my-registrations",
      testId: "dashboard-registrations-button"
    },
    {
      title: "Meine Angebote",
      description: "Ihre eigenen Fortbildungen erstellen und verwalten",
      icon: Users,
      color: "from-purple-500 to-purple-600",
      path: "/my-trainings",
      testId: "dashboard-my-trainings-button"
    }
  ];

  const adminActions = [
    {
      title: "Einstellungen",
      description: "LDAP, SMTP und Schulinformationen konfigurieren",
      icon: Settings,
      color: "from-orange-500 to-orange-600",
      path: "/admin/settings",
      testId: "dashboard-settings-button"
    },
    {
      title: "Benutzerverwaltung",
      description: "Benutzer und Rollen verwalten",
      icon: UserCog,
      color: "from-indigo-500 to-indigo-600",
      path: "/admin/users",
      testId: "dashboard-users-button"
    },
    {
      title: "Änderungsprotokoll",
      description: "Alle Änderungen an Fortbildungen einsehen",
      icon: FileText,
      color: "from-teal-500 to-teal-600",
      path: "/admin/logs",
      testId: "dashboard-logs-button"
    }
  ];

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="space-y-8" data-testid="dashboard-page">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Willkommen, {user.name}!</h1>
          <p className="text-slate-600 mt-2">Was möchten Sie heute tun?</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Ihre Aktionen</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userActions.map((action) => {
              const Icon = action.icon;
              return (
                <Card
                  key={action.path}
                  className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-0 overflow-hidden"
                  onClick={() => navigate(action.path)}
                  data-testid={action.testId}
                >
                  <CardHeader>
                    <div className={`w-12 h-12 bg-gradient-to-br ${action.color} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-lg">{action.title}</CardTitle>
                    <CardDescription>{action.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>

        {user.role === "admin" && (
          <div>
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Administration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {adminActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Card
                    key={action.path}
                    className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-0 overflow-hidden"
                    onClick={() => navigate(action.path)}
                    data-testid={action.testId}
                  >
                    <CardHeader>
                      <div className={`w-12 h-12 bg-gradient-to-br ${action.color} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <CardTitle className="text-lg">{action.title}</CardTitle>
                      <CardDescription>{action.description}</CardDescription>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default DashboardPage;
