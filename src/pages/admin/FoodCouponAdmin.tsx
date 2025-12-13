import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Utensils, Loader2, ArrowLeft, ChevronDown, ChevronRight, Users } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

interface FoodOption {
  id: string;
  name: string;
  price: number;
  is_active: boolean;
  display_order: number;
}

interface FoodCouponBooking {
  id: string;
  name: string;
  mobile: string;
  quantity: number;
  total_amount: number;
  status: string;
  created_at: string;
  panchayath_id: string;
  food_option_id: string;
  panchayaths: { name: string };
  food_options: { name: string; price: number };
}

interface Panchayath {
  id: string;
  name: string;
}

export default function FoodCouponAdmin() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("bookings");
  
  // Food option form state
  const [optionDialogOpen, setOptionDialogOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<FoodOption | null>(null);
  const [optionName, setOptionName] = useState("");
  const [optionPrice, setOptionPrice] = useState("");
  const [optionOrder, setOptionOrder] = useState("0");
  
  // Booking edit state
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<FoodCouponBooking | null>(null);
  const [editBookingName, setEditBookingName] = useState("");
  const [editBookingMobile, setEditBookingMobile] = useState("");
  const [editBookingPanchayath, setEditBookingPanchayath] = useState("");
  const [editBookingFoodOption, setEditBookingFoodOption] = useState("");
  const [editBookingQuantity, setEditBookingQuantity] = useState(1);
  
  // Filter state
  const [filterPanchayath, setFilterPanchayath] = useState("all");
  const [filterFoodOption, setFilterFoodOption] = useState("all");
  const { data: panchayaths = [] } = useQuery({
    queryKey: ["panchayaths"],
    queryFn: async () => {
      const { data, error } = await supabase.from("panchayaths").select("*").order("name");
      if (error) throw error;
      return data as Panchayath[];
    },
  });

  const { data: foodOptions = [], isLoading: optionsLoading } = useQuery({
    queryKey: ["food-options"],
    queryFn: async () => {
      const { data, error } = await supabase.from("food_options").select("*").order("display_order");
      if (error) throw error;
      return data as FoodOption[];
    },
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["food-coupon-bookings", filterPanchayath, filterFoodOption],
    queryFn: async () => {
      let query = supabase
        .from("food_coupon_bookings")
        .select("*, panchayaths(name), food_options(name, price)")
        .order("created_at", { ascending: false });

      if (filterPanchayath !== "all") {
        query = query.eq("panchayath_id", filterPanchayath);
      }
      if (filterFoodOption !== "all") {
        query = query.eq("food_option_id", filterFoodOption);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as FoodCouponBooking[];
    },
  });

  // Food Option Mutations
  const saveOptionMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: optionName.trim(),
        price: parseFloat(optionPrice),
        display_order: parseInt(optionOrder),
      };
      
      if (editingOption) {
        const { error } = await supabase.from("food_options").update(payload).eq("id", editingOption.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("food_options").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingOption ? "ഓപ്ഷൻ അപ്ഡേറ്റ് ചെയ്തു" : "ഓപ്ഷൻ ചേർത്തു");
      queryClient.invalidateQueries({ queryKey: ["food-options"] });
      resetOptionForm();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleOptionMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("food_options").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["food-options"] });
    },
  });

  const deleteOptionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("food_options").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ഓപ്ഷൻ ഡിലീറ്റ് ചെയ്തു");
      queryClient.invalidateQueries({ queryKey: ["food-options"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Booking Mutations
  const saveBookingMutation = useMutation({
    mutationFn: async () => {
      if (!editingBooking) return;
      const selectedFood = foodOptions.find((f) => f.id === editBookingFoodOption);
      const totalAmount = selectedFood ? selectedFood.price * editBookingQuantity : 0;
      
      const { error } = await supabase
        .from("food_coupon_bookings")
        .update({
          name: editBookingName.trim(),
          mobile: editBookingMobile.trim(),
          panchayath_id: editBookingPanchayath,
          food_option_id: editBookingFoodOption,
          quantity: editBookingQuantity,
          total_amount: totalAmount,
        })
        .eq("id", editingBooking.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ബുക്കിംഗ് അപ്ഡേറ്റ് ചെയ്തു");
      queryClient.invalidateQueries({ queryKey: ["food-coupon-bookings"] });
      resetBookingForm();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteBookingMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("food_coupon_bookings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ബുക്കിംഗ് ഡിലീറ്റ് ചെയ്തു");
      queryClient.invalidateQueries({ queryKey: ["food-coupon-bookings"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const resetOptionForm = () => {
    setOptionDialogOpen(false);
    setEditingOption(null);
    setOptionName("");
    setOptionPrice("");
    setOptionOrder("0");
  };

  const openEditOption = (option: FoodOption) => {
    setEditingOption(option);
    setOptionName(option.name);
    setOptionPrice(option.price.toString());
    setOptionOrder(option.display_order.toString());
    setOptionDialogOpen(true);
  };

  const resetBookingForm = () => {
    setBookingDialogOpen(false);
    setEditingBooking(null);
    setEditBookingName("");
    setEditBookingMobile("");
    setEditBookingPanchayath("");
    setEditBookingFoodOption("");
    setEditBookingQuantity(1);
  };

  const openEditBooking = (booking: FoodCouponBooking) => {
    setEditingBooking(booking);
    setEditBookingName(booking.name);
    setEditBookingMobile(booking.mobile);
    setEditBookingPanchayath(booking.panchayath_id);
    setEditBookingFoodOption(booking.food_option_id);
    setEditBookingQuantity(booking.quantity);
    setBookingDialogOpen(true);
  };

  // Calculate totals
  const totalBookings = bookings.length;
  const totalQuantity = bookings.reduce((sum, b) => sum + b.quantity, 0);
  const totalAmount = bookings.reduce((sum, b) => sum + Number(b.total_amount), 0);

  // Group bookings by mobile number
  const groupedBookings = useMemo(() => {
    const groups: Record<string, { name: string; mobile: string; panchayath: string; bookings: FoodCouponBooking[]; totalQty: number; totalAmt: number }> = {};
    bookings.forEach((booking) => {
      if (!groups[booking.mobile]) {
        groups[booking.mobile] = {
          name: booking.name,
          mobile: booking.mobile,
          panchayath: booking.panchayaths?.name || '-',
          bookings: [],
          totalQty: 0,
          totalAmt: 0,
        };
      }
      groups[booking.mobile].bookings.push(booking);
      groups[booking.mobile].totalQty += booking.quantity;
      groups[booking.mobile].totalAmt += Number(booking.total_amount);
    });
    return Object.values(groups).sort((a, b) => {
      const aLatest = Math.max(...a.bookings.map(b => new Date(b.created_at).getTime()));
      const bLatest = Math.max(...b.bookings.map(b => new Date(b.created_at).getTime()));
      return bLatest - aLatest;
    });
  }, [bookings]);

  const [expandedMobiles, setExpandedMobiles] = useState<Set<string>>(new Set());

  const toggleExpanded = (mobile: string) => {
    setExpandedMobiles((prev) => {
      const next = new Set(prev);
      if (next.has(mobile)) {
        next.delete(mobile);
      } else {
        next.add(mobile);
      }
      return next;
    });
  };

  return (
    <PageLayout>
      <section className="container py-6">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Utensils className="h-6 w-6" />
              Food Coupon Management
            </h1>
            <p className="text-muted-foreground">Manage food options and view bookings</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="options">Food Options</TabsTrigger>
          </TabsList>

          {/* Bookings Tab */}
          <TabsContent value="bookings">
            {/* Summary Cards */}
            <div className="grid sm:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold flex items-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    {groupedBookings.length}
                  </div>
                  <p className="text-muted-foreground text-sm">Unique Customers</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{totalBookings}</div>
                  <p className="text-muted-foreground text-sm">Total Bookings</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{totalQuantity}</div>
                  <p className="text-muted-foreground text-sm">Total Quantity</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-primary">₹{totalAmount}</div>
                  <p className="text-muted-foreground text-sm">Total Amount</p>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-4">
                  <div className="w-48">
                    <Label>Panchayath</Label>
                    <Select value={filterPanchayath} onValueChange={setFilterPanchayath}>
                      <SelectTrigger>
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Panchayaths</SelectItem>
                        {panchayaths.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-48">
                    <Label>Food Option</Label>
                    <Select value={filterFoodOption} onValueChange={setFilterFoodOption}>
                      <SelectTrigger>
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Options</SelectItem>
                        {foodOptions.map((o) => (
                          <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bookings Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Bookings</CardTitle>
                <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Booking</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Name *</Label>
                        <Input
                          value={editBookingName}
                          onChange={(e) => setEditBookingName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Mobile *</Label>
                        <Input
                          value={editBookingMobile}
                          onChange={(e) => setEditBookingMobile(e.target.value)}
                          maxLength={10}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Panchayath *</Label>
                        <Select value={editBookingPanchayath} onValueChange={setEditBookingPanchayath}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Panchayath" />
                          </SelectTrigger>
                          <SelectContent>
                            {panchayaths.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Food Option *</Label>
                        <Select value={editBookingFoodOption} onValueChange={setEditBookingFoodOption}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Food" />
                          </SelectTrigger>
                          <SelectContent>
                            {foodOptions.map((o) => (
                              <SelectItem key={o.id} value={o.id}>{o.name} - ₹{o.price}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={editBookingQuantity}
                          onChange={(e) => setEditBookingQuantity(parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <Button
                        className="w-full"
                        onClick={() => saveBookingMutation.mutate()}
                        disabled={!editBookingName.trim() || !editBookingMobile.trim() || !editBookingPanchayath || !editBookingFoodOption || saveBookingMutation.isPending}
                      >
                        {saveBookingMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Update
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {bookingsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : groupedBookings.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No bookings found</p>
                ) : (
                  <div className="space-y-2">
                    {groupedBookings.map((group) => (
                      <Collapsible
                        key={group.mobile}
                        open={expandedMobiles.has(group.mobile)}
                        onOpenChange={() => toggleExpanded(group.mobile)}
                      >
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors">
                            <div className="flex items-center gap-4">
                              {expandedMobiles.has(group.mobile) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              <div>
                                <p className="font-semibold">{group.name}</p>
                                <p className="text-sm text-muted-foreground">{group.mobile} • {group.panchayath}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-6 text-sm">
                              <span className="text-muted-foreground">
                                {group.bookings.length} booking{group.bookings.length > 1 ? 's' : ''}
                              </span>
                              <span>Qty: <strong>{group.totalQty}</strong></span>
                              <span className="font-semibold text-primary">₹{group.totalAmt}</span>
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="ml-8 mt-1 border-l-2 border-muted pl-4 space-y-2">
                            {group.bookings.map((booking) => (
                              <div
                                key={booking.id}
                                className="flex items-center justify-between p-3 bg-background rounded-md border"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="text-xs text-muted-foreground">
                                    {format(new Date(booking.created_at), "dd/MM/yyyy HH:mm")}
                                  </div>
                                  <div>
                                    <span className="font-medium">{booking.food_options?.name}</span>
                                    <span className="text-muted-foreground ml-2">× {booking.quantity}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <span className="font-semibold">₹{booking.total_amount}</span>
                                  <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditBooking(booking)}>
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => deleteBookingMutation.mutate(booking.id)}
                                    >
                                      <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Food Options Tab */}
          <TabsContent value="options">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Food Options</CardTitle>
                <Dialog open={optionDialogOpen} onOpenChange={setOptionDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => resetOptionForm()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Option
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingOption ? "Edit Food Option" : "Add Food Option"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Name *</Label>
                        <Input
                          value={optionName}
                          onChange={(e) => setOptionName(e.target.value)}
                          placeholder="e.g., Lunch Meals"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Price (₹) *</Label>
                        <Input
                          type="number"
                          value={optionPrice}
                          onChange={(e) => setOptionPrice(e.target.value)}
                          placeholder="e.g., 100"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Display Order</Label>
                        <Input
                          type="number"
                          value={optionOrder}
                          onChange={(e) => setOptionOrder(e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      <Button
                        className="w-full"
                        onClick={() => saveOptionMutation.mutate()}
                        disabled={!optionName.trim() || !optionPrice || saveOptionMutation.isPending}
                      >
                        {saveOptionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {editingOption ? "Update" : "Add"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {optionsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : foodOptions.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No food options added yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {foodOptions.map((option) => (
                        <TableRow key={option.id}>
                          <TableCell>{option.display_order}</TableCell>
                          <TableCell className="font-medium">{option.name}</TableCell>
                          <TableCell>₹{option.price}</TableCell>
                          <TableCell>
                            <Switch
                              checked={option.is_active}
                              onCheckedChange={(checked) =>
                                toggleOptionMutation.mutate({ id: option.id, is_active: checked })
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="icon" onClick={() => openEditOption(option)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteOptionMutation.mutate(option.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>
    </PageLayout>
  );
}