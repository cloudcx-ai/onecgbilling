import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AddClientDialog } from "@/components/add-client-dialog";
import { BillingReport } from "@/components/billing-report";
import { Button } from "@/components/ui/button";
import { Building2, LogOut, Loader2 } from "lucide-react";
import type { Client } from "@shared/schema";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/check", {
          credentials: "include",
        });
        const data = await response.json();
        
        if (!data.isAuthenticated) {
          setLocation("/login");
        }
      } catch (error) {
        setLocation("/login");
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, [setLocation]);

  // Fetch clients
  const { data: clients, isLoading: clientsLoading, error: clientsError } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: !isCheckingAuth,
  });

  const selectedClient = clients?.find((c) => c.id === selectedClientId);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setLocation("/login");
  };

  // Show loading spinner while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  const sidebarStyle = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar
          clients={clients || []}
          selectedClientId={selectedClientId}
          onSelectClient={setSelectedClientId}
          onAddClient={() => setIsAddDialogOpen(true)}
          isLoading={clientsLoading}
        />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between p-4 border-b bg-background">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <h1 className="text-lg font-semibold">OneCG Genesys Billing</h1>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </header>
          <main className="flex-1 overflow-y-auto p-8">
            {clientsError ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-destructive mb-4">Failed to load clients</p>
                <Button onClick={() => window.location.reload()}>Retry</Button>
              </div>
            ) : selectedClient ? (
              <BillingReport
                clientId={selectedClient.id}
                clientName={selectedClient.name}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">No Client Selected</h2>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Select a client from the sidebar to view their billing reports, or add a new client
                  to get started.
                </p>
                <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-first-client">
                  <Building2 className="h-4 w-4 mr-2" />
                  Add Your First Client
                </Button>
              </div>
            )}
          </main>
        </div>
      </div>

      <AddClientDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
    </SidebarProvider>
  );
}
