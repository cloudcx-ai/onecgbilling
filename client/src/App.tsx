import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Dashboard from "@/pages/Dashboard.tsx";
import TargetManage from "@/pages/TargetManage.tsx";
import Results from "@/pages/Results.tsx";
import Logs from "@/pages/Logs.tsx";
import Channels from "@/pages/Channels.tsx";
import ChannelManage from "@/pages/ChannelManage.tsx";
import AwsAccounts from "@/pages/AwsAccounts.tsx";
import AwsAccountManage from "@/pages/AwsAccountManage.tsx";
import Login from "@/pages/Login.tsx";
import Profile from "@/pages/Profile.tsx";
import AdminUsers from "@/pages/AdminUsers.tsx";
import NotFound from "@/pages/not-found.tsx";

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <Component {...rest} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/profile">
        {() => <ProtectedRoute component={Profile} />}
      </Route>
      <Route path="/admin/users">
        {() => <ProtectedRoute component={AdminUsers} />}
      </Route>
      <Route path="/targets/new">
        {() => <ProtectedRoute component={TargetManage} />}
      </Route>
      <Route path="/targets/:id">
        {(params) => <ProtectedRoute component={TargetManage} params={params} />}
      </Route>
      <Route path="/results/:targetId">
        {(params) => <ProtectedRoute component={Results} params={params} />}
      </Route>
      <Route path="/logs">
        {() => <ProtectedRoute component={Logs} />}
      </Route>
      <Route path="/channels">
        {() => <ProtectedRoute component={Channels} />}
      </Route>
      <Route path="/channels/new">
        {() => <ProtectedRoute component={ChannelManage} />}
      </Route>
      <Route path="/channels/:id">
        {(params) => <ProtectedRoute component={ChannelManage} params={params} />}
      </Route>
      <Route path="/aws-accounts">
        {() => <ProtectedRoute component={AwsAccounts} />}
      </Route>
      <Route path="/aws-accounts/new">
        {() => <ProtectedRoute component={AwsAccountManage} />}
      </Route>
      <Route path="/aws-accounts/:id">
        {(params) => <ProtectedRoute component={AwsAccountManage} params={params} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
