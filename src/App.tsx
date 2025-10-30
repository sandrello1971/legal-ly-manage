import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { useAuth } from "./stores/auth";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ResetPassword from "./pages/auth/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import PoC from "./pages/PoC";
import Bandi from "./pages/Bandi";
import Expenses from "./pages/Expenses";
import Reports from "./pages/Reports";
import Documents from "./pages/Documents";
import Banking from "./pages/Banking";
import Settings from "./pages/Settings";
import ProjectConsuntivazione from "./pages/ProjectConsuntivazione";

const queryClient = new QueryClient();

const App = () => {
  const initialize = useAuth((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/bandi" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="bandi" element={<Bandi />} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="documents" element={<Documents />} />
              <Route path="reports" element={<Reports />} />
              <Route path="banking" element={<Banking />} />
              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<Settings />} />
              <Route path="projects/:projectId/consuntivazione" element={<ProjectConsuntivazione />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
        <Sonner />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
