import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTargetSchema, type InsertTarget, type Target } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface TargetFormProps {
  target?: Target;
  onSubmit: (data: InsertTarget) => void;
  onCancel?: () => void;
  isPending?: boolean;
}

export function TargetForm({ target, onSubmit, onCancel, isPending }: TargetFormProps) {
  const form = useForm<InsertTarget>({
    resolver: zodResolver(insertTargetSchema),
    defaultValues: target ? {
      name: target.name,
      type: target.type as 'HTTP' | 'TCP' | 'ICMP',
      endpoint: target.endpoint,
      frequencySec: target.frequencySec,
      expectedCode: target.expectedCode || undefined,
      timeoutMs: target.timeoutMs,
      alertEmail: target.alertEmail || '',
      enabled: target.enabled,
    } : {
      name: '',
      type: 'HTTP',
      endpoint: '',
      frequencySec: 60,
      timeoutMs: 5000,
      alertEmail: '',
      enabled: true,
    },
  });

  const watchedType = form.watch('type');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{target ? 'Edit Target' : 'Add New Target'}</CardTitle>
        <CardDescription>
          Configure endpoint monitoring with alerts and custom check intervals
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Production API Server" 
                      {...field} 
                      data-testid="input-target-name"
                    />
                  </FormControl>
                  <FormDescription>A descriptive name for this target</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Check Type</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    data-testid="select-target-type"
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select check type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="HTTP">HTTP/HTTPS</SelectItem>
                      <SelectItem value="TCP">TCP Port</SelectItem>
                      <SelectItem value="ICMP">ICMP Ping</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>Protocol to use for health checks</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endpoint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endpoint</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={
                        watchedType === 'HTTP' ? 'https://api.example.com/health' :
                        watchedType === 'TCP' ? 'api.example.com:443' :
                        'api.example.com'
                      }
                      {...field}
                      data-testid="input-target-endpoint"
                      className="font-mono text-sm"
                    />
                  </FormControl>
                  <FormDescription>
                    {watchedType === 'HTTP' && 'Full URL including protocol'}
                    {watchedType === 'TCP' && 'Host and port (e.g., host:443)'}
                    {watchedType === 'ICMP' && 'Hostname or IP address'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="frequencySec"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check Frequency (seconds)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field}
                        onChange={e => field.onChange(parseInt(e.target.value))}
                        data-testid="input-target-frequency"
                      />
                    </FormControl>
                    <FormDescription>How often to check (10-86400)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="timeoutMs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timeout (milliseconds)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field}
                        onChange={e => field.onChange(parseInt(e.target.value))}
                        data-testid="input-target-timeout"
                      />
                    </FormControl>
                    <FormDescription>Request timeout (1000-60000)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {watchedType === 'HTTP' && (
              <FormField
                control={form.control}
                name="expectedCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected HTTP Status Code (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="200"
                        {...field}
                        value={field.value || ''}
                        onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        data-testid="input-target-expected-code"
                      />
                    </FormControl>
                    <FormDescription>Leave empty to accept any 2xx/3xx status</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="alertEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alert Email (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="oncall@example.com"
                      {...field}
                      data-testid="input-target-alert-email"
                    />
                  </FormControl>
                  <FormDescription>Receive alerts when status changes</FormDescription>
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
                    <FormLabel className="text-base">Enabled</FormLabel>
                    <FormDescription>
                      Whether to actively monitor this target
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-target-enabled"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex gap-2 justify-end">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isPending}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
              )}
              <Button 
                type="submit" 
                disabled={isPending}
                data-testid="button-submit-target"
              >
                {isPending ? 'Saving...' : target ? 'Update Target' : 'Add Target'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
