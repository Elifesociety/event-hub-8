import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Shield, Users, Settings, LogOut, UserPlus, Key } from 'lucide-react';

export default function AdminPanel() {
  const { admin, logout, isSuperAdmin, isLoading } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !admin) {
      navigate('/admin-login');
    }
  }, [admin, isLoading, navigate]);

  if (isLoading) {
    return (
      <PageLayout>
        <div className="container flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </PageLayout>
    );
  }

  if (!admin) return null;

  const handleLogout = () => {
    logout();
    navigate('/admin-login');
  };

  return (
    <PageLayout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Admin Panel</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-muted-foreground">Welcome, {admin.username}</span>
                <Badge variant={admin.role === 'super_admin' ? 'default' : 'secondary'}>
                  {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                </Badge>
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isSuperAdmin() && (
            <>
              <Link to="/admin/manage-admins">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-2">
                      <UserPlus className="h-5 w-5 text-blue-500" />
                    </div>
                    <CardTitle className="text-lg">Manage Admins</CardTitle>
                    <CardDescription>Add, edit, or remove admin accounts</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Create new admin accounts and manage existing ones
                    </p>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/admin/permissions">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-2">
                      <Key className="h-5 w-5 text-green-500" />
                    </div>
                    <CardTitle className="text-lg">Permission Management</CardTitle>
                    <CardDescription>Allocate permissions to admins</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Control which modules and actions each admin can access
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </>
          )}

          <Link to="/admin/users">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-2">
                  <Users className="h-5 w-5 text-purple-500" />
                </div>
                <CardTitle className="text-lg">View All Admins</CardTitle>
                <CardDescription>See all admin accounts</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  View the list of all admin users and their roles
                </p>
              </CardContent>
            </Card>
          </Link>

          <Card className="h-full">
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center mb-2">
                <Settings className="h-5 w-5 text-orange-500" />
              </div>
              <CardTitle className="text-lg">Your Permissions</CardTitle>
              <CardDescription>View your access rights</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {isSuperAdmin() 
                  ? 'As Super Admin, you have full access to all modules'
                  : 'Check your assigned permissions for each module'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
