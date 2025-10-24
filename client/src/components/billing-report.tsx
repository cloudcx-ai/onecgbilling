import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { BillingPeriodsResponse, SubscriptionOverview } from "@shared/schema";
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

  // Calculate total usage cost
  const totalCost = useMemo(() => {
    if (!reportData?.usages) return 0;
    return reportData.usages.reduce((sum, usage) => {
      const qty = parseFloat(usage.usageQuantity || "0");
      const price = parseFloat(usage.overagePrice || "0");
      return sum + (qty * price);
    }, 0);
  }, [reportData]);

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
          {/* Overview Section */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Subscription Type
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-base font-semibold" data-testid="text-subscription-type">
                    {reportData.subscriptionType || "N/A"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Currency
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-base font-semibold" data-testid="text-currency">
                    {reportData.currency || "USD"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Usage Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-base font-semibold">
                    {reportData.usages?.length || 0}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Cost
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-base font-semibold">
                    ${totalCost.toFixed(2)}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Users Section - Usage Table */}
          {reportData.usages && reportData.usages.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Usage Details</h2>
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50 border-b">
                        <tr>
                          <th className="px-6 py-3 text-left text-sm font-medium text-foreground">Product / Service</th>
                          <th className="px-6 py-3 text-center text-sm font-medium text-foreground">Grouping</th>
                          <th className="px-6 py-3 text-center text-sm font-medium text-foreground">Usage Qty</th>
                          <th className="px-6 py-3 text-right text-sm font-medium text-foreground">Rate</th>
                          <th className="px-6 py-3 text-right text-sm font-medium text-foreground">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {reportData.usages.map((usage, index) => {
                          const qty = parseFloat(usage.usageQuantity || "0");
                          const rate = parseFloat(usage.overagePrice || "0");
                          const total = qty * rate;

                          return (
                            <tr key={index} className="hover-elevate">
                              <td className="px-6 py-4">
                                <div>
                                  <div className="text-sm font-medium text-foreground">
                                    {usage.name || "N/A"}
                                  </div>
                                  {usage.partNumber && (
                                    <div className="text-xs text-muted-foreground font-mono mt-1">
                                      {usage.partNumber}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="text-sm text-muted-foreground">
                                  {usage.grouping || "-"}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="text-sm">
                                  {usage.usageQuantity || "0"} {usage.unitOfMeasureType || ""}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="text-sm">
                                  ${rate.toFixed(2)}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="text-sm font-medium">
                                  ${total.toFixed(2)}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="border-t bg-muted/50">
                        <tr>
                          <td colSpan={4} className="px-6 py-4 text-right text-sm font-semibold">
                            Total:
                          </td>
                          <td className="px-6 py-4 text-right text-base font-bold">
                            ${totalCost.toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Enabled Products */}
          {reportData.enabledProducts && reportData.enabledProducts.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">
                Enabled Products ({reportData.enabledProducts.length})
              </h2>
              <Card>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {reportData.enabledProducts.map((product, index) => (
                      <div key={index} className="text-sm p-3 rounded-md bg-muted/50">
                        <div className="font-medium">{product.name || "N/A"}</div>
                        {product.partNumber && (
                          <div className="text-xs text-muted-foreground font-mono mt-1">
                            {product.partNumber}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
