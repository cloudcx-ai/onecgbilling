import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import type { NotificationChannel } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Bell, Mail, MessageSquare, Phone, Webhook, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

const channelIcons = {
  email: Mail,
  slack: MessageSquare,
  pagerduty: Phone,
  webhook: Webhook,
};

export default function Channels() {
  const { toast } = useToast();
  const [deleteChannel, setDeleteChannel] = useState<NotificationChannel | null>(null);

  const { data: channels = [], isLoading } = useQuery<NotificationChannel[]>({
    queryKey: ['/api/channels'],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/channels/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/channels'] });
      toast({
        title: "Channel deleted",
        description: "The notification channel has been removed.",
      });
      setDeleteChannel(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon" data-testid="button-back">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-semibold text-card-foreground">Notification Channels</h1>
                <p className="text-sm text-muted-foreground mt-1">Manage alert delivery channels</p>
              </div>
            </div>
            <Link href="/channels/new">
              <Button data-testid="button-add-channel">
                <Plus className="h-4 w-4 mr-2" />
                Add Channel
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Active Channels</CardTitle>
            <CardDescription>
              Configure where alerts are sent when target status changes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading channels...</div>
            ) : channels.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No channels configured</h3>
                <p className="text-muted-foreground mb-4">
                  Add your first notification channel to receive alerts
                </p>
                <Link href="/channels/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Channel
                  </Button>
                </Link>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Configuration</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {channels.map((channel) => {
                    const Icon = channelIcons[channel.type as keyof typeof channelIcons] || Bell;
                    let configSummary = '';
                    try {
                      const config = JSON.parse(channel.config);
                      if (channel.type === 'email') configSummary = config.email;
                      else if (channel.type === 'slack') configSummary = config.webhookUrl?.substring(0, 50) + '...';
                      else if (channel.type === 'pagerduty') configSummary = 'Routing key configured';
                      else if (channel.type === 'webhook') configSummary = config.url;
                    } catch (e) {
                      configSummary = 'Invalid configuration';
                    }

                    return (
                      <TableRow key={channel.id} data-testid={`row-channel-${channel.id}`}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            {channel.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {channel.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {channel.enabled ? (
                            <Badge variant="default" className="bg-status-up">Enabled</Badge>
                          ) : (
                            <Badge variant="secondary">Disabled</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground max-w-xs truncate">
                          {configSummary}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Link href={`/channels/${channel.id}`}>
                              <Button size="icon" variant="ghost" data-testid={`button-edit-${channel.id}`}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button 
                              size="icon" 
                              variant="ghost"
                              onClick={() => setDeleteChannel(channel)}
                              data-testid={`button-delete-${channel.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      <AlertDialog open={!!deleteChannel} onOpenChange={() => setDeleteChannel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete notification channel?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteChannel?.name}". Alerts will no longer be sent to this channel.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteChannel && deleteMutation.mutate(deleteChannel.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
