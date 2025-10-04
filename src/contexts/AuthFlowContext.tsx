import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProjects, Project } from '@/hooks/useProjects';

type AuthFlowState = 'checking' | 'no_user' | 'no_projects' | 'has_projects' | 'project_selected';

interface AuthFlowContextType {
  currentState: AuthFlowState;
  selectedProject: Project | null;
  userProjects: Project[];
  loading: boolean;
  setSelectedProject: (project: Project | null) => void;
  moveToProjectSelection: () => void;
  moveToProjectCreation: () => void;
  refetchProjects: () => void;
}

const AuthFlowContext = createContext<AuthFlowContextType | undefined>(undefined);

export const AuthFlowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const { projects: userProjects, loading: projectsLoading, refreshProjects } = useProjects(user?.id);
  const [currentState, setCurrentState] = useState<AuthFlowState>('checking');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Check for last used project in localStorage
  useEffect(() => {
    if (user && userProjects.length > 0 && !selectedProject) {
      const lastProjectId = localStorage.getItem('lastProjectId');
      if (lastProjectId) {
        const lastProject = userProjects.find(p => p.id === lastProjectId);
        if (lastProject) {
          console.log('Auto-loading last used project:', lastProject.name);
          setSelectedProject(lastProject);
          setCurrentState('project_selected');
          return;
        }
      }
    }
  }, [user, userProjects, selectedProject]);

  // Main state management
  useEffect(() => {
    if (authLoading || projectsLoading) {
      setCurrentState('checking');
      return;
    }

    if (!user) {
      setCurrentState('no_user');
      return;
    }

    // If we already have a selected project, stay in that state
    if (selectedProject) {
      setCurrentState('project_selected');
      return;
    }

    if (userProjects.length === 0) {
      setCurrentState('no_projects');
    } else {
      setCurrentState('has_projects');
    }
  }, [user, authLoading, projectsLoading, userProjects.length, selectedProject]);

  const moveToProjectSelection = () => {
    setCurrentState('has_projects');
    setSelectedProject(null);
    localStorage.removeItem('lastProjectId');
  };

  const moveToProjectCreation = () => {
    setCurrentState('no_projects');
    setSelectedProject(null);
  };

  const handleSetSelectedProject = (project: Project | null) => {
    setSelectedProject(project);
    if (project) {
      localStorage.setItem('lastProjectId', project.id);
      setCurrentState('project_selected');
    } else {
      localStorage.removeItem('lastProjectId');
    }
  };

  return (
    <AuthFlowContext.Provider
      value={{
        currentState,
        selectedProject,
        userProjects,
        loading: authLoading || projectsLoading,
        setSelectedProject: handleSetSelectedProject,
        moveToProjectSelection,
        moveToProjectCreation,
        refetchProjects: refreshProjects
      }}
    >
      {children}
    </AuthFlowContext.Provider>
  );
};

export const useAuthFlow = () => {
  const context = useContext(AuthFlowContext);
  if (context === undefined) {
    throw new Error('useAuthFlow must be used within an AuthFlowProvider');
  }
  return context;
};
