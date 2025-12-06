import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Vacancies from "@/pages/vacancies";
import Candidates from "@/pages/candidates";
import Documentation from "@/pages/documentation";
import GoogleCalendar from "@/pages/calendar-google";
import Analytics from "@/pages/analytics";
import Admin from "@/pages/admin";
import Archive from "@/pages/archive";
import SuperAdmin from "@/pages/super-admin";

function Router() {
  const { isAuthenticated, isLoading, isSuperAdmin, superAdmin, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  // Super admin gets special panel (but only if they're not viewing a workspace)
  if (isSuperAdmin && superAdmin && !user) {
    return (
      <Switch>
        <Route path="/super-admin" component={SuperAdmin} />
        <Route component={SuperAdmin} />
      </Switch>
    );
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/vacancies" component={Vacancies} />
        <Route path="/candidates" component={Candidates} />
        <Route path="/documentation" component={Documentation} />
        <Route path="/calendar" component={GoogleCalendar} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/admin" component={Admin} />
        <Route path="/archive" component={Archive} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
