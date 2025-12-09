import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Store, 
  Plus, 
  Package,
  CheckCircle,
  Clock,
  Trash2,
  Loader2,
  CreditCard,
  FileText,
  Eye
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Stall = Tables<"stalls">;
type Product = Tables<"products">;

interface Enquiry {
  id: string;
  name: string;
  mobile: string;
  panchayath_id: string | null;
  ward_id: string | null;
  responses: Record<string, string>;
  status: string;
  created_at: string;
  panchayaths?: { name: string } | null;
  wards?: { ward_number: string; ward_name: string | null } | null;
}



export default function FoodCourt() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showStallForm, setShowStallForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [selectedStall, setSelectedStall] = useState<string>("");
  
  const [newStall, setNewStall] = useState({
    counter_name: "",
    participant_name: "",
    mobile: "",
    registration_fee: ""
  });

  const [newProduct, setNewProduct] = useState({
    item_name: "",
    cost_price: "",
    selling_price: "",  // MRP - manually entered
    event_margin: "20"  // Commission rate %
  });

  const [viewingEnquiry, setViewingEnquiry] = useState<Enquiry | null>(null);

  // Fetch stalls
  const { data: stalls = [], isLoading: stallsLoading } = useQuery({
    queryKey: ['stalls'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stalls')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Stall[];
    }
  });

  // Fetch products
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Product[];
    }
  });

  // Fetch verified enquiries
  const { data: verifiedEnquiries = [], isLoading: enquiriesLoading } = useQuery({
    queryKey: ['verified-stall-enquiries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stall_enquiries')
        .select(`
          *,
          panchayaths(name),
          wards(ward_number, ward_name)
        `)
        .eq('status', 'verified')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Enquiry[];
    }
  });

  // Fetch enquiry fields for labels
  const { data: enquiryFields = [] } = useQuery({
    queryKey: ['stall-enquiry-fields'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stall_enquiry_fields')
        .select('id, field_label')
        .order('display_order');
      if (error) throw error;
      return data as { id: string; field_label: string }[];
    }
  });

  // Add stall mutation
  const addStallMutation = useMutation({
    mutationFn: async (stall: typeof newStall) => {
      const { data, error } = await supabase
        .from('stalls')
        .insert({
          counter_name: stall.counter_name,
          participant_name: stall.participant_name,
          mobile: stall.mobile || null,
          registration_fee: stall.registration_fee ? parseFloat(stall.registration_fee) : 0,
          is_verified: false
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stalls'] });
      setNewStall({ counter_name: "", participant_name: "", mobile: "", registration_fee: "" });
      setShowStallForm(false);
      toast.success("Stall registered successfully!");
    },
    onError: (error) => {
      toast.error("Failed to register stall: " + error.message);
    }
  });

  // Add product mutation
  const addProductMutation = useMutation({
    mutationFn: async (product: { item_name: string; cost_price: number; selling_price: number; event_margin: number; stall_id: string }) => {
      const { data, error } = await supabase
        .from('products')
        .insert({
          item_name: product.item_name,
          cost_price: product.cost_price,
          selling_price: product.selling_price,  // MRP manually set
          event_margin: product.event_margin,  // Commission rate for bill balance calculation
          stall_id: product.stall_id
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setNewProduct({ item_name: "", cost_price: "", selling_price: "", event_margin: "20" });
      setShowProductForm(false);
      toast.success("Product added successfully!");
    },
    onError: (error) => {
      toast.error("Failed to add product: " + error.message);
    }
  });

  // Verify stall mutation
  const verifyStallMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('stalls')
        .update({ is_verified: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stalls'] });
      toast.success("Stall verified!");
    }
  });

  // Delete stall mutation
  const deleteStallMutation = useMutation({
    mutationFn: async (id: string) => {
      // Delete products first
      await supabase.from('products').delete().eq('stall_id', id);
      const { error } = await supabase.from('stalls').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stalls'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success("Stall deleted!");
    }
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success("Product deleted!");
    }
  });

  const handleAddStall = async () => {
    if (!newStall.counter_name || !newStall.participant_name) {
      toast.error("Please fill required fields");
      return;
    }
    
    // Check for duplicate mobile number
    if (newStall.mobile && newStall.mobile.trim()) {
      const existingStall = stalls.find(s => s.mobile === newStall.mobile.trim());
      if (existingStall) {
        toast.error(`Mobile number already registered for stall: ${existingStall.counter_name}`);
        return;
      }
    }
    
    addStallMutation.mutate(newStall);
  };

  const handleAddProduct = () => {
    if (newProduct.item_name && newProduct.cost_price && newProduct.selling_price && selectedStall) {
      addProductMutation.mutate({
        item_name: newProduct.item_name,
        cost_price: parseFloat(newProduct.cost_price),
        selling_price: parseFloat(newProduct.selling_price),
        event_margin: parseFloat(newProduct.event_margin) || 20,
        stall_id: selectedStall
      });
    } else {
      toast.error("Please fill all fields including MRP");
    }
  };

  const getStallProducts = (stallId: string) => products.filter(p => p.stall_id === stallId);

  if (stallsLoading || productsLoading || enquiriesLoading) {
    return (
      <PageLayout>
        <div className="container py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Food Court & Stalls</h1>
            <p className="text-muted-foreground mt-1">Manage stall registrations and product listings</p>
          </div>
        </div>

        <Tabs defaultValue="stalls" className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="stalls" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Stall Booking
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Products
            </TabsTrigger>
            <TabsTrigger value="enquiries" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Enquiries ({verifiedEnquiries.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stalls">
            <div className="flex justify-end mb-4">
              <Button onClick={() => setShowStallForm(!showStallForm)} variant="accent">
                <Plus className="h-4 w-4 mr-2" />
                Register Stall
              </Button>
            </div>

            {showStallForm && (
              <Card className="mb-6 animate-slide-up">
                <CardHeader>
                  <CardTitle>Stall Registration</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="counterName">Counter Name *</Label>
                      <Input
                        id="counterName"
                        value={newStall.counter_name}
                        onChange={(e) => setNewStall({ ...newStall, counter_name: e.target.value })}
                        placeholder="Enter counter name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="owner">Participant Name *</Label>
                      <Input
                        id="owner"
                        value={newStall.participant_name}
                        onChange={(e) => setNewStall({ ...newStall, participant_name: e.target.value })}
                        placeholder="Enter participant name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stallPhone">Mobile</Label>
                      <Input
                        id="stallPhone"
                        value={newStall.mobile}
                        onChange={(e) => setNewStall({ ...newStall, mobile: e.target.value })}
                        placeholder="Enter phone number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fee">Registration Fee (₹)</Label>
                      <Input
                        id="fee"
                        type="number"
                        value={newStall.registration_fee}
                        onChange={(e) => setNewStall({ ...newStall, registration_fee: e.target.value })}
                        placeholder="Enter registration fee"
                      />
                    </div>
                    <div className="md:col-span-2 flex gap-2">
                      <Button onClick={handleAddStall} disabled={addStallMutation.isPending}>
                        {addStallMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Register Stall
                      </Button>
                      <Button variant="outline" onClick={() => setShowStallForm(false)}>Cancel</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stalls.map((stall) => (
                <Card key={stall.id} className="animate-fade-in">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center">
                          <Store className="h-6 w-6 text-warning" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{stall.counter_name}</h3>
                          <p className="text-sm text-muted-foreground">{stall.participant_name}</p>
                        </div>
                      </div>
                      <Badge variant={stall.is_verified ? "default" : "secondary"}>
                        {stall.is_verified ? (
                          <><CheckCircle className="h-3 w-3 mr-1" /> Verified</>
                        ) : (
                          <><Clock className="h-3 w-3 mr-1" /> Pending</>
                        )}
                      </Badge>
                    </div>
                    <div className="mt-4 text-sm text-muted-foreground">
                      {stall.mobile && <p>Phone: {stall.mobile}</p>}
                      {stall.email && <p>Email: {stall.email}</p>}
                      {stall.registration_fee && <p>Fee: ₹{stall.registration_fee}</p>}
                      <p className="mt-2 text-xs">Products: {getStallProducts(stall.id).length}</p>
                    </div>
                    <div className="mt-4 flex gap-2">
                      {!stall.is_verified && (
                        <Button 
                          size="sm" 
                          onClick={() => navigate('/billing')}
                        >
                          <CreditCard className="h-3 w-3 mr-1" />
                          Paid Stall Registration
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => deleteStallMutation.mutate(stall.id)}
                        disabled={deleteStallMutation.isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="products">
            <div className="flex justify-end mb-4 gap-4">
              <select
                value={selectedStall}
                onChange={(e) => setSelectedStall(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select Stall</option>
                {stalls.filter(s => s.is_verified).map(s => (
                  <option key={s.id} value={s.id}>{s.counter_name}</option>
                ))}
              </select>
              <Button 
                onClick={() => setShowProductForm(!showProductForm)} 
                variant="accent"
                disabled={!selectedStall}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </div>

            {showProductForm && selectedStall && (
              <Card className="mb-6 animate-slide-up">
                <CardHeader>
                  <CardTitle>Add Product</CardTitle>
                  <p className="text-sm text-muted-foreground">Commission rate used for calculating bill balance</p>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="productName">Item Name</Label>
                      <Input
                        id="productName"
                        value={newProduct.item_name}
                        onChange={(e) => setNewProduct({ ...newProduct, item_name: e.target.value })}
                        placeholder="Enter item name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="costPrice">Cost Price (₹)</Label>
                      <Input
                        id="costPrice"
                        type="number"
                        value={newProduct.cost_price}
                        onChange={(e) => setNewProduct({ ...newProduct, cost_price: e.target.value })}
                        placeholder="Enter cost price"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mrpPrice">MRP / Selling Price (₹)</Label>
                      <Input
                        id="mrpPrice"
                        type="number"
                        value={newProduct.selling_price}
                        onChange={(e) => setNewProduct({ ...newProduct, selling_price: e.target.value })}
                        placeholder="Enter MRP manually"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="eventMargin">Commission Rate (%)</Label>
                      <Input
                        id="eventMargin"
                        type="number"
                        value={newProduct.event_margin}
                        onChange={(e) => setNewProduct({ ...newProduct, event_margin: e.target.value })}
                        placeholder="20"
                      />
                    </div>
                    <div className="md:col-span-4 flex gap-2">
                      <Button onClick={handleAddProduct} disabled={addProductMutation.isPending}>
                        {addProductMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Add Product
                      </Button>
                      <Button variant="outline" onClick={() => setShowProductForm(false)}>Cancel</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {stalls.filter(s => s.is_verified).map((stall) => {
              const stallProducts = getStallProducts(stall.id);
              if (stallProducts.length === 0) return null;
              
              return (
                <Card key={stall.id} className="mb-6 animate-fade-in">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Store className="h-5 w-5 text-warning" />
                      {stall.counter_name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 font-medium text-muted-foreground">Item Name</th>
                            <th className="text-right py-2 font-medium text-muted-foreground">Cost Price</th>
                            <th className="text-right py-2 font-medium text-muted-foreground">Margin</th>
                            <th className="text-right py-2 font-medium text-muted-foreground">MRP</th>
                            <th className="text-right py-2 font-medium text-muted-foreground">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stallProducts.map((product) => (
                            <tr key={product.id} className="border-b border-border/50">
                              <td className="py-3 font-medium text-foreground">{product.item_name}</td>
                              <td className="py-3 text-right text-muted-foreground">₹{product.cost_price}</td>
                              <td className="py-3 text-right text-success">{product.event_margin}%</td>
                              <td className="py-3 text-right font-semibold text-foreground">₹{product.selling_price}</td>
                              <td className="py-3 text-right">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => deleteProductMutation.mutate(product.id)}
                                  disabled={deleteProductMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="enquiries">
            {/* View Details Dialog */}
            <Dialog open={!!viewingEnquiry} onOpenChange={(open) => !open && setViewingEnquiry(null)}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Verified Enquiry Details</DialogTitle>
                </DialogHeader>
                {viewingEnquiry && (
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-muted-foreground text-xs">Name</p>
                        <p className="font-medium">{viewingEnquiry.name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Mobile</p>
                        <p className="font-medium">{viewingEnquiry.mobile}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Panchayath</p>
                        <p className="font-medium">{viewingEnquiry.panchayaths?.name || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Ward</p>
                        <p className="font-medium">
                          {viewingEnquiry.wards 
                            ? `${viewingEnquiry.wards.ward_number}${viewingEnquiry.wards.ward_name ? ` - ${viewingEnquiry.wards.ward_name}` : ''}`
                            : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Date</p>
                        <p className="font-medium">{new Date(viewingEnquiry.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    {Object.keys(viewingEnquiry.responses).length > 0 && (
                      <div className="border-t pt-4">
                        <p className="text-muted-foreground text-xs mb-2">Additional Responses</p>
                        <div className="space-y-3">
                          {Object.entries(viewingEnquiry.responses).map(([fieldId, value]) => {
                            const field = enquiryFields.find(f => f.id === fieldId);
                            const label = field?.field_label || fieldId;
                            return (
                              <div key={fieldId} className="border-b pb-2">
                                <p className="text-muted-foreground text-sm">{label}</p>
                                <p className="font-medium">{value}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </DialogContent>
            </Dialog>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {verifiedEnquiries.length === 0 ? (
                <Card className="md:col-span-2 lg:col-span-3">
                  <CardContent className="p-8 text-center text-muted-foreground">
                    No verified enquiries yet
                  </CardContent>
                </Card>
              ) : (
                verifiedEnquiries.map((enquiry) => (
                  <Card key={enquiry.id} className="animate-fade-in">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">{enquiry.name}</h3>
                            <p className="text-sm text-muted-foreground">{enquiry.mobile}</p>
                          </div>
                        </div>
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          Verified
                        </Badge>
                      </div>
                      <div className="mt-4 text-sm text-muted-foreground">
                        <p>Panchayath: {enquiry.panchayaths?.name || '-'}</p>
                        <p>Ward: {enquiry.wards 
                          ? `${enquiry.wards.ward_number}${enquiry.wards.ward_name ? ` - ${enquiry.wards.ward_name}` : ''}`
                          : '-'}</p>
                        <p className="text-xs mt-2">
                          Submitted: {new Date(enquiry.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="mt-4">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setViewingEnquiry(enquiry)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}
