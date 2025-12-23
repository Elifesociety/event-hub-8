import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Wallet, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Plus,
  Store,
  Briefcase,
  Receipt,
  Loader2,
  Pencil,
  Trash2,
  X,
  Check,
  AlertCircle
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Tables, Enums } from "@/integrations/supabase/types";
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

type Stall = Tables<"stalls">;
type Payment = Tables<"payments">;
type BillingTransaction = Tables<"billing_transactions">;
type Registration = Tables<"registrations">;

export default function Accounts() {
  const queryClient = useQueryClient();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentType, setPaymentType] = useState<"stall" | "other">("stall");
  
  // Bulk stall selection
  const [selectedStallIds, setSelectedStallIds] = useState<string[]>([]);
  const [bulkPaymentAmount, setBulkPaymentAmount] = useState("");

  const [otherPayment, setOtherPayment] = useState({
    narration: "",
    amount: ""
  });

  // Edit/Delete state for other payments
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editPaymentData, setEditPaymentData] = useState({ narration: "", amount: "" });
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);

  // Fetch stalls
  const { data: stalls = [] } = useQuery({
    queryKey: ['stalls'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stalls')
        .select('*')
        .eq('is_verified', true)
        .order('counter_name');
      if (error) throw error;
      return data as Stall[];
    }
  });

  // Fetch payments
  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*, stalls(counter_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Fetch billing transactions (collections)
  const { data: billingTransactions = [] } = useQuery({
    queryKey: ['billing_transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('billing_transactions')
        .select('*, stalls(counter_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Fetch registrations (collections)
  const { data: registrations = [] } = useQuery({
    queryKey: ['registrations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Registration[];
    }
  });

  // Calculate stall pending details
  const stallPendingDetails = useMemo(() => {
    const details: Record<string, { billedAmount: number; billBalance: number; alreadyPaid: number; remainingBalance: number }> = {};
    
    stalls.forEach(stall => {
      const stallTransactions = billingTransactions.filter((t: any) => t.stall_id === stall.id);
      const billedAmount = stallTransactions.reduce((sum: number, t: any) => sum + (t.total || 0), 0);
      
      const billBalance = stallTransactions.reduce((txSum: number, tx: any) => {
        const items = Array.isArray(tx.items) ? tx.items as Array<{ price?: number; quantity?: number; event_margin?: number }> : [];
        const txBalance = items.reduce((sum: number, item) => {
          const itemTotal = Number(item.price || 0) * Number(item.quantity || 1);
          const commission = Number(item.event_margin || 20);
          const itemBalance = itemTotal * (1 - commission / 100);
          return sum + itemBalance;
        }, 0);
        return txSum + txBalance;
      }, 0);
      
      const alreadyPaid = payments
        .filter((p: any) => p.stall_id === stall.id && p.payment_type === "participant")
        .reduce((sum: number, p: any) => sum + (p.amount_paid || 0), 0);
      
      const remainingBalance = Math.max(0, billBalance - alreadyPaid);
      
      details[stall.id] = { billedAmount, billBalance, alreadyPaid, remainingBalance };
    });
    
    return details;
  }, [stalls, billingTransactions, payments]);

  // Selected stalls total pending
  const selectedStallsTotalPending = useMemo(() => {
    return selectedStallIds.reduce((sum, id) => sum + (stallPendingDetails[id]?.remainingBalance || 0), 0);
  }, [selectedStallIds, stallPendingDetails]);

  // Create payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: async (payment: {
      payment_type: Enums<"payment_type">;
      stall_id?: string;
      total_billed?: number;
      margin_deducted?: number;
      amount_paid: number;
      narration?: string;
    }) => {
      const { data, error } = await supabase
        .from('payments')
        .insert(payment)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setSelectedStallIds([]);
      setBulkPaymentAmount("");
      setOtherPayment({ narration: "", amount: "" });
      setShowPaymentForm(false);
      toast.success("Payment recorded!");
    },
    onError: (error) => {
      toast.error("Failed to record payment: " + error.message);
    }
  });

  // Update payment mutation
  const updatePaymentMutation = useMutation({
    mutationFn: async ({ id, narration, amount_paid }: { id: string; narration: string; amount_paid: number }) => {
      const { error } = await supabase
        .from('payments')
        .update({ narration, amount_paid })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setEditingPaymentId(null);
      toast.success("Payment updated!");
    },
    onError: (error) => {
      toast.error("Failed to update payment: " + error.message);
    }
  });

  // Delete payment mutation
  const deletePaymentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setDeletePaymentId(null);
      toast.success("Payment deleted!");
    },
    onError: (error) => {
      toast.error("Failed to delete payment: " + error.message);
    }
  });

  // Calculate totals
  const totalBillingCollected = billingTransactions.reduce((sum: number, t: any) => sum + (t.total || 0), 0);
  const totalRegistrationCollected = registrations
    .filter(r => r.registration_type !== "stall_counter")
    .reduce((sum, r) => sum + (r.amount || 0), 0);
  
  const stallBookingFees = stalls.reduce((sum, s) => sum + (s.registration_fee || 0), 0);
  
  const totalCollected = totalBillingCollected + totalRegistrationCollected + stallBookingFees;

  const stallPaymentsTotal = payments
    .filter((p: any) => p.payment_type === "participant")
    .reduce((sum: number, p: any) => sum + (p.amount_paid || 0), 0);

  const otherPaymentsTotal = payments
    .filter((p: any) => p.payment_type === "other")
    .reduce((sum: number, p: any) => sum + (p.amount_paid || 0), 0);

  const totalPaid = stallPaymentsTotal + otherPaymentsTotal;
  const cashBalance = totalCollected - totalPaid;

  const empBookingTotal = registrations
    .filter(r => r.registration_type === "employment_booking")
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  const empRegTotal = registrations
    .filter(r => r.registration_type === "employment_registration")
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  const handleBulkStallPayment = async () => {
    if (selectedStallIds.length === 0) {
      toast.error("Please select at least one stall");
      return;
    }
    if (!bulkPaymentAmount) {
      toast.error("Please enter payment amount");
      return;
    }

    const totalAmount = parseFloat(bulkPaymentAmount);
    if (totalAmount > selectedStallsTotalPending) {
      toast.error("Amount exceeds total pending balance");
      return;
    }

    // Distribute payment proportionally across selected stalls
    let remainingAmount = totalAmount;
    const paymentPromises = [];

    for (const stallId of selectedStallIds) {
      const stallDetails = stallPendingDetails[stallId];
      if (!stallDetails || stallDetails.remainingBalance <= 0) continue;

      const stallShare = Math.min(stallDetails.remainingBalance, remainingAmount);
      if (stallShare <= 0) break;

      remainingAmount -= stallShare;
      const stallName = stalls.find(s => s.id === stallId)?.counter_name || 'Unknown';

      paymentPromises.push(
        supabase.from('payments').insert({
          payment_type: "participant" as const,
          stall_id: stallId,
          amount_paid: stallShare,
          narration: `Payment to ${stallName}`
        })
      );
    }

    try {
      await Promise.all(paymentPromises);
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setSelectedStallIds([]);
      setBulkPaymentAmount("");
      setShowPaymentForm(false);
      toast.success(`Payment distributed to ${selectedStallIds.length} stall(s)!`);
    } catch (error: any) {
      toast.error("Failed to process payments: " + error.message);
    }
  };

  const handleOtherPayment = () => {
    if (!otherPayment.narration || !otherPayment.amount) {
      toast.error("Please fill all fields");
      return;
    }

    createPaymentMutation.mutate({
      payment_type: "other",
      amount_paid: parseFloat(otherPayment.amount),
      narration: otherPayment.narration
    });
  };

  const handleEditPayment = (payment: any) => {
    setEditingPaymentId(payment.id);
    setEditPaymentData({ narration: payment.narration || "", amount: String(payment.amount_paid) });
  };

  const handleSaveEdit = () => {
    if (!editPaymentData.narration || !editPaymentData.amount) {
      toast.error("Please fill all fields");
      return;
    }
    updatePaymentMutation.mutate({
      id: editingPaymentId!,
      narration: editPaymentData.narration,
      amount_paid: parseFloat(editPaymentData.amount)
    });
  };

  const toggleStallSelection = (stallId: string) => {
    setSelectedStallIds(prev => 
      prev.includes(stallId) 
        ? prev.filter(id => id !== stallId)
        : [...prev, stallId]
    );
  };

  const selectAllStallsWithPending = () => {
    const stallsWithPending = stalls.filter(s => (stallPendingDetails[s.id]?.remainingBalance || 0) > 0);
    setSelectedStallIds(stallsWithPending.map(s => s.id));
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString();
  };

  // Build collections list for display
  const collections = [
    ...billingTransactions.map((t: any) => ({
      id: t.id,
      type: 'billing' as const,
      category: 'Stall Billing',
      description: t.stalls?.counter_name || 'Unknown Stall',
      amount: t.total,
      date: t.created_at
    })),
    ...stalls.filter(s => s.registration_fee && s.registration_fee > 0).map((s) => ({
      id: s.id,
      type: 'stall_booking' as const,
      category: 'Stall Booking Fee',
      description: s.counter_name,
      amount: s.registration_fee || 0,
      date: s.created_at
    })),
    ...registrations
      .filter(r => r.registration_type !== "stall_counter")
      .map(r => ({
        id: r.id,
        type: 'registration' as const,
        category: r.registration_type === 'employment_booking' ? 'Employment Booking' : 'Employment Registration',
        description: r.name,
        amount: r.amount,
        date: r.created_at
      }))
  ].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

  return (
    <PageLayout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Accounts & Cash Flow</h1>
            <p className="text-muted-foreground mt-1">Track complete event cash flow</p>
          </div>
          <Button onClick={() => setShowPaymentForm(!showPaymentForm)} variant="accent">
            <Plus className="h-4 w-4 mr-2" />
            Event Payments
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <Card className="border-l-4 border-l-success">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Collected</p>
                  <p className="text-3xl font-bold text-success">₹{totalCollected.toLocaleString()}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <ArrowDownCircle className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-destructive">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Paid</p>
                  <p className="text-3xl font-bold text-destructive">₹{totalPaid.toLocaleString()}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <ArrowUpCircle className="h-6 w-6 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cash Balance</p>
                  <p className="text-3xl font-bold text-primary">₹{cashBalance.toLocaleString()}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {showPaymentForm && (
          <Card className="mb-8 animate-slide-up">
            <CardHeader>
              <CardTitle>Event Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-6">
                <Button
                  variant={paymentType === "stall" ? "default" : "outline"}
                  onClick={() => setPaymentType("stall")}
                >
                  <Store className="h-4 w-4 mr-2" />
                  Payment to Stall
                </Button>
                <Button
                  variant={paymentType === "other" ? "default" : "outline"}
                  onClick={() => setPaymentType("other")}
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  Other Payments
                </Button>
              </div>

              {paymentType === "stall" ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Select Stalls</Label>
                    <Button variant="outline" size="sm" onClick={selectAllStallsWithPending}>
                      Select All with Pending
                    </Button>
                  </div>

                  <div className="max-h-64 overflow-y-auto border border-border rounded-lg p-2 space-y-1 bg-background">
                    {stalls.map(stall => {
                      const details = stallPendingDetails[stall.id];
                      const hasPending = details && details.remainingBalance > 0;
                      const isSelected = selectedStallIds.includes(stall.id);
                      
                      return (
                        <div 
                          key={stall.id}
                          onClick={() => toggleStallSelection(stall.id)}
                          className={`flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-primary/10 border border-primary/30' 
                              : hasPending 
                                ? 'bg-warning/5 hover:bg-warning/10 border border-warning/20' 
                                : 'hover:bg-muted'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox checked={isSelected} />
                            <div>
                              <p className="font-medium text-foreground">{stall.counter_name}</p>
                              <p className="text-sm text-muted-foreground">{stall.participant_name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            {hasPending ? (
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-warning" />
                                <span className="font-semibold text-warning">
                                  ₹{details.remainingBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-success">✓ Paid</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {selectedStallIds.length > 0 && (
                    <div className="p-4 bg-muted rounded-lg space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-sm text-muted-foreground">Selected Stalls</p>
                          <p className="text-lg font-semibold text-foreground">{selectedStallIds.length}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Pending</p>
                          <p className="text-lg font-semibold text-warning">
                            ₹{selectedStallsTotalPending.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </p>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          <p className="text-sm text-muted-foreground">Individual Pending</p>
                          <div className="text-xs text-muted-foreground max-h-16 overflow-y-auto">
                            {selectedStallIds.map(id => {
                              const stall = stalls.find(s => s.id === id);
                              const details = stallPendingDetails[id];
                              return (
                                <div key={id} className="flex justify-between">
                                  <span>{stall?.counter_name}</span>
                                  <span>₹{details?.remainingBalance.toLocaleString(undefined, { maximumFractionDigits: 0 }) || 0}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-border space-y-4">
                        <div className="space-y-2">
                          <Label>Payment Amount (₹)</Label>
                          <Input
                            type="number"
                            value={bulkPaymentAmount}
                            onChange={(e) => setBulkPaymentAmount(e.target.value)}
                            placeholder={`Max: ₹${selectedStallsTotalPending.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                            max={selectedStallsTotalPending}
                          />
                          <p className="text-xs text-muted-foreground">Amount will be distributed proportionally across selected stalls</p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            onClick={handleBulkStallPayment} 
                            disabled={createPaymentMutation.isPending || !bulkPaymentAmount}
                          >
                            {createPaymentMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Process Payment
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => setBulkPaymentAmount(String(selectedStallsTotalPending))}
                          >
                            Pay Full Amount
                          </Button>
                          <Button variant="ghost" onClick={() => {
                            setShowPaymentForm(false);
                            setSelectedStallIds([]);
                          }}>Cancel</Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedStallIds.length === 0 && (
                    <p className="text-sm text-muted-foreground">Select stalls to view payment details</p>
                  )}
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Narration / Description</Label>
                    <Input
                      value={otherPayment.narration}
                      onChange={(e) => setOtherPayment({ ...otherPayment, narration: e.target.value })}
                      placeholder="Enter payment description"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount (₹)</Label>
                    <Input
                      type="number"
                      value={otherPayment.amount}
                      onChange={(e) => setOtherPayment({ ...otherPayment, amount: e.target.value })}
                      placeholder="Enter amount"
                    />
                  </div>
                  <div className="md:col-span-2 flex gap-2">
                    <Button onClick={handleOtherPayment} disabled={createPaymentMutation.isPending}>
                      {createPaymentMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Record Payment
                    </Button>
                    <Button variant="ghost" onClick={() => setShowPaymentForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="collections" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="collections" className="flex items-center gap-2">
              <ArrowDownCircle className="h-4 w-4" />
              Cash Collected
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <ArrowUpCircle className="h-4 w-4" />
              Cash Paid
            </TabsTrigger>
          </TabsList>

          <TabsContent value="collections">
            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center">
                      <Store className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Stall Billing</p>
                      <p className="text-xl font-bold text-foreground">₹{totalBillingCollected.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
                      <Store className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Stall Booking Fee</p>
                      <p className="text-xl font-bold text-foreground">₹{stallBookingFees.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Briefcase className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Emp. Booking</p>
                      <p className="text-xl font-bold text-foreground">₹{empBookingTotal.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
                      <Briefcase className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Emp. Reg.</p>
                      <p className="text-xl font-bold text-foreground">₹{empRegTotal.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left p-4 font-medium text-muted-foreground">Date</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Category</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Description</th>
                        <th className="text-right p-4 font-medium text-muted-foreground">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {collections.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-muted-foreground">No collections yet</td>
                        </tr>
                      ) : (
                        collections.map((t) => (
                          <tr key={t.id} className="border-b border-border/50">
                            <td className="p-4 text-muted-foreground">{formatDate(t.date)}</td>
                            <td className="p-4">
                              <span className="px-2 py-1 bg-success/10 text-success rounded-md text-sm">
                                {t.category}
                              </span>
                            </td>
                            <td className="p-4 text-foreground">{t.description}</td>
                            <td className="p-4 text-right font-semibold text-success">+₹{t.amount.toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            {/* Summary Cards for Payments */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Store className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Stall Payments (Event)</p>
                      <p className="text-xl font-bold text-foreground">₹{stallPaymentsTotal.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center">
                      <Receipt className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Other Payments</p>
                      <p className="text-xl font-bold text-foreground">₹{otherPaymentsTotal.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Event Payments (Stall Payments) */}
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Store className="h-5 w-5 text-primary" />
                  Event Payments (Stall Payments)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left p-4 font-medium text-muted-foreground">Date</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Stall</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Description</th>
                        <th className="text-right p-4 font-medium text-muted-foreground">Amount</th>
                        <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentsLoading ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                          </td>
                        </tr>
                      ) : payments.filter((p: any) => p.payment_type === 'participant').length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-muted-foreground">No event payments yet</td>
                        </tr>
                      ) : (
                        payments.filter((p: any) => p.payment_type === 'participant').map((p: any) => (
                          <tr key={p.id} className="border-b border-border/50">
                            <td className="p-4 text-muted-foreground">{formatDate(p.created_at)}</td>
                            <td className="p-4">
                              <span className="px-2 py-1 bg-primary/10 text-primary rounded-md text-sm">
                                {p.stalls?.counter_name || 'Unknown Stall'}
                              </span>
                            </td>
                            <td className="p-4 text-foreground">
                              {editingPaymentId === p.id ? (
                                <Input
                                  value={editPaymentData.narration}
                                  onChange={(e) => setEditPaymentData({ ...editPaymentData, narration: e.target.value })}
                                  className="w-full"
                                />
                              ) : (
                                p.narration || 'Stall payment'
                              )}
                            </td>
                            <td className="p-4 text-right font-semibold text-destructive">
                              {editingPaymentId === p.id ? (
                                <Input
                                  type="number"
                                  value={editPaymentData.amount}
                                  onChange={(e) => setEditPaymentData({ ...editPaymentData, amount: e.target.value })}
                                  className="w-24 ml-auto"
                                />
                              ) : (
                                `-₹${p.amount_paid.toLocaleString()}`
                              )}
                            </td>
                            <td className="p-4 text-right">
                              {editingPaymentId === p.id ? (
                                <div className="flex justify-end gap-1">
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    onClick={handleSaveEdit}
                                    disabled={updatePaymentMutation.isPending}
                                  >
                                    <Check className="h-4 w-4 text-success" />
                                  </Button>
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    onClick={() => setEditingPaymentId(null)}
                                  >
                                    <X className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex justify-end gap-1">
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    onClick={() => handleEditPayment(p)}
                                  >
                                    <Pencil className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    onClick={() => setDeletePaymentId(p.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Other Payments */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-warning" />
                  Other Payments
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left p-4 font-medium text-muted-foreground">Date</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Description</th>
                        <th className="text-right p-4 font-medium text-muted-foreground">Amount</th>
                        <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentsLoading ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                          </td>
                        </tr>
                      ) : payments.filter((p: any) => p.payment_type === 'other').length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-muted-foreground">No other payments yet</td>
                        </tr>
                      ) : (
                        payments.filter((p: any) => p.payment_type === 'other').map((p: any) => (
                          <tr key={p.id} className="border-b border-border/50">
                            <td className="p-4 text-muted-foreground">{formatDate(p.created_at)}</td>
                            <td className="p-4 text-foreground">
                              {editingPaymentId === p.id ? (
                                <Input
                                  value={editPaymentData.narration}
                                  onChange={(e) => setEditPaymentData({ ...editPaymentData, narration: e.target.value })}
                                  className="w-full"
                                />
                              ) : (
                                p.narration || 'No description'
                              )}
                            </td>
                            <td className="p-4 text-right font-semibold text-destructive">
                              {editingPaymentId === p.id ? (
                                <Input
                                  type="number"
                                  value={editPaymentData.amount}
                                  onChange={(e) => setEditPaymentData({ ...editPaymentData, amount: e.target.value })}
                                  className="w-24 ml-auto"
                                />
                              ) : (
                                `-₹${p.amount_paid.toLocaleString()}`
                              )}
                            </td>
                            <td className="p-4 text-right">
                              {editingPaymentId === p.id ? (
                                <div className="flex justify-end gap-1">
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    onClick={handleSaveEdit}
                                    disabled={updatePaymentMutation.isPending}
                                  >
                                    <Check className="h-4 w-4 text-success" />
                                  </Button>
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    onClick={() => setEditingPaymentId(null)}
                                  >
                                    <X className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex justify-end gap-1">
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    onClick={() => handleEditPayment(p)}
                                  >
                                    <Pencil className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    onClick={() => setDeletePaymentId(p.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletePaymentId} onOpenChange={() => setDeletePaymentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deletePaymentId && deletePaymentMutation.mutate(deletePaymentId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
}
