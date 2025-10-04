import React, { useState } from 'react';
import { ChevronDown, Plus, FolderOpen, Trash2 } from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';
import { ProjectCreateModal } from './ProjectCreateModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export const ProjectSelector: React.FC = () => {
  const { currentProject, projects, setCurrentProject, createProject, deleteProject, loading } = useProject();
  const { toast } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  const handleProjectCreate = async (name: string, language: string, domain: string) => {
    console.log('ProjectSelector: Creating project:', { name, language, domain });
    const newProject = await createProject(name, language, domain);
    if (newProject) {
      console.log('ProjectSelector: Project created, closing modal');
      setShowCreateModal(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) {
      console.log('ProjectSelector: No project to delete');
      return;
    }

    console.log('ProjectSelector: Deleting project:', projectToDelete);
    
    try {
      await deleteProject(projectToDelete);
      console.log('ProjectSelector: Project deleted successfully');
      setProjectToDelete(null);
    } catch (error) {
      console.error('ProjectSelector: Failed to delete project:', error);
      toast({
        title: "Failed to delete project",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <Skeleton className="h-10 w-48" />;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <FolderOpen className="w-4 h-4" />
            <span className="font-medium max-w-[200px] truncate">
              {currentProject?.name || 'Select Project'}
            </span>
            <ChevronDown className="w-4 h-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 bg-popover z-[100]">
          <DropdownMenuItem
            onClick={() => setShowCreateModal(true)}
            className="gap-2 font-medium cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Project
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <div className="max-h-[300px] overflow-y-auto">
            {projects.length === 0 ? (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                No projects yet
              </div>
            ) : (
              projects.map(project => (
                <div
                  key={project.id}
                  className="flex items-center justify-between group hover:bg-accent rounded-sm transition-colors"
                >
                  <DropdownMenuItem
                    onClick={() => setCurrentProject(project)}
                    className={`flex-1 cursor-pointer ${
                      project.id === currentProject?.id 
                        ? 'bg-accent text-accent-foreground' 
                        : ''
                    }`}
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-sm">{project.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {project.language.toUpperCase()} • {project.domain}
                      </span>
                    </div>
                  </DropdownMenuItem>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 mr-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      setProjectToDelete(project.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProjectCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleProjectCreate}
      />

      <AlertDialog open={!!projectToDelete} onOpenChange={() => setProjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this project? This will permanently delete all associated analysis sessions, files, and data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
