import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import type { Target, CheckResultEvent } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Activity, 
  Server, 
  Clock, 
  TrendingUp, 
  Plus, 
  Pencil, 
  Trash2,
  Eye,
  Wifi,
  WifiOff,
  Bell,
  Cloud,
  LogOut,
  User,
  Shield
} from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function Dashboard() {
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [deleteTarget, setDeleteTarget] = useState<Target | null>(null);
  const [targetStatuses, setTargetStatuses] = useState<Map<number, CheckResultEvent>>(new Map());
  const { isConnected, subscribe } = useWebSocket();

  const handleLogout = async () => {
    await logout();
    setLocation('/login');
  };

  const { data: targets = [], isLoading } = useQuery<Target[]>({
    queryKey: ['/api/targets'],
  });

  useEffect(() => {
    const unsubscribe = subscribe((event) => {
      setTargetStatuses(prev => new Map(prev).set(event.targetId, event));
    });
    return unsubscribe;
  }, [subscribe]);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/targets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/targets'] });
      toast({
        title: "Target deleted",
        description: "The monitoring target has been removed.",
      });
      setDeleteTarget(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const upCount = Array.from(targetStatuses.values()).filter(e => e.status === 'UP').length;
  const downCount = Array.from(targetStatuses.values()).filter(e => e.status === 'DOWN').length;
  const avgLatency = targetStatuses.size > 0 
    ? Math.round(Array.from(targetStatuses.values()).reduce((sum, e) => sum + e.latency, 0) / targetStatuses.size)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-card-foreground">CloudCX Monitor</h1>
              <p className="text-sm text-muted-foreground mt-1">Real-time endpoint monitoring and alerting</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm" data-testid="text-websocket-status">
                {isConnected ? (
                  <>
                    <Wifi className="h-4 w-4 text-status-up" />
                    <span className="text-muted-foreground">Live</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4 text-status-down" />
                    <span className="text-muted-foreground">Disconnected</span>
                  </>
                )}
              </div>
              <Link href="/channels">
                <Button variant="outline" data-testid="button-channels">
                  <Bell className="h-4 w-4 mr-2" />
                  Channels
                </Button>
              </Link>
              <Link href="/aws-accounts">
                <Button variant="outline" data-testid="button-aws-accounts">
                  <Cloud className="h-4 w-4 mr-2" />
                  AWS Accounts
                </Button>
              </Link>
              <Link href="/logs">
                <Button variant="outline" data-testid="button-logs">
                  CloudWatch Logs
                </Button>
              </Link>
              <Link href="/profile">
                <Button variant="outline" data-testid="button-profile">
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </Button>
              </Link>
              {user?.role === 'admin' && (
                <Link href="/admin/users">
                  <Button variant="outline" data-testid="button-admin-users">
                    <Shield className="h-4 w-4 mr-2" />
                    Users
                  </Button>
                </Link>
              )}
              <Button variant="outline" onClick={handleLogout} data-testid="button-logout">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
              <Link href="/targets/new">
                <Button data-testid="button-add-target">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Target
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Targets</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold" data-testid="text-total-targets">{targets.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {targets.filter(t => t.enabled).length} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status UP</CardTitle>
              <Activity className="h-4 w-4 text-status-up" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-status-up" data-testid="text-up-count">{upCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Healthy endpoints
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status DOWN</CardTitle>
              <Activity className="h-4 w-4 text-status-down" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-status-down" data-testid="text-down-count">{downCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Failed checks
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold" data-testid="text-avg-latency">{avgLatency}ms</div>
              <p className="text-xs text-muted-foreground mt-1">
                Response time
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Monitoring Targets</CardTitle>
            <CardDescription>Manage and monitor your endpoints</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading targets...</div>
            ) : targets.length === 0 ? (
              <div className="text-center py-12">
                <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No targets configured</h3>
                <p className="text-muted-foreground mb-4">
                  Get started by adding your first monitoring target
                </p>
                <Link href="/targets/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Target
                  </Button>
                </Link>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Last Check</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {targets.map((target) => {
                    const lastCheck = targetStatuses.get(target.id);
                    return (
                      <TableRow key={target.id} data-testid={`row-target-${target.id}`}>
                        <TableCell className="font-medium">{target.name}</TableCell>
                        <TableCell>
                          <span className="text-xs font-medium px-2 py-1 rounded bg-muted">
                            {target.type}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground max-w-xs truncate">
                          {target.endpoint}
                        </TableCell>
                        <TableCell>
                          {lastCheck ? (
                            <StatusBadge status={lastCheck.status} />
                          ) : (
                            <StatusBadge status="PENDING" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {target.frequencySec}s
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {lastCheck ? (
                            <div>
                              <div>{new Date(lastCheck.at).toLocaleTimeString()}</div>
                              <div className="text-xs">{lastCheck.latency}ms</div>
                            </div>
                          ) : (
                            <span>No data</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Link href={`/results/${target.id}`}>
                              <Button size="icon" variant="ghost" data-testid={`button-view-${target.id}`}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link href={`/targets/${target.id}`}>
                              <Button size="icon" variant="ghost" data-testid={`button-edit-${target.id}`}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button 
                              size="icon" 
                              variant="ghost"
                              onClick={() => setDeleteTarget(target)}
                              data-testid={`button-delete-${target.id}`}
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

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete monitoring target?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteTarget?.name}" and all associated check results.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
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
