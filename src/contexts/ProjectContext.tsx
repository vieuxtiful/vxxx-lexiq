import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProjects, Project } from '@/hooks/useProjects';
import { useToast } from '@/hooks/use-toast';

interface ProjectContextType {
  currentProject: Project | null;
  projects: Project[];
  setCurrentProject: (project: Project | null) => void;
  setCurrentProjectWithReset: (project: Project | null) => void;
  createProject: (name: string, language: string, domain: string) => Promise<Project | null>;
  deleteProject: (id: string) => Promise<void>;
  clearProjectData: () => void;
  loading: boolean;
  refreshProjects: () => void;
  requiresProjectSetup: boolean;
  setRequiresProjectSetup: (value: boolean) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { projects, loading: projectsLoading, createProject: createProjectHook, deleteProject: deleteProjectHook, refreshProjects } = useProjects(user?.id);
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

    console.log('Creating project:', { name, language, domain, userId: user?.id });
    const { data } = await createProjectHook(name, language, domain);
    if (data) {
      console.log('Project created successfully:', data);
      
      // IMPORTANT: Set the new project as current BEFORE localStorage update
      // This will trigger state reset in EnhancedMainInterface
      setCurrentProjectState(data);
      localStorage.setItem('lexiq-current-project-id', data.id);
      setRequiresProjectSetup(false);
    }
    return data;
  };

  // Enhanced project switching with state reset notification
  const setCurrentProjectWithReset = (project: Project | null) => {
    console.log('Switching to project:', project?.name);
    setCurrentProjectState(project);
    
    // Store project ID for persistence
    if (project) {
      localStorage.setItem('lexiq-current-project-id', project.id);
    } else {
      localStorage.removeItem('lexiq-current-project-id');
    }
  };

  const setCurrentProject = (project: Project | null) => {
    console.log('Setting current project:', project?.name || 'null');
    setCurrentProjectState(project);
    if (project) {
      localStorage.setItem('lexiq-current-project-id', project.id);
    } else {
      localStorage.removeItem('lexiq-current-project-id');
    }
  };

  const clearProjectData = () => {
    console.log('Clearing all project data...');
    
    // Clear all state
    setCurrentProjectState(null);
    
    // Clear localStorage/sessionStorage
    localStorage.removeItem('lexiq-session');
    localStorage.removeItem('lexiq-current-project-id');
    localStorage.removeItem('lexiq-saved-versions');
    sessionStorage.removeItem('editedTerms');
    
    // Clear any other project-specific storage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('lexiq-')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    console.log('Project data cleared successfully');
  };

  const deleteProject = async (id: string): Promise<void> => {
    console.log('Deleting project:', id);
    const result = await deleteProjectHook(id);
    
    if (!result.error) {
      console.log('Project deleted successfully');
      
      // IMPORTANT: Refresh projects list before checking state
      await refreshProjects();
      
      // If we deleted the current project, clear everything
      if (currentProject?.id === id) {
        console.log('Deleted current project, clearing all data');
        clearProjectData();
      }
    } else {
      console.error('Failed to delete project:', result.error);
      throw new Error('Failed to delete project');
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        currentProject,
        projects,
        setCurrentProject,
        setCurrentProjectWithReset,
        createProject,
        deleteProject,
        clearProjectData,
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
