import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { LogEvent } from "@shared/schema";
import { getApiKey } from "@/lib/auth";

type AwsAccount = {
  id: number;
  name: string;
  region: string;
  enabled: boolean;
};
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Search, Download } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function Logs() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [logGroup, setLogGroup] = useState('');
  const [filterPattern, setFilterPattern] = useState('');
  const [timeRange, setTimeRange] = useState('3600');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [logs, setLogs] = useState<LogEvent[]>([]);

  const { data: awsAccounts } = useQuery<AwsAccount[]>({
    queryKey: ['/api/aws-accounts'],
  });

  const enabledAccounts = awsAccounts?.filter(acc => acc.enabled) || [];

  const searchMutation = useMutation({
    mutationFn: async () => {
      if (!logGroup) {
        throw new Error('Log group is required');
      }
      
      const params = new URLSearchParams({
        group: logGroup,
        since: timeRange,
      });
      
      if (filterPattern) {
        params.append('q', filterPattern);
      }

      if (selectedAccountId) {
        params.append('accountId', selectedAccountId);
      }

      const response = await fetch(`/api/logs?${params}`, {
        headers: { 'x-api-key': getApiKey() }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch logs');
      }

      return response.json();
    },
    onSuccess: (data: LogEvent[]) => {
      setLogs(data);
      toast({
        title: "Logs loaded",
        description: `Retrieved ${data.length} log entries`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to load logs",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const downloadLogs = () => {
    const content = logs.map(log => 
      `${new Date(log.ts).toISOString()} [${log.stream}]\n${log.message}`
    ).join('\n\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cloudwatch-logs-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
        <h1 className="text-2xl font-semibold mb-6">CloudWatch Logs</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Query Logs</CardTitle>
            <CardDescription>
              Search CloudWatch Logs using filter patterns and time ranges
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label>AWS Account</Label>
                <Select
                  value={selectedAccountId}
                  onValueChange={setSelectedAccountId}
                >
                  <SelectTrigger data-testid="select-aws-account">
                    <SelectValue placeholder="Select AWS account" />
                  </SelectTrigger>
                  <SelectContent>
                    {enabledAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id.toString()}>
                        {account.name} ({account.region})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select AWS account for CloudWatch access {enabledAccounts.length === 0 && "(no accounts configured)"}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logGroup">Log Group Name</Label>
                <Input
                  id="logGroup"
                  placeholder="/aws/lambda/my-function"
                  value={logGroup}
                  onChange={(e) => setLogGroup(e.target.value)}
                  className="font-mono text-sm"
                  data-testid="input-log-group"
                />
                <p className="text-xs text-muted-foreground">
                  CloudWatch log group path
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="filterPattern">Filter Pattern (Optional)</Label>
                <Input
                  id="filterPattern"
                  placeholder="ERROR"
                  value={filterPattern}
                  onChange={(e) => setFilterPattern(e.target.value)}
                  className="font-mono text-sm"
                  data-testid="input-filter-pattern"
                />
                <p className="text-xs text-muted-foreground">
                  CloudWatch filter pattern syntax
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeRange">Time Range</Label>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger id="timeRange" data-testid="select-time-range">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="300">Last 5 minutes</SelectItem>
                    <SelectItem value="900">Last 15 minutes</SelectItem>
                    <SelectItem value="1800">Last 30 minutes</SelectItem>
                    <SelectItem value="3600">Last hour</SelectItem>
                    <SelectItem value="21600">Last 6 hours</SelectItem>
                    <SelectItem value="86400">Last 24 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={() => searchMutation.mutate()}
                disabled={searchMutation.isPending || !logGroup}
                data-testid="button-search-logs"
              >
                <Search className="h-4 w-4 mr-2" />
                {searchMutation.isPending ? 'Searching...' : 'Search Logs'}
              </Button>
              {logs.length > 0 && (
                <Button 
                  variant="outline" 
                  onClick={downloadLogs}
                  data-testid="button-download-logs"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Log Entries</CardTitle>
            <CardDescription>
              {logs.length > 0 ? `Showing ${logs.length} log entries` : 'No logs loaded'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Enter a log group name and click Search to view logs
              </div>
            ) : (
              <div className="bg-slate-950 text-slate-50 rounded-lg p-4 overflow-auto max-h-[600px] font-mono text-sm">
                {logs.map((log, idx) => (
                  <div 
                    key={idx} 
                    className="mb-4 pb-4 border-b border-slate-800 last:border-0"
                    data-testid={`log-entry-${idx}`}
                  >
                    <div className="text-xs text-slate-400 mb-1">
                      {new Date(log.ts).toISOString()} • {log.stream}
                    </div>
                    <div className="whitespace-pre-wrap break-words">
                      {log.message}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
