import React, { useState } from 'react';
import { ChevronDown, Plus, FolderOpen, Trash2, Pencil } from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';
import { ProjectSetupWizard } from './ProjectSetupWizard';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export const ProjectSelector: React.FC = () => {
  const { currentProject, projects, setCurrentProject, createProject, updateProject, deleteProject, loading } = useProject();
  const { toast } = useToast();
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [projectToRename, setProjectToRename] = useState<{ id: string; name: string } | null>(null);
  const [newProjectName, setNewProjectName] = useState('');

  const handleProjectComplete = async (
    name: string, 
    language: string, 
    domain: string, 
    projectType: 'monolingual' | 'bilingual',
    sourceLanguage?: string
  ) => {
    console.log('ProjectSelector: Creating project:', { name, language, domain, projectType, sourceLanguage });
    const newProject = await createProject(name, language, domain, projectType, sourceLanguage);
    if (newProject) {
      console.log('ProjectSelector: Project created, closing wizard');
      setShowCreateWizard(false);
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

  const handleRenameProject = async () => {
    if (!projectToRename || !newProjectName.trim()) {
      console.log('ProjectSelector: No project to rename or empty name');
      return;
    }

    const trimmedName = newProjectName.trim();
    
    // Check if name is the same
    if (trimmedName === projectToRename.name) {
      setProjectToRename(null);
      setNewProjectName('');
      return;
    }

    // Check if name already exists
    const nameExists = projects.some(
      p => p.id !== projectToRename.id && p.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (nameExists) {
      toast({
        title: "Name already exists",
        description: "A project with this name already exists. Please choose a different name.",
        variant: "destructive",
      });
      return;
    }

    console.log('ProjectSelector: Renaming project:', projectToRename.id, 'to:', trimmedName);
    
    try {
      await updateProject(projectToRename.id, { name: trimmedName });
      console.log('ProjectSelector: Project renamed successfully');
      setProjectToRename(null);
      setNewProjectName('');
    } catch (error) {
      console.error('ProjectSelector: Failed to rename project:', error);
      toast({
        title: "Failed to rename project",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    }
  };

  const openRenameDialog = (project: { id: string; name: string }) => {
    setProjectToRename(project);
    setNewProjectName(project.name);
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
            onClick={() => setShowCreateWizard(true)}
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
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{project.name}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                          {project.project_type === 'bilingual' ? 'Bilingual' : 'Monolingual'}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {project.language.toUpperCase()} • {project.domain.charAt(0).toUpperCase() + project.domain.slice(1)}
                      </span>
                    </div>
                  </DropdownMenuItem>
                  
                  <div className="flex items-center gap-1 mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        openRenameDialog({ id: project.id, name: project.name });
                      }}
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        setProjectToDelete(project.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProjectSetupWizard
        isOpen={showCreateWizard}
        onComplete={handleProjectComplete}
        onSkip={() => setShowCreateWizard(false)}
      />

      <Dialog open={!!projectToRename} onOpenChange={() => {
        setProjectToRename(null);
        setNewProjectName('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
            <DialogDescription>
              Enter a new name for your project.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRenameProject();
                  }
                }}
                placeholder="Enter project name"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setProjectToRename(null);
                setNewProjectName('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRenameProject}
              disabled={!newProjectName.trim()}
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
