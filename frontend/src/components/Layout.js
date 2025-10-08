import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { GraduationCap, LogOut, Home, BookOpen, Calendar, Users, Settings, UserCog, FileText, Menu, X } from "lucide-react";

const ResponsiveLayout = ({ user, onLogout, children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: "/", label: "Dashboard", icon: Home, testId: "nav-dashboard" },
    { path: "/trainings", label: "Katalog", icon: BookOpen, testId: "nav-catalog" },
    { path: "/my-registrations", label: "Anmeldungen", icon: Calendar, testId: "nav-registrations" },
    { path: "/my-trainings", label: "Meine Angebote", icon: Users, testId: "nav-my-trainings" }
  ];

  const adminNavItems = [
    { path: "/admin/settings", label: "Einstellungen", icon: Settings, testId: "nav-admin-settings" },
    { path: "/admin/users", label: "Benutzer", icon: UserCog, testId: "nav-admin-users" },
    { path: "/admin/logs", label: "Protokoll", icon: FileText, testId: "nav-admin-logs" }
  ];

  const handleNavigation = (path) => {
    navigate(path);
    setSidebarOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-white rounded-lg shadow-lg flex items-center justify-center border border-slate-200"
        data-testid="mobile-menu-button"
      >
        {sidebarOpen ? <X className="w-6 h-6 text-slate-700" /> : <Menu className="w-6 h-6 text-slate-700" />}
      </button>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 bg-white shadow-xl border-r border-slate-200 flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-md">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-lg">Fortbildung</h2>
              <p className="text-xs text-slate-500">MSO System</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="mb-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">Hauptmenü</p>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all ${
                    isActive(item.path)
                      ? "bg-blue-50 text-blue-700 font-medium shadow-sm"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                  data-testid={item.testId}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm">{item.label}</span>
                </button>
              );
            })}
          </div>

          {user.role === "admin" && (
            <div className="pt-4 border-t border-slate-200">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">Administration</p>
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all ${
                      isActive(item.path)
                        ? "bg-orange-50 text-orange-700 font-medium shadow-sm"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                    data-testid={item.testId}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm">{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="bg-slate-50 rounded-lg p-3 mb-3">
            <p className="text-sm font-medium text-slate-800">{user.name}</p>
            <p className="text-xs text-slate-500">{user.email}</p>
            <p className="text-xs text-slate-400 mt-1">
              {user.role === "admin" ? "Administrator" : "Benutzer"}
            </p>
          </div>
          <Button
            onClick={onLogout}
            variant="outline"
            className="w-full justify-start border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
            data-testid="logout-button"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Abmelden
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-4 lg:p-8 mt-16 lg:mt-0">
          {children}
        </div>
      </main>
    </div>
  );
};

export default ResponsiveLayout;
