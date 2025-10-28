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
  const { createProject, deletionState, setCurrentProjectWithReset } = useProject();

  // Sync AuthFlow selectedProject into ProjectContext so Main Window has a currentProject
  React.useEffect(() => {
    if (selectedProject) {
      setCurrentProjectWithReset(selectedProject);
    } else {
      setCurrentProjectWithReset(null);
    }
  }, [selectedProject, setCurrentProjectWithReset]);

  // Proactively refresh projects when a project is selected to avoid stale lists
  React.useEffect(() => {
    if (selectedProject) {
      // Fire and forget; ensures userProjects catches up in background
      refetchProjects();
    }
  }, [selectedProject, refetchProjects]);

  const handleProjectSelect = (project: any) => {
    console.log('Project selected:', project.name);
    setSelectedProject(project);
  };

  const handleCreateProject = async (
    name: string, 
    language: string, 
    domain: string, 
    projectType: 'monolingual' | 'bilingual' = 'monolingual',
    sourceLanguage?: string
  ) => {
    console.log('📝 Creating project:', { name, language, domain, projectType, sourceLanguage });
    const newProject = await createProject(name, language, domain, projectType, sourceLanguage);
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

  // User has selected a project - show main interface immediately
  // We render as soon as selectedProject exists to avoid blocking on a stale userProjects list
  if (selectedProject) {
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
