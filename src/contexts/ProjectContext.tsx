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
  requiresProjectSetup: boolean;
  setRequiresProjectSetup: (value: boolean) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { projects, loading: projectsLoading, createProject: createProjectHook, refreshProjects } = useProjects(user?.id);
  const [currentProject, setCurrentProjectState] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [requiresProjectSetup, setRequiresProjectSetup] = useState(false);
  const { toast } = useToast();

  // Load current project from localStorage
  useEffect(() => {
    if (!user) {
      setCurrentProjectState(null);
      setRequiresProjectSetup(false);
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
        setRequiresProjectSetup(false);
        setLoading(false);
        return;
      }
    }

    // If no saved project or projects exist, use first project
    if (projects.length > 0) {
      setCurrentProjectState(projects[0]);
      localStorage.setItem('lexiq-current-project-id', projects[0].id);
      setRequiresProjectSetup(false);
      setLoading(false);
    } else {
      // No projects - show setup wizard instead of auto-creating
      setCurrentProjectState(null);
      setRequiresProjectSetup(true);
      setLoading(false);
    }
  }, [user, projects, projectsLoading]);

  const createProject = async (name: string, language: string, domain: string): Promise<Project | null> => {
    if (!language || !domain) {
      throw new Error('Language and domain are required to create a project');
    }

    const { data } = await createProjectHook(name, language, domain);
    if (data) {
      setCurrentProjectState(data);
      localStorage.setItem('lexiq-current-project-id', data.id);
      setRequiresProjectSetup(false);
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
        requiresProjectSetup,
        setRequiresProjectSetup,
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
