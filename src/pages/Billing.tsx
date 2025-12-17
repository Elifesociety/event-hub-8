import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
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
  CheckCircle,
  Pencil,
  BarChart3,
  Store,
  RotateCcw
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
type Panchayath = Tables<"panchayaths">;
type SalesReturn = Tables<"sales_returns">;

interface BillItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  originalPrice: number;
  discount: number;
  event_margin: number;
}

interface ReturnItem extends BillItem {
  returnQty: number;
}

export default function Billing() {
  const queryClient = useQueryClient();
  const [selectedStalls, setSelectedStalls] = useState<string[]>([]);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [counterNumberInput, setCounterNumberInput] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Edit stall state
  const [editingStall, setEditingStall] = useState<Stall | null>(null);
  const [editForm, setEditForm] = useState({
    counter_name: "",
    participant_name: "",
    mobile: "",
    registration_fee: ""
  });
  
  const [registration, setRegistration] = useState({
    type: "stall_counter" as Enums<"registration_type">,
    name: "",
    category: "",
    mobile: "",
    amount: ""
  });

  // Stall Summary state
  const [summaryPanchayath, setSummaryPanchayath] = useState<string>("all");
  const [summaryStallId, setSummaryStallId] = useState<string>("");

  // Sales Return state
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selectedBillForReturn, setSelectedBillForReturn] = useState<any>(null);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);

  // Bill Edit/Delete state
  const VERIFICATION_CODE = "9497589094";
  const [verificationDialogOpen, setVerificationDialogOpen] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [pendingAction, setPendingAction] = useState<{ type: 'edit' | 'delete'; bill: any } | null>(null);
  const [editBillDialogOpen, setEditBillDialogOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<any>(null);
  const [editBillForm, setEditBillForm] = useState({
    customer_name: "",
    customer_mobile: "",
    total: ""
  });
  const [returnReason, setReturnReason] = useState("");

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

  // Fetch panchayaths
  const { data: panchayaths = [] } = useQuery({
    queryKey: ['panchayaths'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('panchayaths')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Panchayath[];
    }
  });

  // Fetch sales returns
  const { data: salesReturns = [] } = useQuery({
    queryKey: ['sales_returns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_returns')
        .select('*, billing_transactions(receipt_number, serial_number, stalls(counter_name))')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Create bill mutation
  const createBillMutation = useMutation({
    mutationFn: async (bill: { stall_id: string; items: BillItem[]; subtotal: number; total: number; customer_name?: string; customer_mobile?: string }) => {
      const receiptNumber = `BILL-${Date.now()}`;
      const { data, error } = await supabase
        .from('billing_transactions')
        .insert({
          stall_id: bill.stall_id,
          items: JSON.parse(JSON.stringify(bill.items)),
          subtotal: bill.subtotal,
          total: bill.total,
          receipt_number: receiptNumber,
          status: 'pending',
          customer_name: bill.customer_name || null,
          customer_mobile: bill.customer_mobile || null
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
      setCustomerName("");
      setCustomerMobile("");
      setCounterNumberInput("");
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

  // Create sales return mutation
  const createSalesReturnMutation = useMutation({
    mutationFn: async (returnData: { 
      bill_id: string; 
      stall_id: string; 
      items: ReturnItem[]; 
      return_amount: number; 
      reason?: string 
    }) => {
      const returnNumber = `RET-${Date.now()}`;
      const { data, error } = await supabase
        .from('sales_returns')
        .insert({
          bill_id: returnData.bill_id,
          stall_id: returnData.stall_id,
          items: JSON.parse(JSON.stringify(returnData.items.filter(i => i.returnQty > 0))),
          return_amount: returnData.return_amount,
          return_number: returnNumber,
          reason: returnData.reason || null
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales_returns'] });
      queryClient.invalidateQueries({ queryKey: ['billing_transactions'] });
      setReturnDialogOpen(false);
      setSelectedBillForReturn(null);
      setReturnItems([]);
      setReturnReason("");
      toast.success("Sales return recorded successfully!");
    },
    onError: (error) => {
      toast.error("Failed to record sales return: " + error.message);
    }
  });

  // Update bill mutation
  const updateBillMutation = useMutation({
    mutationFn: async (data: { id: string; customer_name?: string; customer_mobile?: string; total: number }) => {
      const { error } = await supabase
        .from('billing_transactions')
        .update({
          customer_name: data.customer_name || null,
          customer_mobile: data.customer_mobile || null,
          total: data.total,
          subtotal: data.total
        })
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing_transactions'] });
      setEditBillDialogOpen(false);
      setEditingBill(null);
      toast.success("Bill updated successfully!");
    },
    onError: (error) => {
      toast.error("Failed to update bill: " + error.message);
    }
  });

  // Delete bill mutation
  const deleteBillMutation = useMutation({
    mutationFn: async (id: string) => {
      // Delete related sales returns first
      await supabase.from('sales_returns').delete().eq('bill_id', id);
      const { error } = await supabase.from('billing_transactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['sales_returns'] });
      toast.success("Bill deleted successfully!");
    },
    onError: (error) => {
      toast.error("Failed to delete bill: " + error.message);
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

  // Update stall mutation
  const updateStallMutation = useMutation({
    mutationFn: async (data: { id: string; counter_name: string; participant_name: string; mobile: string | null; registration_fee: number }) => {
      const { error } = await supabase
        .from('stalls')
        .update({
          counter_name: data.counter_name,
          participant_name: data.participant_name,
          mobile: data.mobile,
          registration_fee: data.registration_fee
        })
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all_stalls'] });
      queryClient.invalidateQueries({ queryKey: ['stalls'] });
      setEditingStall(null);
      toast.success("Stall updated!");
    },
    onError: (error) => {
      toast.error("Failed to update stall: " + error.message);
    }
  });

  // Delete stall mutation
  const deleteStallMutation = useMutation({
    mutationFn: async (id: string) => {
      // Delete related products and payments first
      await supabase.from('products').delete().eq('stall_id', id);
      await supabase.from('payments').delete().eq('stall_id', id);
      await supabase.from('billing_transactions').delete().eq('stall_id', id);
      const { error } = await supabase.from('stalls').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all_stalls'] });
      queryClient.invalidateQueries({ queryKey: ['stalls'] });
      queryClient.invalidateQueries({ queryKey: ['stall_payments'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['billing_transactions'] });
      toast.success("Stall deleted!");
    },
    onError: (error) => {
      toast.error("Failed to delete stall: " + error.message);
    }
  });

  const openEditDialog = (stall: Stall) => {
    setEditingStall(stall);
    setEditForm({
      counter_name: stall.counter_name,
      participant_name: stall.participant_name,
      mobile: stall.mobile || "",
      registration_fee: stall.registration_fee?.toString() || "0"
    });
  };

  const handleUpdateStall = () => {
    if (!editingStall || !editForm.counter_name || !editForm.participant_name) {
      toast.error("Please fill required fields");
      return;
    }
    updateStallMutation.mutate({
      id: editingStall.id,
      counter_name: editForm.counter_name,
      participant_name: editForm.participant_name,
      mobile: editForm.mobile || null,
      registration_fee: parseFloat(editForm.registration_fee) || 0
    });
  };

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
      const sellingPrice = product.selling_price || 0;
      setBillItems([...billItems, {
        id: product.id,
        name: product.item_name,
        quantity: 1,
        price: sellingPrice,
        originalPrice: sellingPrice,
        discount: 0,
        event_margin: product.event_margin || 20
      }]);
    }
  };

  const updateItemPrice = (id: string, newPrice: number) => {
    setBillItems(billItems.map(item => {
      if (item.id === id) {
        const discount = item.originalPrice - newPrice;
        return { ...item, price: Math.max(0, newPrice), discount: Math.max(0, discount) };
      }
      return item;
    }));
  };

  const updateItemDiscount = (id: string, discount: number) => {
    setBillItems(billItems.map(item => {
      if (item.id === id) {
        const newPrice = item.originalPrice - discount;
        return { ...item, discount: Math.max(0, discount), price: Math.max(0, newPrice) };
      }
      return item;
    }));
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
      total: total,
      customer_name: customerName.trim() || undefined,
      customer_mobile: customerMobile.trim() || undefined
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

  // Bill edit/delete helpers
  const requestBillAction = (type: 'edit' | 'delete', bill: any) => {
    setPendingAction({ type, bill });
    setVerificationCode("");
    setVerificationDialogOpen(true);
  };

  const handleVerification = () => {
    if (verificationCode !== VERIFICATION_CODE) {
      toast.error("Invalid verification code");
      return;
    }
    
    if (pendingAction?.type === 'edit') {
      setEditingBill(pendingAction.bill);
      setEditBillForm({
        customer_name: pendingAction.bill.customer_name || "",
        customer_mobile: pendingAction.bill.customer_mobile || "",
        total: pendingAction.bill.total?.toString() || ""
      });
      setEditBillDialogOpen(true);
    } else if (pendingAction?.type === 'delete') {
      deleteBillMutation.mutate(pendingAction.bill.id);
    }
    
    setVerificationDialogOpen(false);
    setPendingAction(null);
    setVerificationCode("");
  };

  const handleUpdateBill = () => {
    if (!editingBill || !editBillForm.total) {
      toast.error("Please enter a valid total amount");
      return;
    }
    updateBillMutation.mutate({
      id: editingBill.id,
      customer_name: editBillForm.customer_name || undefined,
      customer_mobile: editBillForm.customer_mobile || undefined,
      total: parseFloat(editBillForm.total)
    });
  };

  // Sales return helpers
  const openReturnDialog = (bill: any) => {
    const billItemsArray = bill.items as BillItem[];
    const itemsWithReturn: ReturnItem[] = billItemsArray.map(item => ({
      ...item,
      returnQty: 0
    }));
    setSelectedBillForReturn(bill);
    setReturnItems(itemsWithReturn);
    setReturnReason("");
    setReturnDialogOpen(true);
  };

  const updateReturnQty = (itemId: string, qty: number) => {
    setReturnItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, returnQty: Math.min(Math.max(0, qty), item.quantity) };
      }
      return item;
    }));
  };

  const calculateReturnTotal = () => {
    return returnItems.reduce((sum, item) => sum + (item.price * item.returnQty), 0);
  };

  const handleSalesReturn = () => {
    const returnTotal = calculateReturnTotal();
    if (returnTotal <= 0) {
      toast.error("Please select items to return");
      return;
    }
    createSalesReturnMutation.mutate({
      bill_id: selectedBillForReturn.id,
      stall_id: selectedBillForReturn.stall_id,
      items: returnItems,
      return_amount: returnTotal,
      reason: returnReason.trim() || undefined
    });
  };

  // Get returns for a specific bill
  const getBillReturns = (billId: string) => {
    return salesReturns.filter((r: any) => r.bill_id === billId);
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
  const totalSalesReturns = salesReturns.reduce((sum: number, r: any) => sum + Number(r.return_amount), 0);

  // Stall Summary calculations
  const summaryStalls = summaryPanchayath === "all" 
    ? allStalls 
    : allStalls.filter(s => s.panchayath_id === summaryPanchayath);
  
  const selectedSummaryStall = summaryStallId ? allStalls.find(s => s.id === summaryStallId) : null;
  
  const stallBills = summaryStallId 
    ? bills.filter((b: any) => b.stall_id === summaryStallId)
    : [];
  
  const stallTotalSales = stallBills.reduce((sum: number, bill: any) => sum + Number(bill.total), 0);
  const stallPaidSales = stallBills.filter((b: any) => b.status === 'paid').reduce((sum: number, bill: any) => sum + Number(bill.total), 0);
  const stallPendingSales = stallBills.filter((b: any) => b.status === 'pending').reduce((sum: number, bill: any) => sum + Number(bill.total), 0);
  
  // Calculate commission from bills
  const stallCommission = stallBills.reduce((sum: number, bill: any) => {
    const items = bill.items as BillItem[];
    if (!Array.isArray(items)) return sum;
    return sum + items.reduce((itemSum, item) => {
      const margin = item.event_margin || 20;
      return itemSum + (item.price * item.quantity * margin / 100);
    }, 0);
  }, 0);
  
  // Items sold details
  const itemsSoldMap = new Map<string, { name: string; quantity: number; total: number }>();
  stallBills.forEach((bill: any) => {
    const items = bill.items as BillItem[];
    if (!Array.isArray(items)) return;
    items.forEach(item => {
      const existing = itemsSoldMap.get(item.name);
      if (existing) {
        existing.quantity += item.quantity;
        existing.total += item.price * item.quantity;
      } else {
        itemsSoldMap.set(item.name, { name: item.name, quantity: item.quantity, total: item.price * item.quantity });
      }
    });
  });
  const itemsSold = Array.from(itemsSoldMap.values()).sort((a, b) => b.total - a.total);

  return (
    <PageLayout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Billing & Registrations</h1>
          <p className="text-muted-foreground mt-1">Process bills and manage registrations</p>
        </div>

        <Tabs defaultValue="billing" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
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
            <TabsTrigger value="stall-summary" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Stall Summary
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
                    <Label>Enter Counter Number(s)</Label>
                    <Input
                      value={counterNumberInput}
                      onChange={(e) => {
                        const value = e.target.value;
                        setCounterNumberInput(value);
                        
                        // Parse comma-separated or space-separated counter numbers
                        const numbers = value.split(/[,\s]+/).map(n => n.trim()).filter(n => n);
                        
                        // Find matching stalls and add them
                        numbers.forEach(num => {
                          const matchingStall = stalls.find(s => 
                            s.counter_number?.toLowerCase() === num.toLowerCase()
                          );
                          if (matchingStall && !selectedStalls.includes(matchingStall.id)) {
                            setSelectedStalls(prev => [...prev, matchingStall.id]);
                          }
                        });
                      }}
                      placeholder="Enter counter numbers (e.g., 1, 2, 3)"
                      className="h-10"
                    />
                  </div>

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
                                <span className="text-foreground">
                                  {stall.counter_number ? `#${stall.counter_number} - ` : ''}{stall.counter_name}
                                </span>
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
                      <div className="border border-border rounded-lg overflow-hidden">
                        {/* Desktop Header - Hidden on mobile */}
                        <div className="hidden md:grid grid-cols-12 gap-2 p-2 bg-muted/50 text-xs font-medium text-muted-foreground border-b border-border">
                          <div className="col-span-3">Item</div>
                          <div className="col-span-2 text-center">MRP</div>
                          <div className="col-span-2 text-center">Discount</div>
                          <div className="col-span-2 text-center">Qty</div>
                          <div className="col-span-2 text-right">Total</div>
                          <div className="col-span-1"></div>
                        </div>
                        {/* Items */}
                        <div className="divide-y divide-border">
                          {billItems.map((item) => (
                            <div key={item.id} className="p-3">
                              {/* Mobile Layout */}
                              <div className="md:hidden space-y-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="font-medium text-foreground">{item.name}</p>
                                    <p className="text-xs text-muted-foreground">Original: ₹{item.originalPrice}</p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive -mt-1"
                                    onClick={() => removeItem(item.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <Label className="text-xs text-muted-foreground">MRP</Label>
                                    <Input
                                      type="number"
                                      value={item.price}
                                      onChange={(e) => updateItemPrice(item.id, parseFloat(e.target.value) || 0)}
                                      className="h-9 text-center"
                                      min={0}
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs text-muted-foreground">Discount</Label>
                                    <Input
                                      type="number"
                                      value={item.discount}
                                      onChange={(e) => updateItemDiscount(item.id, parseFloat(e.target.value) || 0)}
                                      className="h-9 text-center"
                                      min={0}
                                      max={item.originalPrice}
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs text-muted-foreground">Qty</Label>
                                    <div className="flex items-center justify-center gap-1">
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-9 w-9"
                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                      >
                                        -
                                      </Button>
                                      <span className="w-8 text-center font-bold text-lg">{item.quantity}</span>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-9 w-9"
                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                      >
                                        +
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex justify-end">
                                  <span className="font-bold text-lg text-primary">₹{item.price * item.quantity}</span>
                                </div>
                              </div>
                              
                              {/* Desktop Layout */}
                              <div className="hidden md:grid grid-cols-12 gap-2 items-center">
                                <div className="col-span-3">
                                  <p className="font-medium text-foreground text-sm truncate">{item.name}</p>
                                  <p className="text-xs text-muted-foreground">Orig: ₹{item.originalPrice}</p>
                                </div>
                                <div className="col-span-2">
                                  <Input
                                    type="number"
                                    value={item.price}
                                    onChange={(e) => updateItemPrice(item.id, parseFloat(e.target.value) || 0)}
                                    className="h-8 text-center text-sm"
                                    min={0}
                                  />
                                </div>
                                <div className="col-span-2">
                                  <Input
                                    type="number"
                                    value={item.discount}
                                    onChange={(e) => updateItemDiscount(item.id, parseFloat(e.target.value) || 0)}
                                    className="h-8 text-center text-sm"
                                    min={0}
                                    max={item.originalPrice}
                                  />
                                </div>
                                <div className="col-span-2 flex items-center justify-center gap-1">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                  >
                                    -
                                  </Button>
                                  <span className="w-6 text-center font-medium text-sm">{item.quantity}</span>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  >
                                    +
                                  </Button>
                                </div>
                                <div className="col-span-2 text-right font-semibold text-sm">
                                  ₹{item.price * item.quantity}
                                </div>
                                <div className="col-span-1 flex justify-end">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive"
                                    onClick={() => removeItem(item.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Customer Info (Optional) */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="customerName" className="text-xs">Customer Name (Optional)</Label>
                          <Input
                            id="customerName"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Enter name"
                            maxLength={100}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="customerMobile" className="text-xs">Mobile (Optional)</Label>
                          <Input
                            id="customerMobile"
                            value={customerMobile}
                            onChange={(e) => setCustomerMobile(e.target.value)}
                            placeholder="Enter mobile"
                            maxLength={15}
                          />
                        </div>
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
                            <div>
                              <Badge variant="outline" className="mr-2">#{bill.serial_number || '-'}</Badge>
                              <span className="font-semibold text-foreground">
                                {bill.stalls?.counter_name || getStallName(bill.stall_id)}
                              </span>
                            </div>
                            <Badge variant={bill.status === 'paid' ? 'default' : 'secondary'}>
                              {bill.status === 'paid' ? 'Paid' : 'Pending'}
                            </Badge>
                          </div>
                          {bill.customer_name && (
                            <p className="text-sm text-foreground">Customer: {bill.customer_name}</p>
                          )}
                          {bill.customer_mobile && (
                            <p className="text-xs text-muted-foreground">Mobile: {bill.customer_mobile}</p>
                          )}
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
                      <p className="text-sm text-muted-foreground">Net Collected</p>
                      <p className="text-3xl font-bold text-primary">
                        ₹{totalCollectedFromBills + totalCollectedFromStallRegs + totalCollectedFromOtherRegs - totalSalesReturns}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-sm text-muted-foreground">From Bills: ₹{totalCollectedFromBills}</p>
                      <p className="text-sm text-muted-foreground">Stall Registrations: ₹{totalCollectedFromStallRegs}</p>
                      <p className="text-sm text-muted-foreground">Other Registrations: ₹{totalCollectedFromOtherRegs}</p>
                      {totalSalesReturns > 0 && (
                        <p className="text-sm text-destructive">Sales Returns: -₹{totalSalesReturns}</p>
                      )}
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
                          <div className="flex gap-2 mt-2">
                            <Button 
                              size="sm" 
                              className="flex-1"
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
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => requestBillAction('edit', bill)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => requestBillAction('delete', bill)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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
                      {paidBills.map((bill: any) => {
                        const billReturns = getBillReturns(bill.id);
                        const totalReturned = billReturns.reduce((sum: number, r: any) => sum + Number(r.return_amount), 0);
                        return (
                          <div key={bill.id} className="p-3 border border-border rounded-lg bg-primary/5">
                            <div className="flex items-center justify-between mb-2">
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
                            {totalReturned > 0 && (
                              <div className="text-xs text-destructive mb-2">
                                Returned: ₹{totalReturned} ({billReturns.length} return{billReturns.length > 1 ? 's' : ''})
                              </div>
                            )}
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="flex-1"
                                onClick={() => openReturnDialog(bill)}
                              >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Sales Return
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => requestBillAction('edit', bill)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => requestBillAction('delete', bill)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
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

            {/* Sales Returns Section */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <RotateCcw className="h-5 w-5" />
                    Sales Returns
                  </span>
                  <Badge variant="destructive">{salesReturns.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {salesReturns.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No sales returns recorded</p>
                ) : (
                  <div className="space-y-3">
                    {salesReturns.slice(0, 10).map((returnItem: any) => (
                      <div key={returnItem.id} className="p-3 border border-destructive/30 rounded-lg bg-destructive/5">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-medium">
                              {returnItem.billing_transactions?.stalls?.counter_name || 'Unknown'}
                            </p>
                            <p className="text-xs text-muted-foreground">{returnItem.return_number}</p>
                            <p className="text-xs text-muted-foreground">
                              Bill: #{returnItem.billing_transactions?.serial_number || '-'}
                            </p>
                            <p className="text-xs text-muted-foreground">{formatDate(returnItem.created_at)}</p>
                          </div>
                          <span className="font-bold text-lg text-destructive">-₹{returnItem.return_amount}</span>
                        </div>
                        {returnItem.reason && (
                          <p className="text-xs text-muted-foreground mt-1">Reason: {returnItem.reason}</p>
                        )}
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
                            <div className="flex gap-2 mt-2">
                              {!stall.is_verified && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => verifyStallMutation.mutate(stall.id)}
                                  disabled={verifyStallMutation.isPending}
                                >
                                  {verifyStallMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                  )}
                                  Verify
                                </Button>
                              )}
                              {stall.is_verified && (
                                <Badge variant="secondary" className="flex-1 justify-center py-2">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Verified
                                </Badge>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditDialog(stall)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  if (confirm(`Delete stall "${stall.counter_name}"? This will also delete all related products, payments and bills.`)) {
                                    deleteStallMutation.mutate(stall.id);
                                  }
                                }}
                                disabled={deleteStallMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
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

          <TabsContent value="stall-summary">
            <div className="space-y-6">
              {/* Filters */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5" />
                    Select Stall
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Filter by Panchayath</Label>
                      <Select value={summaryPanchayath} onValueChange={(val) => { setSummaryPanchayath(val); setSummaryStallId(""); }}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Panchayaths" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Panchayaths</SelectItem>
                          {panchayaths.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Select Stall</Label>
                      <Select value={summaryStallId} onValueChange={setSummaryStallId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a stall..." />
                        </SelectTrigger>
                        <SelectContent>
                          {summaryStalls.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground">No stalls found</div>
                          ) : (
                            summaryStalls.map((stall) => (
                              <SelectItem key={stall.id} value={stall.id}>
                                {stall.counter_number ? `#${stall.counter_number} - ` : ''}{stall.counter_name} ({stall.participant_name})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Summary Details */}
              {selectedSummaryStall ? (
                <>
                  {/* Stall Info Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle>{selectedSummaryStall.counter_name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Participant</p>
                          <p className="font-medium">{selectedSummaryStall.participant_name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Counter Number</p>
                          <p className="font-medium">{selectedSummaryStall.counter_number || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Mobile</p>
                          <p className="font-medium">{selectedSummaryStall.mobile || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Status</p>
                          <Badge variant={selectedSummaryStall.is_verified ? 'default' : 'secondary'}>
                            {selectedSummaryStall.is_verified ? 'Verified' : 'Not Verified'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Sales Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
                      <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground">Total Sales</p>
                        <p className="text-2xl font-bold text-primary">₹{stallTotalSales.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground mt-1">{stallBills.length} bills</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
                      <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground">Paid Sales</p>
                        <p className="text-2xl font-bold text-green-600">₹{stallPaidSales.toFixed(2)}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5">
                      <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground">Pending Sales</p>
                        <p className="text-2xl font-bold text-amber-600">₹{stallPendingSales.toFixed(2)}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5">
                      <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground">Commission</p>
                        <p className="text-2xl font-bold text-secondary-foreground">₹{stallCommission.toFixed(2)}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Items Sold Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Items Sold</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {itemsSold.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">No items sold yet</p>
                      ) : (
                        <div className="border border-border rounded-lg overflow-hidden">
                          <div className="grid grid-cols-3 gap-4 p-3 bg-muted/50 text-sm font-medium text-muted-foreground border-b border-border">
                            <div>Item Name</div>
                            <div className="text-center">Quantity</div>
                            <div className="text-right">Total</div>
                          </div>
                          <div className="divide-y divide-border">
                            {itemsSold.map((item, idx) => (
                              <div key={idx} className="grid grid-cols-3 gap-4 p-3 items-center">
                                <div className="font-medium">{item.name}</div>
                                <div className="text-center">{item.quantity}</div>
                                <div className="text-right font-semibold text-primary">₹{item.total.toFixed(2)}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Recent Bills */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Bills ({stallBills.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {stallBills.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">No bills found for this stall</p>
                      ) : (
                        <div className="space-y-3">
                          {stallBills.slice(0, 10).map((bill: any) => (
                            <div key={bill.id} className="p-3 border border-border rounded-lg flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">#{bill.serial_number || '-'}</Badge>
                                  <Badge variant={bill.status === 'paid' ? 'default' : 'secondary'}>
                                    {bill.status === 'paid' ? 'Paid' : 'Pending'}
                                  </Badge>
                                </div>
                                {bill.customer_name && <p className="text-sm mt-1">{bill.customer_name}</p>}
                                <p className="text-xs text-muted-foreground mt-1">{formatDate(bill.created_at)}</p>
                              </div>
                              <span className="text-lg font-bold text-primary">₹{bill.total}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center text-muted-foreground">
                      <Store className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Select a stall to view sales summary</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Stall Dialog */}
        <Dialog open={!!editingStall} onOpenChange={(open) => !open && setEditingStall(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Stall</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-counter">Counter Name *</Label>
                <Input
                  id="edit-counter"
                  value={editForm.counter_name}
                  onChange={(e) => setEditForm({ ...editForm, counter_name: e.target.value })}
                  placeholder="Enter counter name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-participant">Participant Name *</Label>
                <Input
                  id="edit-participant"
                  value={editForm.participant_name}
                  onChange={(e) => setEditForm({ ...editForm, participant_name: e.target.value })}
                  placeholder="Enter participant name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-mobile">Mobile</Label>
                <Input
                  id="edit-mobile"
                  value={editForm.mobile}
                  onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                  placeholder="Enter mobile number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-fee">Registration Fee (₹)</Label>
                <Input
                  id="edit-fee"
                  type="number"
                  value={editForm.registration_fee}
                  onChange={(e) => setEditForm({ ...editForm, registration_fee: e.target.value })}
                  placeholder="Enter registration fee"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUpdateStall} disabled={updateStallMutation.isPending} className="flex-1">
                  {updateStallMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setEditingStall(null)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Sales Return Dialog */}
        <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Sales Return</DialogTitle>
            </DialogHeader>
            {selectedBillForReturn && (
              <div className="space-y-4 pt-4">
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{selectedBillForReturn.stalls?.counter_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{selectedBillForReturn.receipt_number}</p>
                    </div>
                    <Badge>Bill Total: ₹{selectedBillForReturn.total}</Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Select Items to Return</Label>
                  <div className="border rounded-lg divide-y">
                    {returnItems.map((item) => (
                      <div key={item.id} className="p-3 flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            ₹{item.price} × {item.quantity} = ₹{item.price * item.quantity}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateReturnQty(item.id, item.returnQty - 1)}
                            disabled={item.returnQty <= 0}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center font-medium">{item.returnQty}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateReturnQty(item.id, item.returnQty + 1)}
                            disabled={item.returnQty >= item.quantity}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Reason for Return (Optional)</Label>
                  <Textarea
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    placeholder="Enter reason for return..."
                    rows={2}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg">
                  <span className="font-semibold">Return Amount</span>
                  <span className="text-xl font-bold text-destructive">₹{calculateReturnTotal()}</span>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={handleSalesReturn} 
                    disabled={createSalesReturnMutation.isPending || calculateReturnTotal() <= 0}
                    className="flex-1"
                    variant="destructive"
                  >
                    {createSalesReturnMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Process Return
                  </Button>
                  <Button variant="outline" onClick={() => setReturnDialogOpen(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Verification Dialog */}
        <Dialog open={verificationDialogOpen} onOpenChange={setVerificationDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Verification Required</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Enter verification code to {pendingAction?.type === 'edit' ? 'edit' : 'delete'} this bill.
              </p>
              <div className="space-y-2">
                <Label htmlFor="verification-code">Verification Code</Label>
                <Input
                  id="verification-code"
                  type="password"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter code"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleVerification} 
                  className="flex-1"
                  variant={pendingAction?.type === 'delete' ? 'destructive' : 'default'}
                >
                  {pendingAction?.type === 'edit' ? 'Proceed to Edit' : 'Delete Bill'}
                </Button>
                <Button variant="outline" onClick={() => setVerificationDialogOpen(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Bill Dialog */}
        <Dialog open={editBillDialogOpen} onOpenChange={setEditBillDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Bill</DialogTitle>
            </DialogHeader>
            {editingBill && (
              <div className="space-y-4 pt-4">
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{editingBill.stalls?.counter_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{editingBill.receipt_number}</p>
                    </div>
                    <Badge>{editingBill.status}</Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-bill-name">Customer Name</Label>
                  <Input
                    id="edit-bill-name"
                    value={editBillForm.customer_name}
                    onChange={(e) => setEditBillForm({ ...editBillForm, customer_name: e.target.value })}
                    placeholder="Enter customer name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-bill-mobile">Customer Mobile</Label>
                  <Input
                    id="edit-bill-mobile"
                    value={editBillForm.customer_mobile}
                    onChange={(e) => setEditBillForm({ ...editBillForm, customer_mobile: e.target.value })}
                    placeholder="Enter customer mobile"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-bill-total">Total Amount (₹) *</Label>
                  <Input
                    id="edit-bill-total"
                    type="number"
                    value={editBillForm.total}
                    onChange={(e) => setEditBillForm({ ...editBillForm, total: e.target.value })}
                    placeholder="Enter total amount"
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleUpdateBill} 
                    disabled={updateBillMutation.isPending} 
                    className="flex-1"
                  >
                    {updateBillMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={() => setEditBillDialogOpen(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
}