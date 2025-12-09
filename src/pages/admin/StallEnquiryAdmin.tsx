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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Store, Plus, Pencil, Trash2, FileText, ArrowUp, ArrowDown, Eye, CheckCircle } from 'lucide-react';

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
            <Tabs defaultValue="enquiries">
              <TabsList className="mb-4">
                <TabsTrigger value="enquiries">Enquiries ({enquiries.length})</TabsTrigger>
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

              <TabsContent value="enquiries">
                {/* View Details Dialog */}
                <Dialog open={!!viewingEnquiry} onOpenChange={(open) => !open && setViewingEnquiry(null)}>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Enquiry Details</DialogTitle>
                    </DialogHeader>
                    {viewingEnquiry && (
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
                        {Object.keys(viewingEnquiry.responses).length > 0 && (
                          <div className="border-t pt-4">
                            <Label className="text-muted-foreground text-xs mb-2 block">Additional Responses</Label>
                            <div className="space-y-3">
                              {Object.entries(viewingEnquiry.responses).map(([fieldId, value]) => {
                                const field = fields.find(f => f.id === fieldId);
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

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Panchayath</TableHead>
                      <TableHead>Ward</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enquiriesLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">Loading...</TableCell>
                      </TableRow>
                    ) : enquiries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          No enquiries yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      enquiries.map((enquiry) => (
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
                            <span className={`capitalize px-2 py-1 rounded text-xs ${
                              enquiry.status === 'verified' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {enquiry.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => setViewingEnquiry(enquiry)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {enquiry.status !== 'verified' && (
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => verifyEnquiryMutation.mutate(enquiry.id)}
                                  disabled={verifyEnquiryMutation.isPending}
                                >
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                </Button>
                              )}
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
      </div>
    </PageLayout>
  );
}
