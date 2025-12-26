import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Search, Pencil, Trash2, Users, Package, Store } from "lucide-react";
import { Link } from "react-router-dom";

interface CustomerRegistration {
  id: string;
  name: string;
  mobile: string;
  panchayath_id: string | null;
  ward_id: string | null;
  place: string;
  created_at: string;
  panchayaths?: { name: string } | null;
  wards?: { ward_number: string; ward_name: string | null } | null;
}

interface Panchayath {
  id: string;
  name: string;
}

interface Ward {
  id: string;
  ward_number: string;
  ward_name: string | null;
}

interface ProductWithBilling {
  id: string;
  item_name: string;
  product_number: string | null;
  cost_price: number;
  selling_price: number | null;
  stall_name: string;
  total_billed: number;
  total_quantity: number;
}

interface StallWithBilling {
  id: string;
  counter_number: string | null;
  counter_name: string;
  participant_name: string;
  mobile: string | null;
  panchayath_name: string | null;
  is_verified: boolean | null;
  registration_fee: number | null;
  total_billed: number;
  product_count: number;
}

export default function CustomerManagement() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [stallSearchTerm, setStallSearchTerm] = useState("");
  const [filterPanchayath, setFilterPanchayath] = useState<string>("all");
  const [editingCustomer, setEditingCustomer] = useState<CustomerRegistration | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    mobile: "",
    panchayath_id: "",
    ward_id: "",
    place: "",
  });

  const { data: panchayaths = [] } = useQuery({
    queryKey: ["panchayaths"],
    queryFn: async () => {
      const { data, error } = await supabase.from("panchayaths").select("id, name").order("name");
      if (error) throw error;
      return data as Panchayath[];
    },
  });

  const { data: wards = [] } = useQuery({
    queryKey: ["wards", editForm.panchayath_id],
    queryFn: async () => {
      if (!editForm.panchayath_id) return [];
      const { data, error } = await supabase
        .from("wards")
        .select("id, ward_number, ward_name")
        .eq("panchayath_id", editForm.panchayath_id)
        .order("ward_number");
      if (error) throw error;
      return data as Ward[];
    },
    enabled: !!editForm.panchayath_id,
  });

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customer-registrations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_registrations")
        .select(`
          *,
          panchayaths(name),
          wards(ward_number, ward_name)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CustomerRegistration[];
    },
  });

  // Fetch products with billing data
  const { data: productsWithBilling = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ["products-with-billing"],
    queryFn: async () => {
      // Get all products with stall info
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select(`
          id,
          item_name,
          product_number,
          cost_price,
          selling_price,
          stalls(counter_name)
        `)
        .order("product_number");
      if (productsError) throw productsError;

      // Get all billing transactions
      const { data: transactions, error: transError } = await supabase
        .from("billing_transactions")
        .select("items");
      if (transError) throw transError;

      // Calculate total billed for each product
      const productBillingMap: Record<string, { total: number; quantity: number }> = {};
      
      transactions?.forEach((tx) => {
        const items = tx.items as Array<{ productId: string; quantity: number; subtotal: number }>;
        items?.forEach((item) => {
          if (!productBillingMap[item.productId]) {
            productBillingMap[item.productId] = { total: 0, quantity: 0 };
          }
          productBillingMap[item.productId].total += item.subtotal || 0;
          productBillingMap[item.productId].quantity += item.quantity || 0;
        });
      });

      // Combine products with billing data
      const result: ProductWithBilling[] = products?.map((p: any) => ({
        id: p.id,
        item_name: p.item_name,
        product_number: p.product_number,
        cost_price: p.cost_price,
        selling_price: p.selling_price,
        stall_name: p.stalls?.counter_name || "Unknown",
        total_billed: productBillingMap[p.id]?.total || 0,
        total_quantity: productBillingMap[p.id]?.quantity || 0,
      })) || [];

      // Sort by total billed (descending)
      return result.sort((a, b) => b.total_billed - a.total_billed);
    },
  });

  // Fetch stalls with billing data
  const { data: stallsWithBilling = [], isLoading: isLoadingStalls } = useQuery({
    queryKey: ["stalls-with-billing"],
    queryFn: async () => {
      // Get all stalls with panchayath info
      const { data: stalls, error: stallsError } = await supabase
        .from("stalls")
        .select(`
          id,
          counter_number,
          counter_name,
          participant_name,
          mobile,
          is_verified,
          registration_fee,
          panchayaths(name)
        `)
        .order("counter_number");
      if (stallsError) throw stallsError;

      // Get product count per stall
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("stall_id");
      if (productsError) throw productsError;

      const productCountMap: Record<string, number> = {};
      products?.forEach((p) => {
        productCountMap[p.stall_id] = (productCountMap[p.stall_id] || 0) + 1;
      });

      // Get billing totals per stall
      const { data: transactions, error: transError } = await supabase
        .from("billing_transactions")
        .select("stall_id, total");
      if (transError) throw transError;

      const stallBillingMap: Record<string, number> = {};
      transactions?.forEach((tx) => {
        stallBillingMap[tx.stall_id] = (stallBillingMap[tx.stall_id] || 0) + Number(tx.total);
      });

      // Combine stalls with billing data
      const result: StallWithBilling[] = stalls?.map((s: any) => ({
        id: s.id,
        counter_number: s.counter_number,
        counter_name: s.counter_name,
        participant_name: s.participant_name,
        mobile: s.mobile,
        panchayath_name: s.panchayaths?.name || null,
        is_verified: s.is_verified,
        registration_fee: s.registration_fee,
        total_billed: stallBillingMap[s.id] || 0,
        product_count: productCountMap[s.id] || 0,
      })) || [];

      // Sort by total billed (descending)
      return result.sort((a, b) => b.total_billed - a.total_billed);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<CustomerRegistration> }) => {
      const { error } = await supabase
        .from("customer_registrations")
        .update(data.updates)
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Customer updated successfully");
      setEditingCustomer(null);
      queryClient.invalidateQueries({ queryKey: ["customer-registrations"] });
    },
    onError: (error) => {
      toast.error("Update failed: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customer_registrations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Customer deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["customer-registrations"] });
    },
    onError: (error) => {
      toast.error("Delete failed: " + error.message);
    },
  });

  const handleEdit = (customer: CustomerRegistration) => {
    setEditingCustomer(customer);
    setEditForm({
      name: customer.name,
      mobile: customer.mobile,
      panchayath_id: customer.panchayath_id || "",
      ward_id: customer.ward_id || "",
      place: customer.place,
    });
  };

  const handleUpdate = () => {
    if (!editingCustomer) return;
    updateMutation.mutate({
      id: editingCustomer.id,
      updates: {
        name: editForm.name.trim(),
        mobile: editForm.mobile.trim(),
        panchayath_id: editForm.panchayath_id || null,
        ward_id: editForm.ward_id || null,
        place: editForm.place.trim(),
      },
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this customer?")) {
      deleteMutation.mutate(id);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.mobile.includes(searchTerm) ||
      c.place.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPanchayath = filterPanchayath === "all" || c.panchayath_id === filterPanchayath;
    return matchesSearch && matchesPanchayath;
  });

  const filteredProducts = productsWithBilling.filter((p) =>
    p.item_name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    p.stall_name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    (p.product_number && p.product_number.includes(productSearchTerm))
  );

  const filteredStalls = stallsWithBilling.filter((s) =>
    s.counter_name.toLowerCase().includes(stallSearchTerm.toLowerCase()) ||
    s.participant_name.toLowerCase().includes(stallSearchTerm.toLowerCase()) ||
    (s.mobile && s.mobile.includes(stallSearchTerm)) ||
    (s.counter_number && s.counter_number.includes(stallSearchTerm))
  );

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        <Link to="/admin">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin Panel
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Customer Management</CardTitle>
                <CardDescription>Manage participants and products</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="participants" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="participants" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Participants
                </TabsTrigger>
                <TabsTrigger value="products" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Products
                </TabsTrigger>
                <TabsTrigger value="stalls" className="flex items-center gap-2">
                  <Store className="h-4 w-4" />
                  Stalls
                </TabsTrigger>
              </TabsList>

              {/* Participants Tab */}
              <TabsContent value="participants">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, mobile, or place..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={filterPanchayath} onValueChange={setFilterPanchayath}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Filter by Panchayath" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Panchayaths</SelectItem>
                      {panchayaths.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Table */}
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : filteredCustomers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No customers found</div>
                ) : (
                  <div className="border rounded-lg overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Mobile</TableHead>
                          <TableHead>Panchayath</TableHead>
                          <TableHead>Ward</TableHead>
                          <TableHead>Place</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCustomers.map((customer) => (
                          <TableRow key={customer.id}>
                            <TableCell className="font-medium">{customer.name}</TableCell>
                            <TableCell>{customer.mobile}</TableCell>
                            <TableCell>{customer.panchayaths?.name || "-"}</TableCell>
                            <TableCell>
                              {customer.wards
                                ? `${customer.wards.ward_number}${customer.wards.ward_name ? ` - ${customer.wards.ward_name}` : ""}`
                                : "-"}
                            </TableCell>
                            <TableCell>{customer.place}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(customer)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(customer.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <div className="mt-4 text-sm text-muted-foreground">
                  Total: {filteredCustomers.length} participants
                </div>
              </TabsContent>

              {/* Products Tab */}
              <TabsContent value="products">
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by product name, stall, or number..."
                      value={productSearchTerm}
                      onChange={(e) => setProductSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {isLoadingProducts ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No products found</div>
                ) : (
                  <div className="border rounded-lg overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>P.No</TableHead>
                          <TableHead>Product Name</TableHead>
                          <TableHead>Stall</TableHead>
                          <TableHead className="text-right">Cost Price</TableHead>
                          <TableHead className="text-right">Selling Price</TableHead>
                          <TableHead className="text-right">Qty Sold</TableHead>
                          <TableHead className="text-right">Total Billed</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProducts.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell className="font-medium">{product.product_number || "-"}</TableCell>
                            <TableCell>{product.item_name}</TableCell>
                            <TableCell>{product.stall_name}</TableCell>
                            <TableCell className="text-right">₹{product.cost_price.toFixed(2)}</TableCell>
                            <TableCell className="text-right">
                              {product.selling_price ? `₹${product.selling_price.toFixed(2)}` : "-"}
                            </TableCell>
                            <TableCell className="text-right">{product.total_quantity}</TableCell>
                            <TableCell className="text-right font-semibold text-green-600">
                              ₹{product.total_billed.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <div className="mt-4 text-sm text-muted-foreground">
                  Total: {filteredProducts.length} products | 
                  Total Billed: ₹{productsWithBilling.reduce((sum, p) => sum + p.total_billed, 0).toFixed(2)}
                </div>
              </TabsContent>

              {/* Stalls Tab */}
              <TabsContent value="stalls">
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by stall name, participant, mobile, or number..."
                      value={stallSearchTerm}
                      onChange={(e) => setStallSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {isLoadingStalls ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : filteredStalls.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No stalls found</div>
                ) : (
                  <div className="border rounded-lg overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>S.No</TableHead>
                          <TableHead>Stall Name</TableHead>
                          <TableHead>Participant</TableHead>
                          <TableHead>Mobile</TableHead>
                          <TableHead>Panchayath</TableHead>
                          <TableHead className="text-center">Products</TableHead>
                          <TableHead className="text-center">Verified</TableHead>
                          <TableHead className="text-right">Reg. Fee</TableHead>
                          <TableHead className="text-right">Total Billed</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStalls.map((stall) => (
                          <TableRow key={stall.id}>
                            <TableCell className="font-medium">{stall.counter_number || "-"}</TableCell>
                            <TableCell>{stall.counter_name}</TableCell>
                            <TableCell>{stall.participant_name}</TableCell>
                            <TableCell>{stall.mobile || "-"}</TableCell>
                            <TableCell>{stall.panchayath_name || "-"}</TableCell>
                            <TableCell className="text-center">{stall.product_count}</TableCell>
                            <TableCell className="text-center">
                              <span className={`px-2 py-1 rounded-full text-xs ${stall.is_verified ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                                {stall.is_verified ? "Yes" : "No"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">₹{(stall.registration_fee || 0).toFixed(2)}</TableCell>
                            <TableCell className="text-right font-semibold text-green-600">
                              ₹{stall.total_billed.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <div className="mt-4 text-sm text-muted-foreground">
                  Total: {filteredStalls.length} stalls | 
                  Total Billed: ₹{stallsWithBilling.reduce((sum, s) => sum + s.total_billed, 0).toFixed(2)}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!editingCustomer} onOpenChange={() => setEditingCustomer(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Customer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Mobile</Label>
                <Input
                  value={editForm.mobile}
                  onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Panchayath</Label>
                <Select
                  value={editForm.panchayath_id}
                  onValueChange={(value) => setEditForm({ ...editForm, panchayath_id: value, ward_id: "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Panchayath" />
                  </SelectTrigger>
                  <SelectContent>
                    {panchayaths.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ward</Label>
                <Select
                  value={editForm.ward_id}
                  onValueChange={(value) => setEditForm({ ...editForm, ward_id: value })}
                  disabled={!editForm.panchayath_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Ward" />
                  </SelectTrigger>
                  <SelectContent>
                    {wards.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.ward_number} - {w.ward_name || "No Name"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Place</Label>
                <Input
                  value={editForm.place}
                  onChange={(e) => setEditForm({ ...editForm, place: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingCustomer(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}