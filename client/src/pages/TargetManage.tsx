import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import type { Target, InsertTarget } from "@shared/schema";
import { getApiKey } from "@/lib/auth";
import { TargetForm } from "@/components/TargetForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function TargetManage() {
  const [, params] = useRoute("/targets/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const targetId = params?.id === 'new' ? null : parseInt(params?.id || '0');

  const { data: target, isLoading } = useQuery<Target>({
    queryKey: ['/api/targets', targetId],
    queryFn: async () => {
      const targets = await fetch('/api/targets', {
        headers: { 'x-api-key': getApiKey() }
      }).then(r => r.json());
      return targets.find((t: Target) => t.id === targetId);
    },
    enabled: !!targetId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertTarget) => {
      await apiRequest('POST', '/api/targets', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/targets'] });
      toast({
        title: "Target created",
        description: "The monitoring target has been added successfully.",
      });
      setLocation('/');
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create target",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertTarget) => {
      await apiRequest('PUT', `/api/targets/${targetId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/targets'] });
      toast({
        title: "Target updated",
        description: "The monitoring target has been updated successfully.",
      });
      setLocation('/');
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update target",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (targetId && isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading target...</div>
      </div>
    );
  }

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

      <main className="container mx-auto px-6 py-6 max-w-2xl">
        <TargetForm
          target={target}
          onSubmit={(data) => {
            if (targetId) {
              updateMutation.mutate(data);
            } else {
              createMutation.mutate(data);
            }
          }}
          onCancel={() => setLocation('/')}
          isPending={createMutation.isPending || updateMutation.isPending}
        />
      </main>
    </div>
  );
}
