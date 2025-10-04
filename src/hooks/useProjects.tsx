import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Project {
  id: string;
  name: string;
  user_id: string;
  organization_id?: string;
  language: string;
  domain: string;
  settings: any;
  created_at: string;
  updated_at: string;
}

export const useProjects = (userId?: string) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (userId) {
      loadProjects();
    } else {
      setLoading(false);
    }
  }, [userId]);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast({
        title: "Failed to load projects",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (name: string, language: string, domain: string) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name,
          language,
          domain,
          user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;

      setProjects(prev => [data, ...prev]);
      
      toast({
        title: "Project created",
        description: `${name} has been created successfully.`,
      });

      return { data, error: null };
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "Failed to create project",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
      return { data: null, error };
    }
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setProjects(prev => prev.map(p => p.id === id ? data : p));
      
      toast({
        title: "Project updated",
        description: "Changes saved successfully.",
      });

      return { data, error: null };
    } catch (error) {
      console.error('Error updating project:', error);
      toast({
        title: "Failed to update project",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
      return { data: null, error };
    }
  };

  const deleteProject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setProjects(prev => prev.filter(p => p.id !== id));
      
      toast({
        title: "Project deleted",
        description: "Project has been removed.",
      });

      return { error: null };
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "Failed to delete project",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
      return { error };
    }
  };

  return {
    projects,
    loading,
    createProject,
    updateProject,
    deleteProject,
    refreshProjects: loadProjects,
  };
};
