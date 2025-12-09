import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Loader2, Shield } from 'lucide-react';

type AppModule = 'billing' | 'team' | 'programs' | 'accounts' | 'food_court' | 'photos' | 'registrations' | 'survey' | 'stall_enquiry';

const MODULES: { value: AppModule; label: string }[] = [
  { value: 'billing', label: 'Billing' },
  { value: 'team', label: 'Team Management' },
  { value: 'programs', label: 'Programs' },
  { value: 'accounts', label: 'Accounts' },
  { value: 'food_court', label: 'Food Court' },
  { value: 'photos', label: 'Photo Gallery' },
  { value: 'registrations', label: 'Registrations' },
  { value: 'survey', label: 'Survey Management' },
  { value: 'stall_enquiry', label: 'Stall Enquiry' },
];

interface Admin {
  id: string;
  username: string;
  role: 'super_admin' | 'admin';
}

interface Permission {
  id?: string;
  admin_id: string;
  module: AppModule;
  can_read: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
}

export default function PermissionManagement() {
  const { admin, isSuperAdmin, isLoading: authLoading } = useAdminAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedAdminId, setSelectedAdminId] = useState<string>('');
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!authLoading && (!admin || !isSuperAdmin())) {
      navigate('/admin');
    }
  }, [admin, authLoading, isSuperAdmin, navigate]);

  const { data: admins, isLoading: adminsLoading } = useQuery({
    queryKey: ['admins-for-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admins')
        .select('id, username, role')
        .eq('role', 'admin')
        .order('username');
      
      if (error) throw error;
      return data as Admin[];
    },
    enabled: !!admin && isSuperAdmin(),
  });

  const { data: existingPermissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ['admin-permissions', selectedAdminId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_permissions')
        .select('*')
        .eq('admin_id', selectedAdminId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedAdminId,
  });

  useEffect(() => {
    if (selectedAdminId) {
      const newPermissions: Permission[] = MODULES.map((module) => {
        const existing = existingPermissions?.find((p) => p.module === module.value);
        return {
          id: existing?.id,
          admin_id: selectedAdminId,
          module: module.value,
          can_read: existing?.can_read || false,
          can_create: existing?.can_create || false,
          can_update: existing?.can_update || false,
          can_delete: existing?.can_delete || false,
        };
      });
      setPermissions(newPermissions);
      setHasChanges(false);
    }
  }, [selectedAdminId, existingPermissions]);

  const savePermissions = useMutation({
    mutationFn: async () => {
      // Delete existing permissions
      await supabase
        .from('admin_permissions')
        .delete()
        .eq('admin_id', selectedAdminId);

      // Insert new permissions
      const toInsert = permissions.filter(
        (p) => p.can_read || p.can_create || p.can_update || p.can_delete
      );

      if (toInsert.length > 0) {
        const { error } = await supabase.from('admin_permissions').insert(
          toInsert.map((p) => ({
            admin_id: p.admin_id,
            module: p.module,
            can_read: p.can_read,
            can_create: p.can_create,
            can_update: p.can_update,
            can_delete: p.can_delete,
          }))
        );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-permissions', selectedAdminId] });
      toast({ title: 'Success', description: 'Permissions saved successfully' });
      setHasChanges(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updatePermission = (module: AppModule, field: keyof Permission, value: boolean) => {
    setPermissions((prev) =>
      prev.map((p) => (p.module === module ? { ...p, [field]: value } : p))
    );
    setHasChanges(true);
  };

  const toggleAll = (module: AppModule, enabled: boolean) => {
    setPermissions((prev) =>
      prev.map((p) =>
        p.module === module
          ? { ...p, can_read: enabled, can_create: enabled, can_update: enabled, can_delete: enabled }
          : p
      )
    );
    setHasChanges(true);
  };

  if (authLoading || adminsLoading) {
    return (
      <PageLayout>
        <div className="container flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="container py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Permission Management</h1>
            <p className="text-muted-foreground">Allocate permissions to admin accounts</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Configure Permissions
            </CardTitle>
            <CardDescription>
              Select an admin and configure their module access permissions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="max-w-sm">
              <Select value={selectedAdminId} onValueChange={setSelectedAdminId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an admin" />
                </SelectTrigger>
                <SelectContent>
                  {admins?.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedAdminId && (
              <>
                {permissionsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Module</TableHead>
                            <TableHead className="text-center">Read</TableHead>
                            <TableHead className="text-center">Create</TableHead>
                            <TableHead className="text-center">Update</TableHead>
                            <TableHead className="text-center">Delete</TableHead>
                            <TableHead className="text-center">All</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {permissions.map((perm) => {
                            const moduleLabel = MODULES.find((m) => m.value === perm.module)?.label;
                            const allEnabled = perm.can_read && perm.can_create && perm.can_update && perm.can_delete;
                            
                            return (
                              <TableRow key={perm.module}>
                                <TableCell className="font-medium">{moduleLabel}</TableCell>
                                <TableCell className="text-center">
                                  <Checkbox
                                    checked={perm.can_read}
                                    onCheckedChange={(checked) => updatePermission(perm.module, 'can_read', !!checked)}
                                  />
                                </TableCell>
                                <TableCell className="text-center">
                                  <Checkbox
                                    checked={perm.can_create}
                                    onCheckedChange={(checked) => updatePermission(perm.module, 'can_create', !!checked)}
                                  />
                                </TableCell>
                                <TableCell className="text-center">
                                  <Checkbox
                                    checked={perm.can_update}
                                    onCheckedChange={(checked) => updatePermission(perm.module, 'can_update', !!checked)}
                                  />
                                </TableCell>
                                <TableCell className="text-center">
                                  <Checkbox
                                    checked={perm.can_delete}
                                    onCheckedChange={(checked) => updatePermission(perm.module, 'can_delete', !!checked)}
                                  />
                                </TableCell>
                                <TableCell className="text-center">
                                  <Checkbox
                                    checked={allEnabled}
                                    onCheckedChange={(checked) => toggleAll(perm.module, !!checked)}
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex justify-end">
                      <Button 
                        onClick={() => savePermissions.mutate()} 
                        disabled={!hasChanges || savePermissions.isPending}
                      >
                        {savePermissions.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        <Save className="h-4 w-4 mr-2" />
                        Save Permissions
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}

            {!selectedAdminId && admins?.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No admin accounts found. Create an admin account first.</p>
                <Button variant="link" onClick={() => navigate('/admin/manage-admins')}>
                  Go to Manage Admins
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
