import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useRoute, useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import type { NotificationChannel } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["email", "slack", "pagerduty", "webhook"]),
  enabled: z.boolean().default(true),
  config: z.string().min(1, "Configuration is required"),
});

export default function ChannelManage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/channels/:id");
  const isEdit = match && params?.id && params.id !== "new";
  const channelId = isEdit ? parseInt(params.id, 10) : undefined;

  const { data: channels } = useQuery<NotificationChannel[]>({
    queryKey: ['/api/channels'],
  });

  const channel = channels?.find(c => c.id === channelId);
  const isLoading = !channels && !!channelId;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "email",
      enabled: true,
      config: "",
    },
  });

  // Update form when channel data loads
  useEffect(() => {
    if (channel) {
      form.reset({
        name: channel.name,
        type: channel.type as any,
        enabled: channel.enabled,
        config: channel.config,
      });
    }
  }, [channel, form]);

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      if (isEdit && channelId) {
        return apiRequest('PUT', `/api/channels/${channelId}`, data);
      } else {
        return apiRequest('POST', '/api/channels', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/channels'] });
      toast({
        title: isEdit ? "Channel updated" : "Channel created",
        description: `Notification channel has been ${isEdit ? 'updated' : 'created'} successfully.`,
      });
      navigate('/channels');
    },
    onError: (error: Error) => {
      toast({
        title: isEdit ? "Update failed" : "Create failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    // Validate JSON config
    try {
      JSON.parse(data.config);
    } catch (e) {
      form.setError('config', { message: 'Configuration must be valid JSON' });
      return;
    }
    createMutation.mutate(data);
  };

  const channelType = form.watch('type');

  const getConfigPlaceholder = (type: string) => {
    switch (type) {
      case 'email':
        return '{"email": "alerts@example.com"}';
      case 'slack':
        return '{"webhookUrl": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"}';
      case 'pagerduty':
        return '{"routingKey": "YOUR_ROUTING_KEY"}';
      case 'webhook':
        return '{"url": "https://your-api.com/alerts", "method": "POST", "headers": {"Authorization": "Bearer TOKEN"}}';
      default:
        return '{}';
    }
  };

  const getConfigDescription = (type: string) => {
    switch (type) {
      case 'email':
        return 'JSON with "email" field containing recipient address';
      case 'slack':
        return 'JSON with "webhookUrl" field from Slack incoming webhooks';
      case 'pagerduty':
        return 'JSON with "routingKey" from PagerDuty integration';
      case 'webhook':
        return 'JSON with "url" (required), "method" (default: POST), and optional "headers"';
      default:
        return 'Channel-specific configuration as JSON';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/channels')} data-testid="button-back">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-card-foreground">
                {isEdit ? 'Edit Channel' : 'Add Notification Channel'}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Configure alert delivery settings
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>{isEdit ? 'Update' : 'Create'} Notification Channel</CardTitle>
            <CardDescription>
              Set up where alerts should be sent when targets change status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Channel Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Production Alerts"
                          {...field}
                          data-testid="input-name"
                        />
                      </FormControl>
                      <FormDescription>
                        A descriptive name for this notification channel
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Channel Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-type">
                            <SelectValue placeholder="Select channel type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="slack">Slack</SelectItem>
                          <SelectItem value="pagerduty">PagerDuty</SelectItem>
                          <SelectItem value="webhook">Webhook</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Type of notification service to use
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="config"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Configuration (JSON)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={getConfigPlaceholder(channelType)}
                          className="font-mono text-sm"
                          rows={6}
                          {...field}
                          data-testid="input-config"
                        />
                      </FormControl>
                      <FormDescription>
                        {getConfigDescription(channelType)}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="enabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Enabled</FormLabel>
                        <FormDescription>
                          Receive notifications through this channel
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

                <div className="flex gap-3">
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending}
                    data-testid="button-submit"
                  >
                    {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {isEdit ? 'Update Channel' : 'Create Channel'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => navigate('/channels')}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
