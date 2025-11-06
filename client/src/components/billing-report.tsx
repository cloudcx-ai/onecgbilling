import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar, FileText, Loader2, Users, AppWindow, Smartphone, Server, MessageSquare, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { BillingPeriodsResponse, SubscriptionOverview, Usage } from "@shared/schema";
import { format, parseISO } from "date-fns";

interface BillingReportProps {
  clientId: string;
  clientName: string;
}

export function BillingReport({ clientId, clientName }: BillingReportProps) {
  const { toast } = useToast();
  const [selectedStartDate, setSelectedStartDate] = useState<string>("");
  const [selectedEndDate, setSelectedEndDate] = useState<string>("");

  // Fetch billing periods
  const { data: periodsData, isLoading: periodsLoading } = useQuery<BillingPeriodsResponse>({
    queryKey: [`/api/billing/periods?clientId=${clientId}`],
    enabled: !!clientId,
  });

  // Process periods for dropdowns
  const periods = useMemo(() => {
    if (!periodsData?.entities) return [];
    return periodsData.entities.map((period) => ({
      startDate: period.startDate,
      endDate: period.endDate,
      label: `${format(parseISO(period.startDate), "MMM yyyy")}`,
    }));
  }, [periodsData]);

  // Get unique start and end dates
  const startDates = useMemo(() => {
    return periods.map((p) => ({
      value: p.startDate,
      label: p.label,
    }));
  }, [periods]);

  const endDates = useMemo(() => {
    return periods.map((p) => ({
      value: p.endDate,
      label: format(parseISO(p.endDate), "MMM yyyy"),
    }));
  }, [periods]);

  // Fetch subscription overview
  const subscriptionMutation = useMutation({
    mutationFn: async (endDate: string) => {
      const date = new Date(endDate);
      const periodEndingTimestamp = date.getTime();
      
      const response = await fetch(
        `/api/billing/subscription?clientId=${clientId}&periodEndingTimestamp=${periodEndingTimestamp}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to fetch subscription data");
      }

      return await response.json() as SubscriptionOverview;
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to fetch subscription data",
      });
    },
  });

  const handleGenerateReport = () => {
    if (!selectedStartDate || !selectedEndDate) {
      toast({
        variant: "destructive",
        title: "Invalid Selection",
        description: "Please select both start and end dates",
      });
      return;
    }

    subscriptionMutation.mutate(selectedEndDate);
  };

  const reportData = subscriptionMutation.data;

  // Filter usages by category (exclude third-party)
  const filteredUsages = useMemo(() => {
    if (!reportData?.usages) return {
      users: [],
      apps: [],
      devices: [],
      resources: [],
      messaging: [],
      storage: [],
    };

    const usages = reportData.usages.filter(u => !u.isThirdParty);

    return {
      users: usages.filter(u => 
        u.grouping === "user-license" || 
        u.grouping === "billable-app-usage-license" || 
        u.grouping === "billable-app-concurrent-license"
      ),
      apps: usages.filter(u => u.grouping === "billable-app-org-license"),
      devices: usages.filter(u => u.grouping === "device"),
      resources: usages.filter(u => 
        u.grouping === "resource" && 
        !u.name?.toLowerCase().includes("genesys cloud voice")
      ),
      messaging: usages.filter(u => 
        u.grouping === "messaging" || 
        u.grouping === "messaging-usage"
      ),
      storage: usages.filter(u => 
        u.grouping === "storage" || 
        u.grouping === "storage-category"
      ),
    };
  }, [reportData]);

  // Calculate total for each category and overall
  const calculateTotal = (usages: Usage[]) => {
    return usages.reduce((sum, usage) => {
      const qty = parseFloat(usage.usageQuantity || "0");
      const price = parseFloat(usage.overagePrice || "0");
      return sum + (qty * price);
    }, 0);
  };

  const totals = useMemo(() => {
    return {
      users: calculateTotal(filteredUsages.users),
      apps: calculateTotal(filteredUsages.apps),
      devices: calculateTotal(filteredUsages.devices),
      resources: calculateTotal(filteredUsages.resources),
      messaging: calculateTotal(filteredUsages.messaging),
      storage: calculateTotal(filteredUsages.storage),
    };
  }, [filteredUsages]);

  const totalBillingAmount = useMemo(() => {
    return Object.values(totals).reduce((sum, val) => sum + val, 0);
  }, [totals]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-1" data-testid="text-client-name">
          {clientName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Billing & Usage Reports
        </p>
      </div>

      {/* Date Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Select Billing Period
          </CardTitle>
          <CardDescription>
            Current Month: {selectedStartDate && selectedEndDate 
              ? `${format(parseISO(selectedStartDate), "MM/dd/yyyy")} - ${format(parseISO(selectedEndDate), "MM/dd/yyyy")}`
              : "Select dates to view report"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {periodsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Loading periods...</span>
            </div>
          ) : periods.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No billing periods available</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date" className="text-sm font-medium">
                    From
                  </Label>
                  <Select value={selectedStartDate} onValueChange={setSelectedStartDate}>
                    <SelectTrigger
                      id="start-date"
                      className="h-10"
                      data-testid="select-start-date"
                    >
                      <SelectValue placeholder="Select start month" />
                    </SelectTrigger>
                    <SelectContent>
                      {startDates.map((date) => (
                        <SelectItem key={date.value} value={date.value}>
                          {date.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-date" className="text-sm font-medium">
                    To
                  </Label>
                  <Select value={selectedEndDate} onValueChange={setSelectedEndDate}>
                    <SelectTrigger
                      id="end-date"
                      className="h-10"
                      data-testid="select-end-date"
                    >
                      <SelectValue placeholder="Select end month" />
                    </SelectTrigger>
                    <SelectContent>
                      {endDates.map((date) => (
                        <SelectItem key={date.value} value={date.value}>
                          {date.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleGenerateReport}
                  disabled={!selectedStartDate || !selectedEndDate || subscriptionMutation.isPending}
                  data-testid="button-generate-report"
                >
                  {subscriptionMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Report...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Download Usage Report
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Display */}
      {reportData && (
        <div className="space-y-6">
          {/* Total Billing Amount - Top Display */}
          <Card className="border-primary">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Billing Amount
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary" data-testid="text-total-billing-amount">
                ${totalBillingAmount.toFixed(2)} {reportData.currency || "USD"}
              </p>
            </CardContent>
          </Card>

          {/* Tabbed Interface */}
          <Tabs defaultValue="users" className="space-y-4">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="users" className="flex items-center gap-2" data-testid="tab-users">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Users</span>
              </TabsTrigger>
              <TabsTrigger value="apps" className="flex items-center gap-2" data-testid="tab-apps">
                <AppWindow className="h-4 w-4" />
                <span className="hidden sm:inline">Apps</span>
              </TabsTrigger>
              <TabsTrigger value="devices" className="flex items-center gap-2" data-testid="tab-devices">
                <Smartphone className="h-4 w-4" />
                <span className="hidden sm:inline">Devices</span>
              </TabsTrigger>
              <TabsTrigger value="resources" className="flex items-center gap-2" data-testid="tab-resources">
                <Server className="h-4 w-4" />
                <span className="hidden sm:inline">Resources</span>
              </TabsTrigger>
              <TabsTrigger value="messaging" className="flex items-center gap-2" data-testid="tab-messaging">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Messaging</span>
              </TabsTrigger>
              <TabsTrigger value="storage" className="flex items-center gap-2" data-testid="tab-storage">
                <Database className="h-4 w-4" />
                <span className="hidden sm:inline">Storage</span>
              </TabsTrigger>
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-4">
              <UsageTable
                title="User Licenses"
                usages={filteredUsages.users}
                total={totals.users}
                currency={reportData.currency || "USD"}
              />
            </TabsContent>

            {/* Apps Tab */}
            <TabsContent value="apps" className="space-y-4">
              <UsageTable
                title="Application Licenses"
                usages={filteredUsages.apps}
                total={totals.apps}
                currency={reportData.currency || "USD"}
              />
            </TabsContent>

            {/* Devices Tab */}
            <TabsContent value="devices" className="space-y-4">
              <UsageTable
                title="Device Usage"
                usages={filteredUsages.devices}
                total={totals.devices}
                currency={reportData.currency || "USD"}
              />
            </TabsContent>

            {/* Resources Tab */}
            <TabsContent value="resources" className="space-y-4">
              <UsageTable
                title="Resources (Excludes Cloud Voice)"
                usages={filteredUsages.resources}
                total={totals.resources}
                currency={reportData.currency || "USD"}
              />
            </TabsContent>

            {/* Messaging Tab */}
            <TabsContent value="messaging" className="space-y-4">
              <UsageTable
                title="Messaging Usage"
                usages={filteredUsages.messaging}
                total={totals.messaging}
                currency={reportData.currency || "USD"}
              />
            </TabsContent>

            {/* Storage Tab */}
            <TabsContent value="storage" className="space-y-4">
              <UsageTable
                title="Storage Usage"
                usages={filteredUsages.storage}
                total={totals.storage}
                currency={reportData.currency || "USD"}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}

// Reusable Usage Table Component
interface UsageTableProps {
  title: string;
  usages: Usage[];
  total: number;
  currency: string;
}

function UsageTable({ title, usages, total, currency }: UsageTableProps) {
  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{usages.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-primary">
              ${total.toFixed(2)} {currency}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {usages.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">No usage data available for this category</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-foreground">Name</th>
                    <th className="px-6 py-3 text-center text-sm font-medium text-foreground">Part Number</th>
                    <th className="px-6 py-3 text-center text-sm font-medium text-foreground">Unit Type</th>
                    <th className="px-6 py-3 text-center text-sm font-medium text-foreground">Quantity</th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-foreground">Price ({currency})</th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-foreground">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {usages.map((usage, index) => {
                    const qty = parseFloat(usage.usageQuantity || "0");
                    const price = parseFloat(usage.overagePrice || "0");
                    const itemTotal = qty * price;

                    return (
                      <tr key={index} className="hover-elevate" data-testid={`row-usage-${index}`}>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-foreground">
                            {usage.name || "N/A"}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="text-xs text-muted-foreground font-mono">
                            {usage.partNumber || "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="text-sm text-muted-foreground">
                            {usage.unitOfMeasureType || "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="text-sm font-medium">
                            {qty.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="text-sm">
                            ${price.toFixed(2)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="text-sm font-semibold" data-testid={`text-total-${index}`}>
                            ${itemTotal.toFixed(2)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t bg-muted/50">
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-right text-sm font-semibold">
                      Total:
                    </td>
                    <td className="px-6 py-4 text-right text-base font-bold" data-testid="text-category-total">
                      ${total.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
