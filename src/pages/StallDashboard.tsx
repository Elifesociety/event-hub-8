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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Store, Receipt, Wallet, LogOut, IndianRupee, ShoppingCart, CheckCircle, Clock, Eye, X, Package } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import logo from "@/assets/logo.jpg";

interface BillItem {
  name: string;
  price: number;
  quantity: number;
  event_margin: number;
}
export default function StallDashboard() {
  const {
    stall,
    logout,
    isLoading: authLoading
  } = useStallAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!authLoading && !stall) {
      navigate("/stall-login");
    }
  }, [stall, authLoading, navigate]);

  // Fetch billing transactions for this stall (only cash orders)
  const {
    data: transactions = []
  } = useQuery({
    queryKey: ["stall-transactions", stall?.id],
    queryFn: async () => {
      if (!stall?.id) return [];
      const {
        data,
        error
      } = await supabase.from("billing_transactions").select("*").eq("stall_id", stall.id).order("created_at", {
        ascending: false
      });
      if (error) throw error;
      return data;
    },
    enabled: !!stall?.id
  });

  // Fetch payments for this stall
  const {
    data: payments = []
  } = useQuery({
    queryKey: ["stall-payments", stall?.id],
    queryFn: async () => {
      if (!stall?.id) return [];
      const {
        data,
        error
      } = await supabase.from("payments").select("*").eq("stall_id", stall.id).order("created_at", {
        ascending: false
      });
      if (error) throw error;
      return data;
    },
    enabled: !!stall?.id
  });

  // Fetch products for this stall
  const {
    data: products = []
  } = useQuery({
    queryKey: ["stall-products", stall?.id],
    queryFn: async () => {
      if (!stall?.id) return [];
      const {
        data,
        error
      } = await supabase.from("products").select("*").eq("stall_id", stall.id).order("product_number", {
        ascending: true
      });
      if (error) throw error;
      return data;
    },
    enabled: !!stall?.id
  });

  // Mutation to update order status
  const updateOrderStatus = useMutation({
    mutationFn: async ({
      orderId,
      status
    }: {
      orderId: string;
      status: string;
    }) => {
      const {
        error
      } = await supabase.from("billing_transactions").update({
        status
      }).eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["stall-transactions", stall?.id]
      });
      toast.success("Order marked as delivered!");
    },
    onError: () => {
      toast.error("Failed to update order status");
    }
  });
  const handleLogout = () => {
    logout();
    navigate("/stall-login");
  };
  const handleDeliverOrder = (orderId: string) => {
    updateOrderStatus.mutate({
      orderId,
      status: "delivered"
    });
  };
  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>;
  }
  if (!stall) return null;
  const totalBilledCount = transactions.length;
  const totalBilledAmount = transactions.reduce((sum, t) => sum + Number(t.total), 0);
  
  // Calculate total bill balance from all transactions (after commission deduction per item)
  const totalBillBalanceBeforePayments = transactions.reduce((txSum, tx) => {
    const items = Array.isArray(tx.items) ? tx.items as Array<{ price?: number; quantity?: number; event_margin?: number }> : [];
    const txBalance = items.reduce((sum, item) => {
      const itemTotal = Number(item.price || 0) * Number(item.quantity || 1);
      const commission = Number(item.event_margin || 20);
      const itemBalance = itemTotal * (1 - commission / 100);
      return sum + itemBalance;
    }, 0);
    return txSum + txBalance;
  }, 0);

  // Calculate total payments received for this stall
  const totalPaymentsReceived = payments
    .filter(p => p.payment_type === "participant")
    .reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);

  // Bill Balance = Balance after commission - Payments already received
  const totalBillBalance = Math.max(0, totalBillBalanceBeforePayments - totalPaymentsReceived);

  // Separate pending and delivered orders
  const pendingOrders = transactions.filter(t => t.status !== "delivered");
  const deliveredOrders = transactions.filter(t => t.status === "delivered");
  // State for bill details dialog
  const [selectedBill, setSelectedBill] = useState<typeof transactions[0] | null>(null);

  const getBillItems = (bill: typeof transactions[0]): BillItem[] => {
    if (!Array.isArray(bill.items)) return [];
    return bill.items as unknown as BillItem[];
  };

  const calculateBillBalance = (bill: typeof transactions[0]) => {
    const items = getBillItems(bill);
    return items.reduce((sum, item) => {
      const itemTotal = Number(item.price || 0) * Number(item.quantity || 1);
      const commission = Number(item.event_margin || 20);
      return sum + itemTotal * (1 - commission / 100);
    }, 0);
  };

  const getCashStatus = (status: string) => {
    if (status === "paid" || status === "delivered") {
      return { label: "Received", variant: "default" as const };
    }
    return { label: "Pending", variant: "secondary" as const };
  };

  const OrderTable = ({
    orders,
    showDeliverButton = false,
    onDeliver
  }: {
    orders: typeof transactions;
    showDeliverButton?: boolean;
    onDeliver?: (orderId: string) => void;
  }) => <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>S.No</TableHead>
            <TableHead>Receipt</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Items</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Cash Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Details</TableHead>
            {showDeliverButton && <TableHead>Action</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map(tx => {
            const cashStatus = getCashStatus(tx.status);
            return (
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
                <TableCell>
                  <Badge 
                    variant={cashStatus.variant}
                    className={cashStatus.label === "Received" ? "bg-green-500/10 text-green-600 border-green-500/20" : ""}
                  >
                    {cashStatus.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">
                  {tx.created_at ? format(new Date(tx.created_at), "dd/MM/yy HH:mm") : "-"}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedBill(tx)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
                {showDeliverButton && onDeliver && <TableCell>
                    <Button size="sm" onClick={() => onDeliver(tx.id)} disabled={updateOrderStatus.isPending}>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Deliver
                    </Button>
                  </TableCell>}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>;
  return <div className="min-h-screen bg-background">
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
              <CardTitle className="text-sm font-medium">Total Billed Count</CardTitle>
              <ShoppingCart className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalBilledCount}
              </div>
              <p className="text-xs text-muted-foreground">Orders placed</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Billed Amount</CardTitle>
              <Receipt className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center text-blue-600">
                <IndianRupee className="h-5 w-5" />
                {totalBilledAmount.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Commission included</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Bill Balance</CardTitle>
              <Wallet className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center text-green-600">
                <IndianRupee className="h-5 w-5" />
                {totalBillBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <p className="text-xs text-muted-foreground">
                {totalBillBalance === 0 ? "Fully paid" : "Remaining to receive"}
              </p>
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
                {pendingOrders.length === 0 ? <p className="text-center text-muted-foreground py-8">No pending orders</p> : <OrderTable orders={pendingOrders} showDeliverButton={true} onDeliver={handleDeliverOrder} />}
              </TabsContent>
              
              <TabsContent value="delivered">
                {deliveredOrders.length === 0 ? <p className="text-center text-muted-foreground py-8">No delivered orders yet</p> : <OrderTable orders={deliveredOrders} showDeliverButton={false} />}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Registered Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Registered Products
            </CardTitle>
            <CardDescription>Your stall's product catalog</CardDescription>
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No products registered yet</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>P.No</TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead className="text-right">Cost Price</TableHead>
                      <TableHead className="text-right">Selling Price</TableHead>
                      <TableHead className="text-right">Event Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map(product => (
                      <TableRow key={product.id}>
                        <TableCell className="font-mono">{product.product_number}</TableCell>
                        <TableCell className="font-medium">{product.item_name}</TableCell>
                        <TableCell className="text-right">₹{Number(product.cost_price).toLocaleString()}</TableCell>
                        <TableCell className="text-right">₹{Number(product.selling_price || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">{product.event_margin || 20}%</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Billing History Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Billing History
            </CardTitle>
            <CardDescription>All billed transactions for your stall</CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? <p className="text-center text-muted-foreground py-8">No billing records yet</p> : <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>S.No</TableHead>
                      <TableHead>Receipt</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Bill Amount</TableHead>
                      <TableHead className="text-right">Balance Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map(tx => {
                      const balanceAmount = calculateBillBalance(tx);
                      
                      return (
                        <TableRow key={tx.id}>
                          <TableCell>{tx.serial_number}</TableCell>
                          <TableCell className="font-mono text-xs">{tx.receipt_number}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{tx.customer_name || "-"}</p>
                              <p className="text-xs text-muted-foreground">{tx.customer_mobile || "-"}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            {tx.created_at ? format(new Date(tx.created_at), "dd/MM/yy HH:mm") : "-"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ₹{Number(tx.total).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            ₹{balanceAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={tx.status === "delivered" ? "default" : "secondary"}>
                              {tx.status === "delivered" ? "Delivered" : "Pending"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedBill(tx)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>}
          </CardContent>
        </Card>
      </main>

      {/* Bill Details Dialog */}
      <Dialog open={!!selectedBill} onOpenChange={() => setSelectedBill(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Bill Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedBill && (
            <div className="space-y-4">
              {/* Bill Info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Receipt No</p>
                  <p className="font-mono font-medium">{selectedBill.receipt_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Serial No</p>
                  <p className="font-medium">{selectedBill.serial_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {selectedBill.created_at 
                      ? format(new Date(selectedBill.created_at), "dd MMM yyyy, HH:mm") 
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant={selectedBill.status === "delivered" ? "default" : "secondary"}>
                    {selectedBill.status === "delivered" ? "Delivered" : "Pending"}
                  </Badge>
                </div>
              </div>

              {/* Customer Info */}
              {(selectedBill.customer_name || selectedBill.customer_mobile) && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Customer</p>
                    <p className="font-medium">{selectedBill.customer_name || "-"}</p>
                    <p className="text-sm text-muted-foreground">{selectedBill.customer_mobile || "-"}</p>
                  </div>
                </>
              )}

              <Separator />

              {/* Items */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Items</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {getBillItems(selectedBill).map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-2 px-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          ₹{item.price} × {item.quantity} | {item.event_margin}% margin
                        </p>
                      </div>
                      <p className="font-semibold">₹{(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Bill Amount</span>
                  <span className="font-medium">₹{Number(selectedBill.total).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">After Commission</span>
                  <span className="font-medium text-green-600">
                    ₹{calculateBillBalance(selectedBill).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>;
}