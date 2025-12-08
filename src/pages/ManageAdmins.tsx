import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2, Edit, Loader2, UserPlus } from 'lucide-react';

type AdminRole = 'super_admin' | 'admin';

interface Admin {
  id: string;
  username: string;
  role: AdminRole;
  is_active: boolean;
  created_at: string;
}

export default function ManageAdmins() {
  const { admin, isSuperAdmin, isLoading: authLoading } = useAdminAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'admin' as AdminRole,
  });

  useEffect(() => {
    if (!authLoading && (!admin || !isSuperAdmin())) {
      navigate('/admin');
    }
  }, [admin, authLoading, isSuperAdmin, navigate]);

  const { data: admins, isLoading } = useQuery({
    queryKey: ['admins'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Admin[];
    },
    enabled: !!admin && isSuperAdmin(),
  });

  const createAdmin = useMutation({
    mutationFn: async (data: { username: string; password: string; role: AdminRole }) => {
      const { error } = await supabase
        .from('admins')
        .insert({
          username: data.username,
          password_hash: data.password,
          role: data.role,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      toast({ title: 'Success', description: 'Admin created successfully' });
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateAdmin = useMutation({
    mutationFn: async (data: { id: string; username: string; password?: string; role: AdminRole }) => {
      const updateData: Record<string, unknown> = {
        username: data.username,
        role: data.role,
      };
      if (data.password) {
        updateData.password_hash = data.password;
      }
      
      const { error } = await supabase
        .from('admins')
        .update(updateData)
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      toast({ title: 'Success', description: 'Admin updated successfully' });
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteAdmin = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('admins').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      toast({ title: 'Success', description: 'Admin deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({ username: '', password: '', role: 'admin' });
    setEditingAdmin(null);
    setIsDialogOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username.trim()) {
      toast({ title: 'Error', description: 'Username is required', variant: 'destructive' });
      return;
    }

    if (!editingAdmin && !formData.password.trim()) {
      toast({ title: 'Error', description: 'Password is required for new admin', variant: 'destructive' });
      return;
    }

    if (editingAdmin) {
      updateAdmin.mutate({
        id: editingAdmin.id,
        username: formData.username,
        password: formData.password || undefined,
        role: formData.role,
      });
    } else {
      createAdmin.mutate(formData);
    }
  };

  const handleEdit = (adminItem: Admin) => {
    setEditingAdmin(adminItem);
    setFormData({
      username: adminItem.username,
      password: '',
      role: adminItem.role,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (adminItem: Admin) => {
    if (adminItem.id === admin?.id) {
      toast({ title: 'Error', description: 'You cannot delete your own account', variant: 'destructive' });
      return;
    }
    if (confirm('Are you sure you want to delete this admin?')) {
      deleteAdmin.mutate(adminItem.id);
    }
  };

  if (authLoading || isLoading) {
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
            <h1 className="text-2xl font-bold">Manage Admins</h1>
            <p className="text-muted-foreground">Add, edit, or remove admin accounts</p>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Admin Accounts</CardTitle>
              <CardDescription>All registered admin users</CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open); }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Admin
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingAdmin ? 'Edit Admin' : 'Add New Admin'}</DialogTitle>
                  <DialogDescription>
                    {editingAdmin ? 'Update admin account details' : 'Create a new admin account'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="Enter username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">
                      Password {editingAdmin && <span className="text-muted-foreground">(leave blank to keep current)</span>}
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={editingAdmin ? 'Enter new password' : 'Enter password'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={formData.role} onValueChange={(value: AdminRole) => setFormData({ ...formData, role: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createAdmin.isPending || updateAdmin.isPending}>
                      {(createAdmin.isPending || updateAdmin.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {editingAdmin ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins?.map((adminItem) => (
                    <TableRow key={adminItem.id}>
                      <TableCell className="font-medium">{adminItem.username}</TableCell>
                      <TableCell>
                        <Badge variant={adminItem.role === 'super_admin' ? 'default' : 'secondary'}>
                          {adminItem.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={adminItem.is_active ? 'default' : 'destructive'} className={adminItem.is_active ? 'bg-green-500/10 text-green-600' : ''}>
                          {adminItem.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(adminItem.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(adminItem)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDelete(adminItem)}
                            disabled={adminItem.id === admin?.id}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
