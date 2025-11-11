import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, AlertCircle, Home } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
import { useState } from "react";

type AwsAccount = {
  id: number;
  name: string;
  region: string;
  enabled: boolean;
  createdAt: string;
};

export default function AwsAccounts() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: accounts, isLoading } = useQuery<AwsAccount[]>({
    queryKey: ['/api/aws-accounts'],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/aws-accounts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/aws-accounts'] });
      toast({
        title: "Success",
        description: "AWS account deleted successfully",
      });
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">AWS Accounts</h1>
          </div>
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <Button 
          variant="ghost" 
          className="mb-4"
          onClick={() => setLocation('/')}
          data-testid="button-home"
        >
          <Home className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">AWS Accounts</h1>
            <p className="text-muted-foreground">
              Configure AWS accounts for CloudWatch Logs access
            </p>
          </div>
          <Link href="/aws-accounts/new">
            <Button data-testid="button-add-account">
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </Link>
        </div>

        {accounts && accounts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No AWS Accounts</h3>
              <p className="text-muted-foreground text-center mb-4">
                Add an AWS account to query CloudWatch Logs from different accounts
              </p>
              <Link href="/aws-accounts/new">
                <Button data-testid="button-add-first-account">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Account
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {accounts?.map((account) => (
              <Card key={account.id} data-testid={`card-account-${account.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-xl truncate">{account.name}</CardTitle>
                        <Badge 
                          variant={account.enabled ? "default" : "secondary"}
                          data-testid={`badge-status-${account.id}`}
                        >
                          {account.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Region:</span> {account.region}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/aws-accounts/${account.id}`}>
                        <Button 
                          variant="outline" 
                          size="icon"
                          data-testid={`button-edit-${account.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setDeleteId(account.id)}
                        data-testid={`button-delete-${account.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete AWS Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this AWS account configuration. You can always add it back later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
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
