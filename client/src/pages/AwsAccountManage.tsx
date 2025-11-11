import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useRoute, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Home } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

const createFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  region: z.string().min(1, "Region is required"),
  accessKeyId: z.string().min(1, "Access Key ID is required"),
  secretAccessKey: z.string().min(1, "Secret Access Key is required"),
  enabled: z.boolean().default(true),
});

const updateFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  region: z.string().min(1, "Region is required"),
  accessKeyId: z.string().optional(),
  secretAccessKey: z.string().optional(),
  enabled: z.boolean().default(true),
});

type AwsAccount = {
  id: number;
  name: string;
  region: string;
  enabled: boolean;
  createdAt: string;
};

export default function AwsAccountManage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/aws-accounts/:id");
  const isEdit = match && params?.id && params.id !== "new";
  const accountId = isEdit ? parseInt(params.id, 10) : undefined;

  const { data: accounts } = useQuery<AwsAccount[]>({
    queryKey: ['/api/aws-accounts'],
  });

  const account = accounts?.find(a => a.id === accountId);
  const isLoading = !accounts && !!accountId;

  const formSchema = isEdit ? updateFormSchema : createFormSchema;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      region: "us-east-1",
      accessKeyId: "",
      secretAccessKey: "",
      enabled: true,
    },
  });

  useEffect(() => {
    if (account) {
      form.reset({
        name: account.name,
        region: account.region,
        enabled: account.enabled,
      });
    }
  }, [account, form]);

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      return apiRequest('POST', '/api/aws-accounts', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/aws-accounts'] });
      toast({
        title: "Success",
        description: "AWS account created successfully",
      });
      navigate("/aws-accounts");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      return apiRequest('PUT', `/api/aws-accounts/${accountId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/aws-accounts'] });
      toast({
        title: "Success",
        description: "AWS account updated successfully",
      });
      navigate("/aws-accounts");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: z.infer<typeof formSchema>) {
    if (isEdit) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex gap-2 mb-4">
          <Button 
            variant="ghost"
            onClick={() => navigate("/")}
            data-testid="button-home"
          >
            <Home className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
          <Button 
            variant="ghost"
            onClick={() => navigate("/aws-accounts")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            AWS Accounts
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {isEdit ? "Edit AWS Account" : "Add AWS Account"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Production AWS Account" 
                          {...field}
                          data-testid="input-name"
                        />
                      </FormControl>
                      <FormDescription>
                        A friendly name to identify this AWS account
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="region"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>AWS Region</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="us-east-1" 
                          {...field}
                          data-testid="input-region"
                        />
                      </FormControl>
                      <FormDescription>
                        The AWS region for CloudWatch Logs access (e.g., us-east-1, eu-west-2)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accessKeyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Access Key ID {isEdit && "(optional)"}</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder={isEdit ? "Leave blank to keep existing" : "AKIAIOSFODNN7EXAMPLE"}
                          {...field}
                          data-testid="input-access-key"
                        />
                      </FormControl>
                      <FormDescription>
                        {isEdit 
                          ? "Only provide if you want to update the access key" 
                          : "AWS IAM access key ID with CloudWatch Logs read permissions"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="secretAccessKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Secret Access Key {isEdit && "(optional)"}</FormLabel>
                      <FormControl>
                        <Input 
                          type="password"
                          placeholder={isEdit ? "Leave blank to keep existing" : "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"}
                          {...field}
                          data-testid="input-secret-key"
                        />
                      </FormControl>
                      <FormDescription>
                        {isEdit 
                          ? "Only provide if you want to update the secret key (encrypted at rest)" 
                          : "AWS IAM secret access key (encrypted at rest)"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Enabled
                        </FormLabel>
                        <FormDescription>
                          Allow this account to be used for CloudWatch Logs queries
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-enabled"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-submit"
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? "Saving..."
                      : isEdit
                      ? "Update Account"
                      : "Create Account"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/aws-accounts")}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
