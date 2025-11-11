import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import type { Target, Result } from "@shared/schema";
import { getApiKey } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { ArrowLeft, Activity, Clock, Code } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function Results() {
  const [, params] = useRoute("/results/:targetId");
  const [, setLocation] = useLocation();
  const targetId = parseInt(params?.targetId || '0');

  const { data: targets = [] } = useQuery<Target[]>({
    queryKey: ['/api/targets'],
  });

  const target = targets.find(t => t.id === targetId);

  const { data: results = [], isLoading } = useQuery<Result[]>({
    queryKey: ['/api/results', targetId],
    queryFn: async () => {
      const response = await fetch(`/api/results/${targetId}`, {
        headers: { 'x-api-key': getApiKey() }
      });
      return response.json();
    },
  });

  const upCount = results.filter(r => r.status === 'UP').length;
  const downCount = results.filter(r => r.status === 'DOWN').length;
  const uptimePercent = results.length > 0 ? ((upCount / results.length) * 100).toFixed(2) : '0.00';
  const avgLatency = results.length > 0 
    ? Math.round(results.reduce((sum, r) => sum + r.latencyMs, 0) / results.length)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/')}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6">
        {target && (
          <div className="mb-6">
            <h1 className="text-2xl font-semibold mb-2">{target.name}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Badge variant="outline">{target.type}</Badge>
              <span className="font-mono">{target.endpoint}</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {target.frequencySec}s interval
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Uptime</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold" data-testid="text-uptime">{uptimePercent}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {upCount} UP / {downCount} DOWN
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold" data-testid="text-avg-latency">{avgLatency}ms</div>
              <p className="text-xs text-muted-foreground mt-1">
                Response time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Checks</CardTitle>
              <Code className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold" data-testid="text-total-checks">{results.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Last 200 results
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Check Results History</CardTitle>
            <CardDescription>Latest 200 health check results</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading results...</div>
            ) : results.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No check results yet. Monitoring will begin shortly.
              </div>
            ) : (
              <div className="relative overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Latency</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result) => (
                      <TableRow key={result.id} data-testid={`row-result-${result.id}`}>
                        <TableCell className="text-sm">
                          {new Date(result.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={result.status as 'UP' | 'DOWN'} />
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {result.latencyMs}ms
                        </TableCell>
                        <TableCell>
                          {result.code ? (
                            <span className="font-mono text-sm px-2 py-1 rounded bg-muted">
                              {result.code}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground max-w-md truncate">
                          {result.message || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
