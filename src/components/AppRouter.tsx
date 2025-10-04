import React from 'react';
import { useAuthFlow } from '@/contexts/AuthFlowContext';
import { useProject } from '@/contexts/ProjectContext';
import Auth from '@/pages/Auth';
import { ProjectSetupWizard } from './lexiq/ProjectSetupWizard';
import { ProjectSelectionScreen } from './lexiq/ProjectSelectionScreen';
import { EnhancedMainInterface } from './lexiq/EnhancedMainInterface';
import { Loader2 } from 'lucide-react';

export const AppRouter: React.FC = () => {
  const { 
    currentState, 
    selectedProject, 
    userProjects,
    loading,
    setSelectedProject, 
    moveToProjectCreation,
    refetchProjects 
  } = useAuthFlow();
  const { createProject } = useProject();

  const handleProjectSelect = (project: any) => {
    console.log('Project selected:', project.name);
    setSelectedProject(project);
  };

  const handleCreateProject = async (name: string, language: string, domain: string) => {
    console.log('Creating project:', { name, language, domain });
    const newProject = await createProject(name, language, domain);
    if (newProject) {
      await refetchProjects();
      setSelectedProject(newProject);
    }
  };

  // Show loading state
  if (currentState === 'checking' || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading LexiQ...</p>
        </div>
      </div>
    );
  }

  // No user - show auth screen
  if (currentState === 'no_user') {
    return <Auth />;
  }

  // User has no projects - show project creation wizard
  if (currentState === 'no_projects') {
    return (
      <ProjectSetupWizard
        isOpen={true}
        onComplete={handleCreateProject}
        onSkip={() => {}} // Don't allow skipping - they need at least one project
      />
    );
  }

  // User has projects but none selected - show project selection
  if (currentState === 'has_projects' && !selectedProject) {
    return (
      <ProjectSelectionScreen
        onProjectSelect={handleProjectSelect}
        onCreateNewProject={moveToProjectCreation}
        userProjects={userProjects}
        loading={loading}
      />
    );
  }

  // User has selected a project - show main interface
  if (selectedProject) {
    return <EnhancedMainInterface />;
  }

  // Fallback
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <p className="text-muted-foreground">Something went wrong. Please refresh the page.</p>
      </div>
    </div>
  );
};
