import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Store, Plus, Pencil, Trash2, FileText, ArrowUp, ArrowDown, Eye, CheckCircle, RotateCcw, Search } from 'lucide-react';

interface EnquiryField {
  id: string;
  field_label: string;
  field_type: string;
  options: string[] | null;
  is_required: boolean;
  display_order: number;
  is_active: boolean;
  show_conditional_on: string | null;
  conditional_value: string | null;
}

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

export default function StallEnquiryAdmin() {
  const { admin, isLoading } = useAdminAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isAddFieldOpen, setIsAddFieldOpen] = useState(false);
  const [editingField, setEditingField] = useState<EnquiryField | null>(null);
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldType, setFieldType] = useState('text');
  const [fieldOptions, setFieldOptions] = useState('');
  const [isRequired, setIsRequired] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [viewingEnquiry, setViewingEnquiry] = useState<Enquiry | null>(null);
  const [selectedPanchayath, setSelectedPanchayath] = useState<string>('all');
  const [mobileSearch, setMobileSearch] = useState('');
  const [deletingEnquiry, setDeletingEnquiry] = useState<Enquiry | null>(null);
  const [deleteVerificationCode, setDeleteVerificationCode] = useState('');

  useEffect(() => {
    if (!isLoading && !admin) {
      navigate('/admin-login');
    }
  }, [admin, isLoading, navigate]);

  // Fetch fields
  const { data: fields = [], isLoading: fieldsLoading } = useQuery({
    queryKey: ['stall-enquiry-fields-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stall_enquiry_fields')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as EnquiryField[];
    }
  });

  // Fetch panchayaths for filter
  const { data: panchayaths = [] } = useQuery({
    queryKey: ['panchayaths-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('panchayaths')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data as { id: string; name: string }[];
    }
  });

  // Fetch enquiries
  const { data: enquiries = [], isLoading: enquiriesLoading } = useQuery({
    queryKey: ['stall-enquiries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stall_enquiries')
        .select(`
          *,
          panchayaths(name),
          wards(ward_number, ward_name)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Enquiry[];
    }
  });

  // Filter enquiries by panchayath, mobile, and status
  const filteredEnquiries = enquiries.filter(e => {
    const matchesPanchayath = selectedPanchayath === 'all' || e.panchayath_id === selectedPanchayath;
    const matchesMobile = mobileSearch === '' || e.mobile.includes(mobileSearch);
    return matchesPanchayath && matchesMobile;
  });

  const pendingEnquiries = filteredEnquiries.filter(e => e.status === 'pending');
  const completedEnquiries = filteredEnquiries.filter(e => e.status === 'verified');

  const addFieldMutation = useMutation({
    mutationFn: async () => {
      const maxOrder = fields.length > 0 ? Math.max(...fields.map(f => f.display_order)) : 0;
      const options = fieldType === 'radio' || fieldType === 'select' 
        ? fieldOptions.split('\n').filter(o => o.trim())
        : null;
      
      const { error } = await supabase
        .from('stall_enquiry_fields')
        .insert({
          field_label: fieldLabel,
          field_type: fieldType,
          options,
          is_required: isRequired,
          is_active: isActive,
          display_order: maxOrder + 1
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stall-enquiry-fields-admin'] });
      resetForm();
      setIsAddFieldOpen(false);
      toast({ title: 'Field added successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const updateFieldMutation = useMutation({
    mutationFn: async () => {
      if (!editingField) return;
      const options = fieldType === 'radio' || fieldType === 'select'
        ? fieldOptions.split('\n').filter(o => o.trim())
        : null;

      const { error } = await supabase
        .from('stall_enquiry_fields')
        .update({
          field_label: fieldLabel,
          field_type: fieldType,
          options,
          is_required: isRequired,
          is_active: isActive
        })
        .eq('id', editingField.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stall-enquiry-fields-admin'] });
      resetForm();
      setEditingField(null);
      toast({ title: 'Field updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const deleteFieldMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('stall_enquiry_fields')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stall-enquiry-fields-admin'] });
      toast({ title: 'Field deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ id, newOrder }: { id: string; newOrder: number }) => {
      const { error } = await supabase
        .from('stall_enquiry_fields')
        .update({ display_order: newOrder })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stall-enquiry-fields-admin'] });
    }
  });

  const resetForm = () => {
    setFieldLabel('');
    setFieldType('text');
    setFieldOptions('');
    setIsRequired(true);
    setIsActive(true);
  };

  const handleEditField = (field: EnquiryField) => {
    setEditingField(field);
    setFieldLabel(field.field_label);
    setFieldType(field.field_type);
    setFieldOptions(field.options ? field.options.join('\n') : '');
    setIsRequired(field.is_required);
    setIsActive(field.is_active);
  };

  const handleMoveUp = (field: EnquiryField, index: number) => {
    if (index === 0) return;
    const prevField = fields[index - 1];
    reorderMutation.mutate({ id: field.id, newOrder: prevField.display_order });
    reorderMutation.mutate({ id: prevField.id, newOrder: field.display_order });
  };

  const handleMoveDown = (field: EnquiryField, index: number) => {
    if (index === fields.length - 1) return;
    const nextField = fields[index + 1];
    reorderMutation.mutate({ id: field.id, newOrder: nextField.display_order });
    reorderMutation.mutate({ id: nextField.id, newOrder: field.display_order });
  };

  const verifyEnquiryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('stall_enquiries')
        .update({ status: 'verified' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stall-enquiries'] });
      toast({ title: 'Enquiry verified successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const restoreEnquiryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('stall_enquiries')
        .update({ status: 'pending' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stall-enquiries'] });
      toast({ title: 'Enquiry restored to pending' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const deleteEnquiryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('stall_enquiries')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stall-enquiries'] });
      setDeletingEnquiry(null);
      setDeleteVerificationCode('');
      toast({ title: 'Enquiry deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const handleDeleteEnquiry = () => {
    if (deleteVerificationCode !== '9497589094') {
      toast({ title: 'Invalid verification code', variant: 'destructive' });
      return;
    }
    if (deletingEnquiry) {
      deleteEnquiryMutation.mutate(deletingEnquiry.id);
    }
  };

  if (isLoading || !admin) {
    return (
      <PageLayout>
        <div className="container flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Stall Enquiry Management
            </CardTitle>
            <CardDescription>Manage stall enquiry form fields and view submissions</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pending-enquiries">
              <TabsList className="mb-4">
                <TabsTrigger value="pending-enquiries">Pending Enquiries ({pendingEnquiries.length})</TabsTrigger>
                <TabsTrigger value="completed-enquiries">Completed Enquiries ({completedEnquiries.length})</TabsTrigger>
                <TabsTrigger value="fields">Form Fields</TabsTrigger>
              </TabsList>

              <TabsContent value="fields">
                <div className="mb-4">
                  <Dialog open={isAddFieldOpen} onOpenChange={setIsAddFieldOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => { resetForm(); setIsAddFieldOpen(true); }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Field
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Field</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <Label>Field Label</Label>
                          <Input
                            value={fieldLabel}
                            onChange={(e) => setFieldLabel(e.target.value)}
                            placeholder="Enter field label"
                          />
                        </div>
                        <div>
                          <Label>Field Type</Label>
                          <Select value={fieldType} onValueChange={setFieldType}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="textarea">Textarea</SelectItem>
                              <SelectItem value="radio">Radio Buttons</SelectItem>
                              <SelectItem value="select">Dropdown</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {(fieldType === 'radio' || fieldType === 'select') && (
                          <div>
                            <Label>Options (one per line)</Label>
                            <Textarea
                              value={fieldOptions}
                              onChange={(e) => setFieldOptions(e.target.value)}
                              placeholder="Option 1&#10;Option 2&#10;Option 3"
                              rows={4}
                            />
                          </div>
                        )}
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Switch checked={isRequired} onCheckedChange={setIsRequired} />
                            <Label>Required</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch checked={isActive} onCheckedChange={setIsActive} />
                            <Label>Active</Label>
                          </div>
                        </div>
                        <Button onClick={() => addFieldMutation.mutate()} disabled={!fieldLabel.trim()}>
                          Add Field
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Edit Field Dialog */}
                <Dialog open={!!editingField} onOpenChange={(open) => !open && setEditingField(null)}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Field</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>Field Label</Label>
                        <Input
                          value={fieldLabel}
                          onChange={(e) => setFieldLabel(e.target.value)}
                          placeholder="Enter field label"
                        />
                      </div>
                      <div>
                        <Label>Field Type</Label>
                        <Select value={fieldType} onValueChange={setFieldType}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="textarea">Textarea</SelectItem>
                            <SelectItem value="radio">Radio Buttons</SelectItem>
                            <SelectItem value="select">Dropdown</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {(fieldType === 'radio' || fieldType === 'select') && (
                        <div>
                          <Label>Options (one per line)</Label>
                          <Textarea
                            value={fieldOptions}
                            onChange={(e) => setFieldOptions(e.target.value)}
                            placeholder="Option 1&#10;Option 2&#10;Option 3"
                            rows={4}
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Switch checked={isRequired} onCheckedChange={setIsRequired} />
                          <Label>Required</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch checked={isActive} onCheckedChange={setIsActive} />
                          <Label>Active</Label>
                        </div>
                      </div>
                      <Button onClick={() => updateFieldMutation.mutate()} disabled={!fieldLabel.trim()}>
                        Update Field
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Required</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fieldsLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                      </TableRow>
                    ) : fields.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No fields added yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      fields.map((field, index) => (
                        <TableRow key={field.id}>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleMoveUp(field, index)}
                                disabled={index === 0}
                              >
                                <ArrowUp className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleMoveDown(field, index)}
                                disabled={index === fields.length - 1}
                              >
                                <ArrowDown className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{field.field_label}</TableCell>
                          <TableCell className="capitalize">{field.field_type}</TableCell>
                          <TableCell>{field.is_required ? 'Yes' : 'No'}</TableCell>
                          <TableCell>{field.is_active ? 'Yes' : 'No'}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEditField(field)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteFieldMutation.mutate(field.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="pending-enquiries">
                {/* Filters */}
                <div className="mb-4 flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">Panchayath:</Label>
                    <Select value={selectedPanchayath} onValueChange={setSelectedPanchayath}>
                      <SelectTrigger className="w-[180px]">
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
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">Mobile:</Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by mobile..."
                        value={mobileSearch}
                        onChange={(e) => setMobileSearch(e.target.value)}
                        className="w-[180px] pl-8"
                      />
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Showing {pendingEnquiries.length} pending enquiries
                  </span>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Panchayath</TableHead>
                      <TableHead>Ward</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enquiriesLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                      </TableRow>
                    ) : pendingEnquiries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          {selectedPanchayath !== 'all' ? 'No pending enquiries for selected panchayath' : 'No pending enquiries'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingEnquiries.map((enquiry) => (
                        <TableRow key={enquiry.id}>
                          <TableCell className="font-medium">{enquiry.name}</TableCell>
                          <TableCell>{enquiry.mobile}</TableCell>
                          <TableCell>{enquiry.panchayaths?.name || '-'}</TableCell>
                          <TableCell>
                            {enquiry.wards 
                              ? `${enquiry.wards.ward_number}${enquiry.wards.ward_name ? ` - ${enquiry.wards.ward_name}` : ''}`
                              : '-'}
                          </TableCell>
                          <TableCell>{new Date(enquiry.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => setViewingEnquiry(enquiry)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => verifyEnquiryMutation.mutate(enquiry.id)}
                                disabled={verifyEnquiryMutation.isPending}
                                title="Verify"
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => setDeletingEnquiry(enquiry)}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="completed-enquiries">
                {/* Filters */}
                <div className="mb-4 flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">Panchayath:</Label>
                    <Select value={selectedPanchayath} onValueChange={setSelectedPanchayath}>
                      <SelectTrigger className="w-[180px]">
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
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">Mobile:</Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by mobile..."
                        value={mobileSearch}
                        onChange={(e) => setMobileSearch(e.target.value)}
                        className="w-[180px] pl-8"
                      />
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Showing {completedEnquiries.length} completed enquiries
                  </span>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Panchayath</TableHead>
                      <TableHead>Ward</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enquiriesLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                      </TableRow>
                    ) : completedEnquiries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          {selectedPanchayath !== 'all' ? 'No completed enquiries for selected panchayath' : 'No completed enquiries'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      completedEnquiries.map((enquiry) => (
                        <TableRow key={enquiry.id}>
                          <TableCell className="font-medium">{enquiry.name}</TableCell>
                          <TableCell>{enquiry.mobile}</TableCell>
                          <TableCell>{enquiry.panchayaths?.name || '-'}</TableCell>
                          <TableCell>
                            {enquiry.wards 
                              ? `${enquiry.wards.ward_number}${enquiry.wards.ward_name ? ` - ${enquiry.wards.ward_name}` : ''}`
                              : '-'}
                          </TableCell>
                          <TableCell>{new Date(enquiry.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => setViewingEnquiry(enquiry)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => restoreEnquiryMutation.mutate(enquiry.id)}
                                disabled={restoreEnquiryMutation.isPending}
                                title="Restore to Pending"
                              >
                                <RotateCcw className="h-4 w-4 text-orange-600" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => setDeletingEnquiry(enquiry)}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* View Details Dialog - moved outside Tabs for proper rendering */}
        <Dialog open={!!viewingEnquiry} onOpenChange={(open) => !open && setViewingEnquiry(null)}>
          <DialogContent className="max-w-lg max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Enquiry Details</DialogTitle>
            </DialogHeader>
            {viewingEnquiry && (
              <ScrollArea className="max-h-[70vh] pr-4">
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-xs">Name</Label>
                      <p className="font-medium">{viewingEnquiry.name}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Mobile</Label>
                      <p className="font-medium">{viewingEnquiry.mobile}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Panchayath</Label>
                      <p className="font-medium">{viewingEnquiry.panchayaths?.name || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Ward</Label>
                      <p className="font-medium">
                        {viewingEnquiry.wards 
                          ? `${viewingEnquiry.wards.ward_number}${viewingEnquiry.wards.ward_name ? ` - ${viewingEnquiry.wards.ward_name}` : ''}`
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Status</Label>
                      <p className="font-medium capitalize">{viewingEnquiry.status}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Date</Label>
                      <p className="font-medium">{new Date(viewingEnquiry.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {viewingEnquiry.responses && Object.keys(viewingEnquiry.responses).length > 0 && (
                    <div className="border-t pt-4">
                      <Label className="text-muted-foreground text-xs mb-3 block">Form Responses</Label>
                      <div className="space-y-0 rounded-lg overflow-hidden border">
                        {Object.entries(viewingEnquiry.responses)
                          .map(([fieldId, value]) => {
                            const field = fields.find(f => f.id === fieldId);
                            const label = field?.field_label || fieldId;
                            const isProductField1 = label === 'കൊണ്ടുവരാൻ ഉദ്ദേശിക്കുന്ന ഉൽപ്പന്നം' || label.includes('കൊണ്ടുവരാൻ');
                            const isProductField2 = label === 'ഉൽപ്പന്നം വിൽക്കുന്നത്' || label.includes('വിൽക്കുന്നത്');
                            const isHighlighted = isProductField1 || isProductField2;
                            const sortOrder = isProductField1 ? 0 : isProductField2 ? 1 : 2;
                            return { fieldId, value, label, isHighlighted, sortOrder };
                          })
                          .sort((a, b) => a.sortOrder - b.sortOrder)
                          .map(({ fieldId, value, label, isHighlighted }, index) => {
                            // Check if value is an array of products
                            const isProductArray = Array.isArray(value) && value.length > 0 && value[0]?.product_name !== undefined;
                            
                            return (
                              <div 
                                key={fieldId} 
                                className={`p-3 ${isHighlighted ? 'bg-green-100 dark:bg-green-900/30 border-l-4 border-green-500' : index % 2 === 0 ? 'bg-muted/50' : 'bg-background'}`}
                              >
                                <p className={`font-semibold text-sm ${isHighlighted ? 'text-green-700 dark:text-green-400' : 'text-primary'}`}>{label}</p>
                                {isProductArray ? (
                                  <div className="mt-2 space-y-2">
                                    {(value as Array<{product_name: string; cost_price: string; selling_price: string; selling_unit: string}>).map((product, pIndex) => (
                                      <div key={pIndex} className="bg-background rounded-md p-2 border text-sm">
                                        <p className="font-medium">{product.product_name}</p>
                                        <div className="grid grid-cols-3 gap-2 mt-1 text-xs text-muted-foreground">
                                          <span>Cost: ₹{product.cost_price}</span>
                                          <span>MRP: ₹{product.selling_price}</span>
                                          <span>{product.selling_unit}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className={`mt-1 whitespace-pre-wrap ${isHighlighted ? 'font-medium text-green-900 dark:text-green-200' : 'text-foreground'}`}>
                                    {typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deletingEnquiry} onOpenChange={(open) => { if (!open) { setDeletingEnquiry(null); setDeleteVerificationCode(''); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-red-600">Delete Enquiry</DialogTitle>
            </DialogHeader>
            {deletingEnquiry && (
              <div className="space-y-4 py-4">
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to delete the enquiry from <strong>{deletingEnquiry.name}</strong> ({deletingEnquiry.mobile})?
                </p>
                <div>
                  <Label>Enter verification code to confirm</Label>
                  <Input
                    type="password"
                    value={deleteVerificationCode}
                    onChange={(e) => setDeleteVerificationCode(e.target.value)}
                    placeholder="Enter verification code"
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="destructive" 
                    onClick={handleDeleteEnquiry}
                    disabled={deleteEnquiryMutation.isPending}
                  >
                    {deleteEnquiryMutation.isPending ? 'Deleting...' : 'Delete'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => { setDeletingEnquiry(null); setDeleteVerificationCode(''); }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
}
