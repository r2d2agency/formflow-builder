import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Public pages
import Login from "./pages/Login";
import PublicForm from "./pages/public/PublicForm";
import NotFound from "./pages/NotFound";

// Admin pages
import Dashboard from "./pages/admin/Dashboard";
import FormsList from "./pages/admin/FormsList";
import FormCreate from "./pages/admin/FormCreate";
import FormEditor from "./pages/admin/FormEditor";
import LeadsList from "./pages/admin/LeadsList";
import UsersList from "./pages/admin/UsersList";
import EvolutionInstances from "./pages/admin/EvolutionInstances";
import WebhooksPage from "./pages/admin/WebhooksPage";
import Settings from "./pages/admin/Settings";
import BrandingPage from "./pages/admin/BrandingPage";
import LinksList from "./pages/admin/LinksList";
import LinkStats from "./pages/admin/LinkStats";
import IntegrationLogsPage from "./pages/admin/IntegrationLogsPage";
import RemarketingList from "./pages/admin/RemarketingList";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Navigate to="/admin" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/f/:slug" element={<PublicForm />} />

            {/* Admin routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/forms"
              element={
                <ProtectedRoute>
                  <FormsList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/forms/new"
              element={
                <ProtectedRoute>
                  <FormCreate />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/forms/:id"
              element={
                <ProtectedRoute>
                  <FormEditor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/leads"
              element={
                <ProtectedRoute>
                  <LeadsList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute adminOnly>
                  <UsersList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/evolution"
              element={
                <ProtectedRoute>
                  <EvolutionInstances />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/webhooks"
              element={
                <ProtectedRoute adminOnly>
                  <WebhooksPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute adminOnly>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/branding"
              element={
                <ProtectedRoute adminOnly>
                  <BrandingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/links"
              element={
                <ProtectedRoute adminOnly>
                  <LinksList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/links/:id"
              element={
                <ProtectedRoute adminOnly>
                  <LinkStats />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/integrations-logs"
              element={
                <ProtectedRoute adminOnly>
                  <IntegrationLogsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/remarketing"
              element={
                <ProtectedRoute>
                  <RemarketingList />
                </ProtectedRoute>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
