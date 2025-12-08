import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

type AdminRole = 'super_admin' | 'admin';
type AppModule = 'billing' | 'team' | 'programs' | 'accounts' | 'food_court' | 'photos' | 'registrations';

interface Admin {
  id: string;
  username: string;
  role: AdminRole;
  is_active: boolean;
}

interface Permission {
  module: AppModule;
  can_read: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
}

interface AdminAuthContextType {
  admin: Admin | null;
  permissions: Permission[];
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasPermission: (module: AppModule, action: 'read' | 'create' | 'update' | 'delete') => boolean;
  isSuperAdmin: () => boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedAdmin = localStorage.getItem('admin');
    if (storedAdmin) {
      const parsedAdmin = JSON.parse(storedAdmin);
      setAdmin(parsedAdmin);
      fetchPermissions(parsedAdmin.id);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchPermissions = async (adminId: string) => {
    try {
      const { data, error } = await supabase
        .from('admin_permissions')
        .select('*')
        .eq('admin_id', adminId);

      if (error) throw error;
      
      setPermissions(data?.map(p => ({
        module: p.module as AppModule,
        can_read: p.can_read || false,
        can_create: p.can_create || false,
        can_update: p.can_update || false,
        can_delete: p.can_delete || false,
      })) || []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('username', username)
        .eq('password_hash', password)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        return { success: false, error: 'Invalid username or password' };
      }

      const adminData: Admin = {
        id: data.id,
        username: data.username,
        role: data.role as AdminRole,
        is_active: data.is_active || false,
      };

      setAdmin(adminData);
      localStorage.setItem('admin', JSON.stringify(adminData));
      await fetchPermissions(data.id);
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'An error occurred during login' };
    }
  };

  const logout = () => {
    setAdmin(null);
    setPermissions([]);
    localStorage.removeItem('admin');
  };

  const hasPermission = (module: AppModule, action: 'read' | 'create' | 'update' | 'delete'): boolean => {
    if (!admin) return false;
    if (admin.role === 'super_admin') return true;

    const permission = permissions.find(p => p.module === module);
    if (!permission) return false;

    switch (action) {
      case 'read': return permission.can_read;
      case 'create': return permission.can_create;
      case 'update': return permission.can_update;
      case 'delete': return permission.can_delete;
      default: return false;
    }
  };

  const isSuperAdmin = () => admin?.role === 'super_admin';

  return (
    <AdminAuthContext.Provider value={{ admin, permissions, isLoading, login, logout, hasPermission, isSuperAdmin }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
