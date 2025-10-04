import React, { useState } from 'react';
import { ChevronDown, Plus, FolderOpen } from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';
import { ProjectCreateModal } from './ProjectCreateModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export const ProjectSelector: React.FC = () => {
  const { currentProject, projects, setCurrentProject, createProject, loading } = useProject();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleProjectCreate = async (name: string, language: string, domain: string) => {
    const newProject = await createProject(name, language, domain);
    if (newProject) {
      setShowCreateModal(false);
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
                <DropdownMenuItem
                  key={project.id}
                  onClick={() => setCurrentProject(project)}
                  className={`cursor-pointer ${
                    project.id === currentProject?.id 
                      ? 'bg-accent text-accent-foreground' 
                      : ''
                  }`}
                >
                  <div className="flex flex-col gap-1 w-full">
                    <span className="font-medium">{project.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {project.language.toUpperCase()} • {project.domain}
                    </span>
                  </div>
                </DropdownMenuItem>
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
    </>
  );
};
