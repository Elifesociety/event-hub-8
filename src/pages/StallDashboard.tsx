import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStallAuth } from "@/contexts/StallAuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Store, Receipt, Wallet, LogOut, IndianRupee, ShoppingCart, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import logo from "@/assets/logo.jpg";

export default function StallDashboard() {
  const { stall, logout, isLoading: authLoading } = useStallAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!authLoading && !stall) {
      navigate("/stall-login");
    }
  }, [stall, authLoading, navigate]);

  // Fetch billing transactions for this stall (only cash orders)
  const { data: transactions = [] } = useQuery({
    queryKey: ["stall-transactions", stall?.id],
    queryFn: async () => {
      if (!stall?.id) return [];
      const { data, error } = await supabase
        .from("billing_transactions")
        .select("*")
        .eq("stall_id", stall.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!stall?.id,
  });

  // Fetch payments for this stall
  const { data: payments = [] } = useQuery({
    queryKey: ["stall-payments", stall?.id],
    queryFn: async () => {
      if (!stall?.id) return [];
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("stall_id", stall.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!stall?.id,
  });

  // Mutation to update order status
  const updateOrderStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const { error } = await supabase
        .from("billing_transactions")
        .update({ status })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stall-transactions", stall?.id] });
      toast.success("Order marked as delivered!");
    },
    onError: () => {
      toast.error("Failed to update order status");
    },
  });

  const handleLogout = () => {
    logout();
    navigate("/stall-login");
  };

  const handleDeliverOrder = (orderId: string) => {
    updateOrderStatus.mutate({ orderId, status: "delivered" });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!stall) return null;

  const totalBilled = transactions.reduce((sum, t) => sum + Number(t.total), 0);
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount_paid), 0);
  const marginDeducted = payments.reduce((sum, p) => sum + Number(p.margin_deducted || 0), 0);
  const balanceAmount = totalBilled - totalPaid - marginDeducted;

  // Separate pending and delivered orders
  const pendingOrders = transactions.filter((t) => t.status !== "delivered");
  const deliveredOrders = transactions.filter((t) => t.status === "delivered");

  const OrderTable = ({ orders, showDeliverButton = false }: { orders: typeof transactions; showDeliverButton?: boolean }) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>S.No</TableHead>
            <TableHead>Receipt</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Items</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Date</TableHead>
            {showDeliverButton && <TableHead>Action</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((tx) => (
            <TableRow key={tx.id}>
              <TableCell>{tx.serial_number}</TableCell>
              <TableCell className="font-mono text-xs">{tx.receipt_number}</TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{tx.customer_name || "-"}</p>
                  <p className="text-xs text-muted-foreground">{tx.customer_mobile || "-"}</p>
                </div>
              </TableCell>
              <TableCell>
                {Array.isArray(tx.items) ? tx.items.length : 0} items
              </TableCell>
              <TableCell className="text-right font-medium">
                ₹{Number(tx.total).toLocaleString()}
              </TableCell>
              <TableCell className="text-xs">
                {tx.created_at ? format(new Date(tx.created_at), "dd/MM/yy HH:mm") : "-"}
              </TableCell>
              {showDeliverButton && (
                <TableCell>
                  <Button
                    size="sm"
                    onClick={() => handleDeliverOrder(tx.id)}
                    disabled={updateOrderStatus.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Deliver
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="h-10 w-auto rounded-lg" />
            <div>
              <h1 className="text-lg font-bold text-foreground">{stall.counter_name}</h1>
              <p className="text-xs text-muted-foreground">{stall.participant_name}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Billed</CardTitle>
              <Receipt className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center">
                <IndianRupee className="h-5 w-5" />
                {totalBilled.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">{transactions.length} orders</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Amount Received</CardTitle>
              <Wallet className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center text-green-600">
                <IndianRupee className="h-5 w-5" />
                {totalPaid.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Margin: ₹{marginDeducted.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Balance Due</CardTitle>
              <Store className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center text-orange-600">
                <IndianRupee className="h-5 w-5" />
                {balanceAmount.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Pending amount</p>
            </CardContent>
          </Card>
        </div>

        {/* Orders with Tabs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Your Orders
            </CardTitle>
            <CardDescription>Cash received orders for your stall</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pending" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="pending" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Pending ({pendingOrders.length})
                </TabsTrigger>
                <TabsTrigger value="delivered" className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Delivered ({deliveredOrders.length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="pending">
                {pendingOrders.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No pending orders</p>
                ) : (
                  <OrderTable orders={pendingOrders} showDeliverButton={true} />
                )}
              </TabsContent>
              
              <TabsContent value="delivered">
                {deliveredOrders.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No delivered orders yet</p>
                ) : (
                  <OrderTable orders={deliveredOrders} showDeliverButton={false} />
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Payments Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Payment History
            </CardTitle>
            <CardDescription>All payments received for your stall</CardDescription>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No payments yet</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Total Billed</TableHead>
                      <TableHead className="text-right">Margin</TableHead>
                      <TableHead className="text-right">Amount Paid</TableHead>
                      <TableHead>Narration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="text-xs">
                          {payment.created_at ? format(new Date(payment.created_at), "dd/MM/yy HH:mm") : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          ₹{Number(payment.total_billed || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-destructive">
                          -₹{Number(payment.margin_deducted || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          ₹{Number(payment.amount_paid).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm">{payment.narration || "-"}</TableCell>
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
