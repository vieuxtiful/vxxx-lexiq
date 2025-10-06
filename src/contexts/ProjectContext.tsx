import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProjects, Project } from '@/hooks/useProjects';
import { useToast } from '@/hooks/use-toast';

interface ProjectContextType {
  currentProject: Project | null;
  projects: Project[];
  setCurrentProject: (project: Project | null) => void;
  setCurrentProjectWithReset: (project: Project | null) => void;
  createProject: (name: string, language: string, domain: string, projectType: 'monolingual' | 'bilingual', sourceLanguage?: string) => Promise<Project | null>;
  deleteProject: (id: string) => Promise<void>;
  clearProjectData: () => void;
  loading: boolean;
  refreshProjects: () => void;
  requiresProjectSetup: boolean;
  setRequiresProjectSetup: (value: boolean) => void;
  // HYBRID: More granular deletion state
  deletionState: {
    isDeleting: boolean;
    deletingProjectId: string | null;
    progress: number;
    optimisticProjects: Project[];
  };
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { projects, loading: projectsLoading, createProject: createProjectHook, deleteProject: deleteProjectHook, refreshProjects } = useProjects(user?.id);
  const [currentProject, setCurrentProjectState] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [requiresProjectSetup, setRequiresProjectSetup] = useState(false);
  
  // HYBRID: Enhanced deletion state with optimistic updates
  const [deletionState, setDeletionState] = useState({
    isDeleting: false,
    deletingProjectId: null as string | null,
    progress: 0,
    optimisticProjects: [] as Project[],
  });
  
  const { toast } = useToast();

  // Load current project from localStorage WITH VALIDATION
  useEffect(() => {
    if (!user) {
      setCurrentProjectState(null);
      setRequiresProjectSetup(false);
      setLoading(false);
      return;
    }

    if (projectsLoading) return;

    // Try to restore last used project WITH VALIDATION
    const savedProjectId = localStorage.getItem('lexiq-current-project-id');
    if (savedProjectId && projects.length > 0) {
      const savedProject = projects.find(p => p.id === savedProjectId);
      if (savedProject) {
        console.log('✅ Restoring validated project from localStorage:', savedProject.name);
        setCurrentProjectState(savedProject);
        setRequiresProjectSetup(false);
        setLoading(false);
        return;
      } else {
        // Project was deleted or doesn't exist - clear invalid reference
        console.log('🚨 Invalid project ID in localStorage, clearing:', savedProjectId);
        localStorage.removeItem('lexiq-current-project-id');
        // Clear all project-specific sessions for invalid project
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(`lexiq-session-${savedProjectId}`)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      }
    }

    // If no saved project or projects exist, use first project
    if (projects.length > 0) {
      const firstProject = projects[0];
      console.log('📁 Using first project:', firstProject.name);
      setCurrentProjectState(firstProject);
      localStorage.setItem('lexiq-current-project-id', firstProject.id);
      setRequiresProjectSetup(false);
      setLoading(false);
    } else {
      // No projects - show setup wizard
      console.log('📝 No projects found, showing setup wizard');
      setCurrentProjectState(null);
      setRequiresProjectSetup(true);
      setLoading(false);
    }
  }, [user, projects, projectsLoading]);

  const createProject = async (
    name: string, 
    language: string, 
    domain: string, 
    projectType: 'monolingual' | 'bilingual' = 'monolingual',
    sourceLanguage?: string
  ): Promise<Project | null> => {
    if (!language || !domain) {
      throw new Error('Language and domain are required to create a project');
    }

    console.log('Creating project:', { name, language, domain, projectType, sourceLanguage, userId: user?.id });
    const { data } = await createProjectHook(name, language, domain, projectType, sourceLanguage);
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
    console.log('🧹 Clearing all project data...');
    
    // Clear current state
    setCurrentProjectState(null);
    
    // Clear localStorage - be more specific about what we clear
    localStorage.removeItem('lexiq-current-project-id');
    
    // Only clear session storage, not all lexiq- keys
    sessionStorage.removeItem('editedTerms');
    
    console.log('✅ Project data cleared successfully');
  };

  // HYBRID: Simulate deletion progress for better UX
  const simulateProgress = () => {
    setDeletionState(prev => ({ ...prev, progress: 0 }));
    
    const interval = setInterval(() => {
      setDeletionState(prev => {
        if (prev.progress >= 90) {
          clearInterval(interval);
          return { ...prev, progress: 90 };
        }
        return { ...prev, progress: prev.progress + 10 };
      });
    }, 200);
    
    return interval;
  };

  // ENHANCED: Optimistic deletion with progress tracking
  const deleteProject = async (id: string): Promise<void> => {
    console.log('🗑️ Starting optimistic project deletion:', id);
    
    const projectToDelete = projects.find(p => p.id === id);
    if (!projectToDelete) {
      toast({
        title: "Project not found",
        description: "The project you're trying to delete doesn't exist.",
        variant: "destructive",
      });
      return;
    }

    const isDeletingCurrentProject = currentProject?.id === id;
    
    // 1. Immediate optimistic state update
    setDeletionState({
      isDeleting: true,
      deletingProjectId: id,
      progress: 0,
      optimisticProjects: projects.filter(p => p.id !== id),
    });

    // 2. Clear current project if it's being deleted
    if (isDeletingCurrentProject) {
      console.log('🧹 Immediately clearing current project state');
      setCurrentProjectState(null);
      localStorage.removeItem('lexiq-current-project-id');
      localStorage.removeItem('lastProjectId');
      sessionStorage.removeItem('editedTerms');
    }

    // 3. Set up progress simulation
    const progressInterval = simulateProgress();

    try {
      // 4. Perform actual deletion
      console.log('🔄 Executing project deletion...');
      const result = await deleteProjectHook(id);
      
      if (result.error) {
        console.error('❌ Failed to delete project:', result.error);
        throw new Error(result.error);
      }

      console.log('✅ Project deleted successfully');
      
      // 5. Complete progress
      setDeletionState(prev => ({ ...prev, progress: 100 }));
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 6. Refresh projects list
      console.log('🔄 Refreshing projects list...');
      await refreshProjects();
      
      toast({
        title: "Project deleted",
        description: `${projectToDelete.name} has been permanently removed`,
      });
      
    } catch (error) {
      console.error('❌ Error during project deletion:', error);
      
      // HYBRID: Rollback optimistic update on failure
      setDeletionState({
        isDeleting: false,
        deletingProjectId: null,
        progress: 0,
        optimisticProjects: projects,
      });
      
      // Restore current project if deletion failed
      if (isDeletingCurrentProject && currentProject) {
        setCurrentProjectState(currentProject);
        localStorage.setItem('lexiq-current-project-id', currentProject.id);
      }
      
      toast({
        title: "Failed to delete project",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
      
      throw error;
    } finally {
      clearInterval(progressInterval);
      setDeletionState(prev => ({ 
        ...prev, 
        isDeleting: false, 
        deletingProjectId: null,
        progress: 0 
      }));
    }
  };

  // HYBRID: Get current projects (optimistic during deletion)
  const currentProjects = deletionState.isDeleting 
    ? deletionState.optimisticProjects 
    : projects;

  return (
    <ProjectContext.Provider
      value={{
        currentProject,
        projects: currentProjects,
        setCurrentProject,
        setCurrentProjectWithReset,
        createProject,
        deleteProject,
        clearProjectData,
        loading,
        refreshProjects,
        requiresProjectSetup,
        setRequiresProjectSetup,
        deletionState,
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
