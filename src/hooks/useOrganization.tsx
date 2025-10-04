import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

export interface Organization {
  id: string;
  name: string;
  plan_type?: string;
  created_at?: string;
}

export type AppRole = 'admin' | 'member' | 'viewer';

export interface OrganizationMember {
  user_id: string;
  role: AppRole;
  email?: string;
  name?: string;
}

export interface PendingInvitation {
  id: string;
  email: string;
  role: AppRole;
  created_at: string;
  expires_at: string;
}

export const useOrganization = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadOrganizations();
    }
  }, [user]);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      // Get user's organizations through user_roles
      const { data: userRoles, error } = await supabase
        .from('user_roles')
        .select('organization_id, organizations(*)')
        .eq('user_id', user?.id);

      if (error) throw error;

      const orgs = userRoles?.map(ur => ur.organizations as any).filter(Boolean) || [];
      setOrganizations(orgs);

      // Set current org from localStorage or first org
      const savedOrgId = localStorage.getItem('currentOrganizationId');
      const current = orgs.find(o => o.id === savedOrgId) || orgs[0] || null;
      setCurrentOrg(current);
    } catch (error) {
      console.error('Error loading organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const switchOrganization = (org: Organization) => {
    setCurrentOrg(org);
    localStorage.setItem('currentOrganizationId', org.id);
  };

  const createOrganization = async (name: string): Promise<Organization | null> => {
    try {
      // Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert([{ name }])
        .select()
        .single();

      if (orgError) throw orgError;

      // Auto-assign admin role to creator
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert([{
          user_id: user?.id,
          organization_id: org.id,
          role: 'admin'
        }]);

      if (roleError) throw roleError;

      setOrganizations(prev => [org, ...prev]);
      setCurrentOrg(org);
      localStorage.setItem('currentOrganizationId', org.id);

      toast({
        title: "Organization created",
        description: `${name} has been created successfully.`
      });

      return org;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      return null;
    }
  };

  const getOrganizationMembers = async (orgId: string): Promise<OrganizationMember[]> => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          role,
          profiles:user_id (email, name)
        `)
        .eq('organization_id', orgId);

      if (error) throw error;

      return data?.map(item => ({
        user_id: item.user_id,
        role: item.role,
        email: (item.profiles as any)?.email,
        name: (item.profiles as any)?.name
      })) || [];
    } catch (error) {
      console.error('Error loading members:', error);
      return [];
    }
  };

  const getPendingInvitations = async (orgId: string): Promise<PendingInvitation[]> => {
    try {
      const { data, error } = await supabase
        .from('pending_invitations')
        .select('*')
        .eq('organization_id', orgId)
        .gt('expires_at', new Date().toISOString());

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading invitations:', error);
      return [];
    }
  };

  const inviteUserToOrganization = async (
    orgId: string,
    email: string,
    role: AppRole
  ): Promise<boolean> => {
    try {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingUser) {
        // Add existing user directly
        const { error } = await supabase
          .from('user_roles')
          .insert([{
            user_id: existingUser.id,
            organization_id: orgId,
            role
          }]);

        if (error) throw error;

        toast({
          title: "User added",
          description: `${email} has been added to the organization.`
        });
      } else {
        // Create pending invitation
        const { error } = await supabase
          .from('pending_invitations')
          .insert([{
            email,
            organization_id: orgId,
            role,
            invited_by: user?.id
          }]);

        if (error) throw error;

        toast({
          title: "Invitation sent",
          description: `An invitation has been sent to ${email}.`
        });
      }

      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      return false;
    }
  };

  const removeUserFromOrganization = async (orgId: string, userId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('organization_id', orgId)
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "User removed",
        description: "User has been removed from the organization."
      });

      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      return false;
    }
  };

  const updateUserRole = async (orgId: string, userId: string, newRole: AppRole): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('organization_id', orgId)
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Role updated",
        description: "User role has been updated successfully."
      });

      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      return false;
    }
  };

  const cancelInvitation = async (invitationId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('pending_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;

      toast({
        title: "Invitation cancelled",
        description: "The invitation has been cancelled."
      });

      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    organizations,
    currentOrg,
    loading,
    switchOrganization,
    createOrganization,
    getOrganizationMembers,
    getPendingInvitations,
    inviteUserToOrganization,
    removeUserFromOrganization,
    updateUserRole,
    cancelInvitation,
    refreshOrganizations: loadOrganizations
  };
};
