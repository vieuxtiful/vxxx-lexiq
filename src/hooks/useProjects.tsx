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
      console.log('Loading projects for user:', userId);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error loading projects:', error);
        throw error;
      }

      console.log('Projects loaded:', data?.length || 0, 'projects');
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
      console.log('Creating project in DB:', { name, language, domain, user_id: userId });
      
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Check for existing projects with similar names to enable auto-increment
      const { data: existingProjects, error: checkError } = await supabase
        .from('projects')
        .select('name')
        .eq('user_id', userId);

      if (checkError) throw checkError;

      let finalName = name.trim();
      
      if (existingProjects && existingProjects.length > 0) {
        const baseName = name.trim();
        const similarProjects = existingProjects.filter(p => 
          p.name.toLowerCase() === baseName.toLowerCase() ||
          p.name.toLowerCase().startsWith(baseName.toLowerCase() + ' (')
        );

        if (similarProjects.length > 0) {
          // Find the highest number suffix
          const numberPattern = /^(.+?)\s*\((\d+)\)$/;
          let maxNumber = 0;
          
          similarProjects.forEach(p => {
            const match = p.name.match(numberPattern);
            if (match && match[1].trim().toLowerCase() === baseName.toLowerCase()) {
              const num = parseInt(match[2]);
              if (num > maxNumber) maxNumber = num;
            } else if (p.name.toLowerCase() === baseName.toLowerCase()) {
              maxNumber = 0; // Base name exists, start at (1)
            }
          });
          
          finalName = `${baseName} (${maxNumber + 1})`;
          console.log(`Duplicate detected, auto-incrementing: "${name}" → "${finalName}"`);
        }
      }

      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: finalName,
          language,
          domain,
          user_id: userId,
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }

      console.log('Project created in DB:', data);
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
      console.log('Attempting to delete project:', id, 'for user:', userId);
      
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase delete error:', error);
        throw error;
      }

      console.log('Project deleted from DB successfully');
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
