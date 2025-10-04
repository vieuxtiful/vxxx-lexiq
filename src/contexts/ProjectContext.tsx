import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProjects, Project } from '@/hooks/useProjects';
import { useToast } from '@/hooks/use-toast';

interface ProjectContextType {
  currentProject: Project | null;
  projects: Project[];
  setCurrentProject: (project: Project | null) => void;
  createProject: (name: string, language: string, domain: string) => Promise<Project | null>;
  loading: boolean;
  refreshProjects: () => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { projects, loading: projectsLoading, createProject: createProjectHook, refreshProjects } = useProjects(user?.id);
  const [currentProject, setCurrentProjectState] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load current project from localStorage or auto-create
  useEffect(() => {
    if (!user) {
      setCurrentProjectState(null);
      setLoading(false);
      return;
    }

    if (projectsLoading) return;

    // Try to restore last used project
    const savedProjectId = localStorage.getItem('lexiq-current-project-id');
    if (savedProjectId && projects.length > 0) {
      const savedProject = projects.find(p => p.id === savedProjectId);
      if (savedProject) {
        setCurrentProjectState(savedProject);
        setLoading(false);
        return;
      }
    }

    // If no saved project or projects exist, use first project
    if (projects.length > 0) {
      setCurrentProjectState(projects[0]);
      localStorage.setItem('lexiq-current-project-id', projects[0].id);
      setLoading(false);
    } else {
      // Auto-create default project for new users
      createDefaultProject();
    }
  }, [user, projects, projectsLoading]);

  const createDefaultProject = async () => {
    try {
      const { data } = await createProjectHook('My First Project', 'en', 'general');
      if (data) {
        setCurrentProjectState(data);
        localStorage.setItem('lexiq-current-project-id', data.id);
        toast({
          title: "Welcome! 🎉",
          description: "Your first project has been created.",
        });
      }
    } catch (error) {
      console.error('Failed to create default project:', error);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (name: string, language: string, domain: string): Promise<Project | null> => {
    const { data } = await createProjectHook(name, language, domain);
    if (data) {
      setCurrentProjectState(data);
      localStorage.setItem('lexiq-current-project-id', data.id);
    }
    return data;
  };

  const setCurrentProject = (project: Project | null) => {
    setCurrentProjectState(project);
    if (project) {
      localStorage.setItem('lexiq-current-project-id', project.id);
    } else {
      localStorage.removeItem('lexiq-current-project-id');
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        currentProject,
        projects,
        setCurrentProject,
        createProject,
        loading,
        refreshProjects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
