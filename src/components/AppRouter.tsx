import React from 'react';
import { useAuthFlow } from '@/contexts/AuthFlowContext';
import { useProject } from '@/contexts/ProjectContext';
import Auth from '@/pages/Auth';
import { ProjectSetupWizard } from './lexiq/ProjectSetupWizard';
import { ProjectSelectionScreen } from './lexiq/ProjectSelectionScreen';
import { EnhancedMainInterface } from './lexiq/EnhancedMainInterface';
import { Loader2, Trash2 } from 'lucide-react';

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
  const { createProject, deletionState } = useProject();

  const handleProjectSelect = (project: any) => {
    console.log('Project selected:', project.name);
    setSelectedProject(project);
  };

  const handleCreateProject = async (name: string, language: string, domain: string) => {
    console.log('📝 Creating project:', { name, language, domain });
    const newProject = await createProject(name, language, domain);
    if (newProject) {
      await refetchProjects();
      setSelectedProject(newProject);
    }
  };

  // HYBRID: Enhanced deletion loading state - only show for current project deletion
  if (deletionState.isDeleting && selectedProject?.id === deletionState.deletingProjectId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <Trash2 className="h-6 w-6 text-destructive absolute top-3 left-1/2 transform -translate-x-1/2" />
          </div>
          <p className="text-muted-foreground">Deleting project...</p>
          <div className="w-48 h-2 bg-muted rounded-full mt-4 mx-auto overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${deletionState.progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {deletionState.progress < 100 ? 'Cleaning up your data...' : 'Finalizing...'}
          </p>
        </div>
      </div>
    );
  }

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
        deletionState={deletionState}
      />
    );
  }

  // User has selected a project - show main interface
  if (selectedProject && currentState === 'project_selected') {
    // Verify the selected project still exists
    const projectExists = userProjects.some(p => p.id === selectedProject.id);
    
    if (!projectExists) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Updating workspace...</p>
          </div>
        </div>
      );
    }
    
    return <EnhancedMainInterface />;
  }

  // Fallback
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Initializing workspace...</p>
      </div>
    </div>
  );
};
