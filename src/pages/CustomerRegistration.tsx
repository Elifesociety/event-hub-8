import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, UserPlus, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";

interface Panchayath {
  id: string;
  name: string;
}

interface Ward {
  id: string;
  ward_number: string;
  ward_name: string | null;
  panchayath_id: string;
}

export default function CustomerRegistration() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    panchayath_id: "",
    ward_id: "",
    place: "",
  });
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [submittedData, setSubmittedData] = useState<typeof formData | null>(null);

  const { data: panchayaths = [] } = useQuery({
    queryKey: ["panchayaths"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("panchayaths")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data as Panchayath[];
    },
  });

  const { data: wards = [] } = useQuery({
    queryKey: ["wards", formData.panchayath_id],
    queryFn: async () => {
      if (!formData.panchayath_id) return [];
      const { data, error } = await supabase
        .from("wards")
        .select("id, ward_number, ward_name, panchayath_id")
        .eq("panchayath_id", formData.panchayath_id)
        .order("ward_number");
      if (error) throw error;
      return data as Ward[];
    },
    enabled: !!formData.panchayath_id,
  });

  const registerMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("customer_registrations").insert({
        name: data.name.trim(),
        mobile: data.mobile.trim(),
        panchayath_id: data.panchayath_id || null,
        ward_id: data.ward_id || null,
        place: data.place.trim(),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      setSubmittedData(variables);
      setSuccessDialogOpen(true);
      queryClient.invalidateQueries({ queryKey: ["customer-registrations"] });
    },
    onError: (error) => {
      toast.error("Registration failed: " + error.message);
    },
  });

  const handleDialogClose = () => {
    setSuccessDialogOpen(false);
    setSubmittedData(null);
    setFormData({ name: "", mobile: "", panchayath_id: "", ward_id: "", place: "" });
  };

  const getDisplayName = (id: string, list: { id: string; name?: string; ward_number?: string; ward_name?: string | null }[], type: 'panchayath' | 'ward') => {
    const item = list.find(i => i.id === id);
    if (!item) return "Not selected";
    if (type === 'panchayath') return (item as Panchayath).name;
    const ward = item as Ward;
    return `${ward.ward_number} - ${ward.ward_name || "No Name"}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.mobile.trim() || !formData.place.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    registerMutation.mutate(formData);
  };

  const handlePanchayathChange = (value: string) => {
    setFormData({ ...formData, panchayath_id: value, ward_id: "" });
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto">
        <Link to="/">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
              <UserPlus className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Customer Registration</CardTitle>
            <CardDescription>Register for the event</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter your name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile Number *</Label>
                <Input
                  id="mobile"
                  placeholder="Enter mobile number"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="panchayath">Panchayath</Label>
                <Select value={formData.panchayath_id} onValueChange={handlePanchayathChange}>
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
                <Label htmlFor="ward">Ward</Label>
                <Select
                  value={formData.ward_id}
                  onValueChange={(value) => setFormData({ ...formData, ward_id: value })}
                  disabled={!formData.panchayath_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.panchayath_id ? "Select Ward" : "Select Panchayath first"} />
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
                <Label htmlFor="place">Place *</Label>
                <Input
                  id="place"
                  placeholder="Enter your place"
                  value={formData.place}
                  onChange={(e) => setFormData({ ...formData, place: e.target.value })}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                {registerMutation.isPending ? "Registering..." : "Register"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Success Confirmation Dialog */}
        <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-6 w-6" />
                Registration Successful!
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-muted-foreground">Your registration has been confirmed with the following details:</p>
              <Separator />
              {submittedData && (
                <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
                  <div className="flex justify-between">
                    <span className="font-medium">Name:</span>
                    <span>{submittedData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Mobile:</span>
                    <span>{submittedData.mobile}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Panchayath:</span>
                    <span>{submittedData.panchayath_id ? getDisplayName(submittedData.panchayath_id, panchayaths, 'panchayath') : "Not selected"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Ward:</span>
                    <span>{submittedData.ward_id ? getDisplayName(submittedData.ward_id, wards, 'ward') : "Not selected"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Place:</span>
                    <span>{submittedData.place}</span>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={handleDialogClose} className="w-full">
                OK
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
