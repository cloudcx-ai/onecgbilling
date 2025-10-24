import { Building2, Plus, Loader2 } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import type { Client } from "@shared/schema";

interface AppSidebarProps {
  clients: Client[];
  selectedClientId: string | null;
  onSelectClient: (clientId: string) => void;
  onAddClient: () => void;
  isLoading?: boolean;
}

export function AppSidebar({
  clients,
  selectedClientId,
  onSelectClient,
  onAddClient,
  isLoading = false,
}: AppSidebarProps) {
  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Clients</h2>
        </div>
        <Button
          onClick={onAddClient}
          className="w-full"
          size="sm"
          data-testid="button-add-client"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Your Clients</SidebarGroupLabel>
          <SidebarGroupContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Loading clients...</span>
              </div>
            ) : clients.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                No clients yet. Add your first client to get started.
              </div>
            ) : (
              <SidebarMenu>
                {clients.map((client) => (
                  <SidebarMenuItem key={client.id}>
                    <SidebarMenuButton
                      onClick={() => onSelectClient(client.id)}
                      isActive={selectedClientId === client.id}
                      data-testid={`button-client-${client.id}`}
                    >
                      <Building2 className="h-4 w-4" />
                      <span className="truncate">{client.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
