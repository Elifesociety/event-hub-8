import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Receipt, 
  Plus, 
  Trash2,
  Printer,
  UserPlus,
  Loader2,
  Check,
  ChevronDown,
  X,
  CheckCircle
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Tables, Enums } from "@/integrations/supabase/types";

type Stall = Tables<"stalls">;
type Product = Tables<"products">;
type BillingTransaction = Tables<"billing_transactions">;
type Registration = Tables<"registrations">;
type Payment = Tables<"payments">;

interface BillItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export default function Billing() {
  const queryClient = useQueryClient();
  const [selectedStalls, setSelectedStalls] = useState<string[]>([]);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [registration, setRegistration] = useState({
    type: "stall_counter" as Enums<"registration_type">,
    name: "",
    category: "",
    mobile: "",
    amount: ""
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch all stalls (for billing dropdown - verified only)
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

  // Fetch all stalls for registrations (includes unverified for registration fee tracking)
  const { data: allStalls = [], isLoading: stallsLoading } = useQuery({
    queryKey: ['all_stalls'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stalls')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Stall[];
    }
  });

  // Fetch stall registration payments
  const { data: stallPayments = [] } = useQuery({
    queryKey: ['stall_payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('payment_type', 'participant')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Payment[];
    }
  });

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('item_name');
      if (error) throw error;
      return data as Product[];
    }
  });

  // Fetch billing transactions
  const { data: bills = [], isLoading: billsLoading } = useQuery({
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

  // Fetch registrations
  const { data: registrations = [], isLoading: regsLoading } = useQuery({
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

  // Create bill mutation
  const createBillMutation = useMutation({
    mutationFn: async (bill: { stall_id: string; items: BillItem[]; subtotal: number; total: number }) => {
      const receiptNumber = `BILL-${Date.now()}`;
      const { data, error } = await supabase
        .from('billing_transactions')
        .insert({
          stall_id: bill.stall_id,
          items: JSON.parse(JSON.stringify(bill.items)),
          subtotal: bill.subtotal,
          total: bill.total,
          receipt_number: receiptNumber,
          status: 'pending'
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing_transactions'] });
      setBillItems([]);
      setSelectedStalls([]);
      toast.success("Bill generated successfully!");
    },
    onError: (error) => {
      toast.error("Failed to generate bill: " + error.message);
    }
  });

  // Mark bill as paid mutation
  const markPaidMutation = useMutation({
    mutationFn: async (billId: string) => {
      const { data, error } = await supabase
        .from('billing_transactions')
        .update({ status: 'paid' })
        .eq('id', billId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing_transactions'] });
      toast.success("Payment received!");
    },
    onError: (error) => {
      toast.error("Failed to update status: " + error.message);
    }
  });

  // Create registration mutation
  const createRegMutation = useMutation({
    mutationFn: async (reg: typeof registration) => {
      const receiptNumber = `REG-${Date.now()}`;
      const { data, error } = await supabase
        .from('registrations')
        .insert({
          registration_type: reg.type,
          name: reg.name,
          category: reg.category || null,
          mobile: reg.mobile || null,
          amount: parseFloat(reg.amount),
          receipt_number: receiptNumber
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
      setRegistration({ type: "stall_counter", name: "", category: "", mobile: "", amount: "" });
      toast.success("Registration completed!");
    },
    onError: (error) => {
      toast.error("Failed to complete registration: " + error.message);
    }
  });

  // Mark stall registration as paid
  const markStallPaidMutation = useMutation({
    mutationFn: async (stall: Stall) => {
      const { data, error } = await supabase
        .from('payments')
        .insert({
          stall_id: stall.id,
          payment_type: 'participant',
          amount_paid: stall.registration_fee || 0,
          total_billed: stall.registration_fee || 0,
          narration: `Registration fee for ${stall.counter_name}`
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stall_payments'] });
      toast.success("Registration fee received!");
    },
    onError: (error) => {
      toast.error("Failed to record payment: " + error.message);
    }
  });

  // Verify stall mutation
  const verifyStallMutation = useMutation({
    mutationFn: async (stallId: string) => {
      const { error } = await supabase
        .from('stalls')
        .update({ is_verified: true })
        .eq('id', stallId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all_stalls'] });
      queryClient.invalidateQueries({ queryKey: ['stalls'] });
      toast.success("Stall verified!");
    },
    onError: (error) => {
      toast.error("Failed to verify stall: " + error.message);
    }
  });

  const stallProducts = selectedStalls.length > 0 
    ? products.filter(p => selectedStalls.includes(p.stall_id)) 
    : [];

  const toggleStallSelection = (stallId: string) => {
    setSelectedStalls(prev => 
      prev.includes(stallId) 
        ? prev.filter(id => id !== stallId)
        : [...prev, stallId]
    );
  };

  const removeStall = (stallId: string) => {
    setSelectedStalls(prev => prev.filter(id => id !== stallId));
  };

  const addItemToBill = (product: Product) => {
    const existingItem = billItems.find(item => item.id === product.id);
    if (existingItem) {
      setBillItems(billItems.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setBillItems([...billItems, {
        id: product.id,
        name: product.item_name,
        quantity: 1,
        price: product.selling_price || 0
      }]);
    }
  };

  const removeItem = (id: string) => {
    setBillItems(billItems.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return removeItem(id);
    setBillItems(billItems.map(item =>
      item.id === id ? { ...item, quantity } : item
    ));
  };

  const calculateTotal = () => {
    return billItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const generateBill = () => {
    if (selectedStalls.length === 0 || billItems.length === 0) {
      toast.error("Please select at least one counter and add items");
      return;
    }
    
    const total = calculateTotal();
    createBillMutation.mutate({
      stall_id: selectedStalls[0],
      items: billItems,
      subtotal: total,
      total: total
    });
  };

  const handleRegistration = () => {
    if (!registration.name || !registration.amount) {
      toast.error("Please fill all required fields");
      return;
    }
    createRegMutation.mutate(registration);
  };

  const getStallName = (stallId: string) => {
    const stall = stalls.find(s => s.id === stallId);
    return stall?.counter_name || 'Unknown';
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString();
  };

  const getRegTypeLabel = (type: Enums<"registration_type">) => {
    switch (type) {
      case 'stall_counter': return 'Stall Counter';
      case 'employment_booking': return 'Employment Booking';
      case 'employment_registration': return 'Employment Registration';
      default: return type;
    }
  };

  // Filter bills by status
  const pendingBills = bills.filter((bill: any) => bill.status === 'pending');
  const paidBills = bills.filter((bill: any) => bill.status === 'paid');
  
  // Stall registration payment status
  const isStallPaid = (stallId: string) => stallPayments.some(p => p.stall_id === stallId);
  const pendingStalls = allStalls.filter(s => !isStallPaid(s.id) && (s.registration_fee || 0) > 0);
  const paidStalls = allStalls.filter(s => isStallPaid(s.id));
  
  // Calculate total collected (only paid bills + paid stall registrations)
  const totalCollectedFromBills = paidBills.reduce((sum: number, bill: any) => sum + Number(bill.total), 0);
  const totalCollectedFromStallRegs = stallPayments.reduce((sum, p) => sum + Number(p.amount_paid), 0);
  const totalCollectedFromOtherRegs = registrations.reduce((sum, reg) => sum + Number(reg.amount), 0);

  return (
    <PageLayout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Billing & Registrations</h1>
          <p className="text-muted-foreground mt-1">Process bills and manage registrations</p>
        </div>

        <Tabs defaultValue="billing" className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Billing
            </TabsTrigger>
            <TabsTrigger value="receipts" className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              Receipts
            </TabsTrigger>
            <TabsTrigger value="registrations" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Registrations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="billing">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>New Bill</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Counters</Label>
                    <div className="relative" ref={dropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="w-full flex items-center justify-between px-3 py-2 border border-input rounded-md bg-background hover:bg-accent/50 transition-colors min-h-[42px]"
                      >
                        <div className="flex flex-wrap gap-1 flex-1">
                          {selectedStalls.length === 0 ? (
                            <span className="text-muted-foreground">Select counters...</span>
                          ) : (
                            selectedStalls.map(id => (
                              <Badge key={id} variant="secondary" className="flex items-center gap-1">
                                {getStallName(id)}
                                <X 
                                  className="h-3 w-3 cursor-pointer hover:text-destructive" 
                                  onClick={(e) => { e.stopPropagation(); removeStall(id); }}
                                />
                              </Badge>
                            ))
                          )}
                        </div>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {isDropdownOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {stalls.length === 0 ? (
                            <div className="p-3 text-muted-foreground text-sm">No counters available</div>
                          ) : (
                            stalls.map(stall => (
                              <div
                                key={stall.id}
                                onClick={() => toggleStallSelection(stall.id)}
                                className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent transition-colors"
                              >
                                <div className={`h-4 w-4 border rounded flex items-center justify-center ${selectedStalls.includes(stall.id) ? 'bg-primary border-primary' : 'border-input'}`}>
                                  {selectedStalls.includes(stall.id) && <Check className="h-3 w-3 text-primary-foreground" />}
                                </div>
                                <span className="text-foreground">{stall.counter_name}</span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedStalls.length > 0 && stallProducts.length > 0 && (
                    <div className="space-y-2">
                      <Label>Add Items</Label>
                      <div className="flex flex-wrap gap-2">
                        {stallProducts.map((product) => (
                          <Button
                            key={product.id}
                            variant="outline"
                            size="sm"
                            onClick={() => addItemToBill(product)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            {product.item_name} - ₹{product.selling_price}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedStalls.length > 0 && stallProducts.length === 0 && (
                    <p className="text-sm text-muted-foreground">No products found for selected counters</p>
                  )}

                  {billItems.length > 0 && (
                    <div className="space-y-2">
                      <Label>Bill Items</Label>
                      <div className="border border-border rounded-lg divide-y divide-border">
                        {billItems.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-3">
                            <div>
                              <p className="font-medium text-foreground">{item.name}</p>
                              <p className="text-sm text-muted-foreground">₹{item.price} each</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              >
                                -
                              </Button>
                              <span className="w-8 text-center font-medium">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              >
                                +
                              </Button>
                              <span className="w-16 text-right font-semibold">
                                ₹{item.price * item.quantity}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => removeItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <span className="text-lg font-semibold">Total</span>
                        <span className="text-2xl font-bold text-primary">₹{calculateTotal()}</span>
                      </div>

                      <Button 
                        onClick={generateBill} 
                        className="w-full" 
                        size="lg"
                        disabled={createBillMutation.isPending}
                      >
                        {createBillMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        <Receipt className="h-4 w-4 mr-2" />
                        Generate Bill
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Bills</CardTitle>
                </CardHeader>
                <CardContent>
                  {billsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : bills.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No bills generated yet</p>
                  ) : (
                    <div className="space-y-4">
                      {bills.slice(0, 5).map((bill: any) => (
                        <div key={bill.id} className="p-4 border border-border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-foreground">
                              {bill.stalls?.counter_name || getStallName(bill.stall_id)}
                            </span>
                            <Badge variant={bill.status === 'paid' ? 'default' : 'secondary'}>
                              {bill.status === 'paid' ? 'Paid' : 'Pending'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {bill.receipt_number}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(bill.created_at)}
                          </p>
                          <p className="text-lg font-bold text-primary mt-1">₹{bill.total}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="receipts">
            <div className="mb-6">
              <Card className="bg-gradient-to-r from-primary/10 to-secondary/10">
                <CardContent className="py-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Collected</p>
                      <p className="text-3xl font-bold text-primary">₹{totalCollectedFromBills + totalCollectedFromStallRegs + totalCollectedFromOtherRegs}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">From Bills: ₹{totalCollectedFromBills}</p>
                      <p className="text-sm text-muted-foreground">Stall Registrations: ₹{totalCollectedFromStallRegs}</p>
                      <p className="text-sm text-muted-foreground">Other Registrations: ₹{totalCollectedFromOtherRegs}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Pending Bills</span>
                    <Badge variant="secondary">{pendingBills.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pendingBills.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No pending bills</p>
                  ) : (
                    <div className="space-y-3">
                      {pendingBills.map((bill: any) => (
                        <div key={bill.id} className="p-3 border border-border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-medium">{bill.stalls?.counter_name || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">{bill.receipt_number}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(bill.created_at)}</p>
                            </div>
                            <span className="font-bold text-lg text-primary">₹{bill.total}</span>
                          </div>
                          <Button 
                            size="sm" 
                            className="w-full mt-2"
                            onClick={() => markPaidMutation.mutate(bill.id)}
                            disabled={markPaidMutation.isPending}
                          >
                            {markPaidMutation.isPending ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4 mr-2" />
                            )}
                            Cash Received
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Paid Bills</span>
                    <Badge variant="default">{paidBills.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {paidBills.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No paid bills yet</p>
                  ) : (
                    <div className="space-y-3">
                      {paidBills.map((bill: any) => (
                        <div key={bill.id} className="p-3 border border-border rounded-lg flex items-center justify-between bg-primary/5">
                          <div>
                            <p className="font-medium">{bill.stalls?.counter_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{bill.receipt_number}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(bill.created_at)}</p>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-lg text-green-600">₹{bill.total}</span>
                            <Badge variant="default" className="ml-2">Paid</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Registration Receipts</CardTitle>
              </CardHeader>
              <CardContent>
                {registrations.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No registration receipts</p>
                ) : (
                  <div className="space-y-3">
                    {registrations.map((reg) => (
                      <div key={reg.id} className="p-3 border border-border rounded-lg flex items-center justify-between">
                        <div>
                          <p className="font-medium">{reg.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {getRegTypeLabel(reg.registration_type)} - {formatDate(reg.created_at)}
                          </p>
                        </div>
                        <span className="font-bold text-green-600">₹{reg.amount}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="registrations">
            <div className="space-y-6">
              {/* Stall Registrations from Food Court */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Pending Stall Registrations</span>
                      <Badge variant="secondary">{pendingStalls.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stallsLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : pendingStalls.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No pending stall registrations</p>
                    ) : (
                      <div className="space-y-3">
                        {pendingStalls.map((stall) => (
                          <div key={stall.id} className="p-3 border border-border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="font-medium">{stall.counter_name}</p>
                                <p className="text-sm text-muted-foreground">{stall.participant_name}</p>
                                {stall.mobile && <p className="text-xs text-muted-foreground">Mobile: {stall.mobile}</p>}
                                <p className="text-xs text-muted-foreground">{formatDate(stall.created_at)}</p>
                              </div>
                              <span className="font-bold text-lg text-primary">₹{stall.registration_fee || 0}</span>
                            </div>
                            <Button 
                              size="sm" 
                              className="w-full mt-2"
                              onClick={() => markStallPaidMutation.mutate(stall)}
                              disabled={markStallPaidMutation.isPending}
                            >
                              {markStallPaidMutation.isPending ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4 mr-2" />
                              )}
                              Cash Received
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Paid Stall Registrations</span>
                      <Badge variant="default">{paidStalls.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {paidStalls.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No paid stall registrations yet</p>
                    ) : (
                      <div className="space-y-3">
                        {paidStalls.map((stall) => (
                          <div key={stall.id} className="p-3 border border-border rounded-lg bg-primary/5">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="font-medium">{stall.counter_name}</p>
                                <p className="text-sm text-muted-foreground">{stall.participant_name}</p>
                                {stall.mobile && <p className="text-xs text-muted-foreground">Mobile: {stall.mobile}</p>}
                                <p className="text-xs text-muted-foreground">{formatDate(stall.created_at)}</p>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-lg text-green-600">₹{stall.registration_fee || 0}</span>
                                <Badge variant="default" className="ml-2">Paid</Badge>
                              </div>
                            </div>
                            {!stall.is_verified && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="w-full mt-2"
                                onClick={() => verifyStallMutation.mutate(stall.id)}
                                disabled={verifyStallMutation.isPending}
                              >
                                {verifyStallMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                )}
                                Verify Stall
                              </Button>
                            )}
                            {stall.is_verified && (
                              <Badge variant="secondary" className="w-full justify-center mt-2">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Verified
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Other Registrations */}
              <div className="grid lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>New Registration (Other)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Registration Type</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: 'employment_booking', label: 'Employment Booking', icon: UserPlus },
                          { value: 'employment_registration', label: 'Employment Reg.', icon: UserPlus }
                        ].map(({ value, label, icon: Icon }) => (
                          <Button
                            key={value}
                            variant={registration.type === value ? "default" : "outline"}
                            className="flex flex-col h-auto py-3"
                            onClick={() => setRegistration(prev => ({ ...prev, type: value as Enums<"registration_type"> }))}
                          >
                            <Icon className="h-5 w-5 mb-1" />
                            <span className="text-xs text-center">{label}</span>
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg-name">Name *</Label>
                      <Input
                        id="reg-name"
                        value={registration.name}
                        onChange={(e) => setRegistration(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg-category">Category</Label>
                      <Input
                        id="reg-category"
                        value={registration.category}
                        onChange={(e) => setRegistration(prev => ({ ...prev, category: e.target.value }))}
                        placeholder="Enter category"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg-mobile">Mobile</Label>
                      <Input
                        id="reg-mobile"
                        value={registration.mobile}
                        onChange={(e) => setRegistration(prev => ({ ...prev, mobile: e.target.value }))}
                        placeholder="Enter mobile number"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg-amount">Amount *</Label>
                      <Input
                        id="reg-amount"
                        type="number"
                        value={registration.amount}
                        onChange={(e) => setRegistration(prev => ({ ...prev, amount: e.target.value }))}
                        placeholder="Enter amount"
                      />
                    </div>

                    <Button 
                      onClick={handleRegistration} 
                      className="w-full" 
                      size="lg"
                      disabled={createRegMutation.isPending}
                    >
                      {createRegMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      <UserPlus className="h-4 w-4 mr-2" />
                      Complete Registration
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Registrations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {regsLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : registrations.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No registrations yet</p>
                    ) : (
                      <div className="space-y-4">
                        {registrations.slice(0, 10).map((reg) => (
                          <div key={reg.id} className="p-4 border border-border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-foreground">{reg.name}</span>
                              <Badge variant="outline">{getRegTypeLabel(reg.registration_type)}</Badge>
                            </div>
                            {reg.category && (
                              <p className="text-sm text-muted-foreground">Category: {reg.category}</p>
                            )}
                            {reg.mobile && (
                              <p className="text-sm text-muted-foreground">Mobile: {reg.mobile}</p>
                            )}
                            <p className="text-sm text-muted-foreground">{reg.receipt_number}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-muted-foreground">{formatDate(reg.created_at)}</span>
                              <span className="text-lg font-bold text-primary">₹{reg.amount}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}