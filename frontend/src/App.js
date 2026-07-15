import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import TrainingsPage from "@/pages/TrainingsPage";
import MyTrainingsPage from "@/pages/MyTrainingsPage";
import MyRegistrationsPage from "@/pages/MyRegistrationsPage";
import CreateTrainingPage from "@/pages/CreateTrainingPage";
import EditTrainingPage from "@/pages/EditTrainingPage";
import ParticipantsPage from "@/pages/ParticipantsPage";
import AdminSettingsPage from "@/pages/AdminSettingsPage";
import AdminUsersPage from "@/pages/AdminUsersPage";
import AdminLogsPage from "@/pages/AdminLogsPage";
import { Toaster } from "@/components/ui/sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export { API };

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleUrlToken = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get("token") || urlParams.get("jwt");
      
      if (urlToken) {
        try {
          setLoading(true);
          const response = await axios.post(`${API}/auth/login-jwt`, { token: urlToken });
          const { token, user: userData } = response.data;
          
          localStorage.setItem("token", token);
          axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          setUser(userData);
          
          // Clear query params from URL
          urlParams.delete("token");
          urlParams.delete("jwt");
          const newSearch = urlParams.toString();
          const newUrl = `${window.location.pathname}${newSearch ? "?" + newSearch : ""}${window.location.hash}`;
          window.history.replaceState({}, document.title, newUrl);
        } catch (error) {
          console.error("JWT login failed:", error);
          const existingToken = localStorage.getItem("token");
          if (existingToken) {
            axios.defaults.headers.common["Authorization"] = `Bearer ${existingToken}`;
            await fetchUser();
          } else {
            setLoading(false);
          }
        }
      } else {
        const token = localStorage.getItem("token");
        if (token) {
          axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          await fetchUser();
        } else {
          setLoading(false);
        }
      }
    };

    handleUrlToken();
  }, []);


  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error("Error fetching user:", error);
      localStorage.removeItem("token");
      delete axios.defaults.headers.common["Authorization"];
    } finally {
      setLoading(false);
    }
  };

  const login = (token, userData) => {
    localStorage.setItem("token", token);
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("token");
    delete axios.defaults.headers.common["Authorization"];
    setUser(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-600 font-medium">Lädt...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <Toaster position="top-right" />
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={!user ? <LoginPage onLogin={login} /> : <Navigate to="/" />}
          />
          <Route
            path="/"
            element={user ? <DashboardPage user={user} onLogout={logout} /> : <Navigate to="/login" />}
          />
          <Route
            path="/trainings"
            element={user ? <TrainingsPage user={user} onLogout={logout} /> : <Navigate to="/login" />}
          />
          <Route
            path="/my-trainings"
            element={user ? <MyTrainingsPage user={user} onLogout={logout} /> : <Navigate to="/login" />}
          />
          <Route
            path="/my-registrations"
            element={user ? <MyRegistrationsPage user={user} onLogout={logout} /> : <Navigate to="/login" />}
          />
          <Route
            path="/create-training"
            element={user ? <CreateTrainingPage user={user} onLogout={logout} /> : <Navigate to="/login" />}
          />
          <Route
            path="/edit-training/:trainingId"
            element={user ? <EditTrainingPage user={user} onLogout={logout} /> : <Navigate to="/login" />}
          />
          <Route
            path="/participants/:trainingId"
            element={user ? <ParticipantsPage user={user} onLogout={logout} /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin/settings"
            element={
              user && user.role === "admin" ? (
                <AdminSettingsPage user={user} onLogout={logout} />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/admin/users"
            element={
              user && user.role === "admin" ? (
                <AdminUsersPage user={user} onLogout={logout} />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/admin/logs"
            element={
              user && user.role === "admin" ? (
                <AdminLogsPage user={user} onLogout={logout} />
              ) : (
                <Navigate to="/" />
              )
            }
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
