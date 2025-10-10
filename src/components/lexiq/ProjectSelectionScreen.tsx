import React, { useState, useEffect } from 'react';
import { FolderOpen, Plus, Clock, Search, Trash2, MoreVertical, Edit2, GripVertical, Moon, Sun } from 'lucide-react';
import { Project } from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FloatingBackground } from './FloatingBackground';
import { useProject } from '@/contexts/ProjectContext';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuth } from '@/hooks/useAuth';
import { useProjectScreenDarkMode } from '@/hooks/useProjectScreenDarkMode';
import lexiqQLogo from '@/assets/lexiq-q-logo.png';
interface ProjectSelectionScreenProps {
  onProjectSelect: (project: Project) => void;
  onCreateNewProject: () => void;
  userProjects: Project[];
  loading: boolean;
  deletionState?: {
    isDeleting: boolean;
    deletingProjectId: string | null;
    progress: number;
  };
}
export const ProjectSelectionScreen: React.FC<ProjectSelectionScreenProps> = ({
  onProjectSelect,
  onCreateNewProject,
  userProjects,
  loading,
  deletionState
}) => {
  const {
    deleteProject,
    updateProject,
    refreshProjects
  } = useProject();
  const {
    signOut
  } = useAuth();
  const {
    toast
  } = useToast();
  const { isDarkMode, shouldAnimate, toggleDarkMode } = useProjectScreenDarkMode();
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [orderedProjects, setOrderedProjects] = useState<Project[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [renamingProject, setRenamingProject] = useState<Project | null>(null);
  const [newProjectName, setNewProjectName] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load saved order from localStorage
  useEffect(() => {
    const savedOrder = localStorage.getItem('lexiq-project-order');
    if (savedOrder && userProjects.length > 0) {
      try {
        const orderIds = JSON.parse(savedOrder);
        const ordered = orderIds
          .map((id: string) => userProjects.find(p => p.id === id))
          .filter(Boolean) as Project[];
        
        // Add any new projects not in the saved order
        const newProjects = userProjects.filter(p => !orderIds.includes(p.id));
        setOrderedProjects([...ordered, ...newProjects]);
      } catch {
        setOrderedProjects(userProjects);
      }
    } else {
      setOrderedProjects(userProjects);
    }
  }, [userProjects]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = orderedProjects.filter(project => project.name.toLowerCase().includes(searchTerm.toLowerCase()) || project.language.toLowerCase().includes(searchTerm.toLowerCase()) || project.domain.toLowerCase().includes(searchTerm.toLowerCase()));
      setFilteredProjects(filtered);
    } else {
      setFilteredProjects(orderedProjects);
    }
  }, [searchTerm, orderedProjects]);
  const handleDeleteProject = async (projectId: string, projectName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click

    if (!confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)) {
      return;
    }
    setDeletingId(projectId);
    try {
      await deleteProject(projectId);
      // Explicitly refresh the projects list to update the UI
      await refreshProjects();
      toast({
        title: "Project deleted",
        description: `"${projectName}" has been deleted`
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "Could not delete project",
        variant: "destructive"
      });
    } finally {
      setDeletingId(null);
    }
  };
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setOrderedProjects((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        
        // Save the new order to localStorage
        localStorage.setItem('lexiq-project-order', JSON.stringify(newOrder.map(p => p.id)));
        
        return newOrder;
      });
    }
  };

  const handleRenameProject = async () => {
    if (!renamingProject || !newProjectName.trim()) return;

    const oldName = renamingProject.name;
    
    // Close dialog immediately for better UX
    setRenamingProject(null);
    setNewProjectName('');

    try {
      await updateProject(renamingProject.id, { name: newProjectName.trim() });
      // Immediately refresh to show the new name
      await refreshProjects();
      toast({
        title: "Project renamed",
        description: `"${oldName}" renamed to "${newProjectName.trim()}"`
      });
    } catch (error) {
      toast({
        title: "Rename failed",
        description: "Could not rename project",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  if (loading) {
    return <div className={`min-h-screen relative overflow-hidden ${isDarkMode ? 'dark' : ''}`} style={{
      background: 'var(--gradient-welcome)'
    }}>
        <div className="fixed inset-0 z-0 pointer-events-none">
          <FloatingBackground />
        </div>
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your projects...</p>
          </div>
        </div>
      </div>;
  }
  return <div className={`min-h-screen relative overflow-hidden transition-colors ${shouldAnimate ? 'duration-[2000ms]' : 'duration-300'} ${isDarkMode ? 'dark' : ''}`} style={{
    background: 'var(--gradient-welcome)'
  }}>
      <div className="fixed inset-0 z-0 pointer-events-none">
        <FloatingBackground />
      </div>
      
      <div className="relative z-10 container mx-auto px-6 py-8">
        {/* Header with Animated Q Logo */}
        <div className="text-center mb-12 mt-8">
          <div className="flex justify-center mb-6">
            <img src={lexiqQLogo} alt="LexiQ Q Logo" className="h-auto w-auto max-w-[120px] light-sweep-logo" />
          </div>
          <h1 className="text-4xl text-foreground mb-4 font-semibold">
            My Projects
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Select a working project, or start anew!</p>
        </div>

        {/* Search and Actions */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input type="text" placeholder="Search projects..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Button onClick={onCreateNewProject} className="gap-2">
              <Plus className="w-5 h-5" />
              New Project
            </Button>
          </div>

          {/* Projects Grid */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredProjects.map(p => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredProjects.length === 0 ? (
                  <div className="col-span-2 text-center py-12">
                    <FolderOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground text-lg">
                      {searchTerm ? 'No projects found matching your search' : 'No projects yet'}
                    </p>
                  </div>
                ) : (
                  filteredProjects.map(project => (
                    <SortableProjectCard
                      key={project.id}
                      project={project}
                      onSelect={() => onProjectSelect(project)}
                      onRename={(proj) => {
                        setRenamingProject(proj);
                        setNewProjectName(proj.name);
                      }}
                      onDelete={handleDeleteProject}
                      isDeleting={deletingId === project.id}
                    />
                  ))
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>
        
        {/* Dark Mode Toggle and Return to Home - at the very bottom */}
        <div className="text-center pb-8 mt-8 space-y-3">
          <div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleDarkMode}
              className="h-8 text-xs text-muted-foreground hover:text-foreground px-3 gap-2"
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </Button>
          </div>
          <button onClick={() => signOut()} className="text-sm text-foreground/40 hover:text-foreground/60 transition-colors underline">
            Return to Home
          </button>
        </div>
      </div>

      {/* Rename Dialog */}
      <Dialog open={!!renamingProject} onOpenChange={(open) => {
        if (!open) {
          setRenamingProject(null);
          setNewProjectName('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
            <DialogDescription>
              Enter a new name for "{renamingProject?.name}"
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="Project name"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleRenameProject();
              }
            }}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRenamingProject(null);
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
    </div>;
};

interface SortableProjectCardProps {
  project: Project;
  onSelect: () => void;
  onRename: (project: Project) => void;
  onDelete: (id: string, name: string, e: React.MouseEvent) => void;
  isDeleting: boolean;
}

const SortableProjectCard: React.FC<SortableProjectCardProps> = ({
  project,
  onSelect,
  onRename,
  onDelete,
  isDeleting,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Card 
      ref={setNodeRef} 
      style={style}
      className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] bg-card/95 backdrop-blur-sm border-border/40 group relative overflow-hidden" 
      onClick={onSelect}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Radial gradient pressure effect */}
      {isHovering && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle 200px at ${mousePosition.x}px ${mousePosition.y}px, hsl(var(--primary) / 0.15), transparent 70%)`,
          }}
        />
      )}
      
      <CardContent className="p-6 relative z-10">
        <div className="flex items-start gap-3 mb-4">
          {/* Drag Handle */}
          <div 
            className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity pt-1"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-xl text-foreground font-light truncate mb-2">
              {project.name}
            </h3>
            <div className="flex gap-3 text-sm text-muted-foreground flex-wrap">
              {project.project_type === 'bilingual' && project.source_language && (
                <>
                  <span className="font-medium">
                    {project.source_language.toUpperCase()} → {project.language.toUpperCase()}
                  </span>
                  <span>•</span>
                </>
              )}
              {project.project_type === 'monolingual' && (
                <>
                  <span className="font-medium">
                    {project.language.toUpperCase()}
                  </span>
                  <span>•</span>
                </>
              )}
              <span>{project.domain.charAt(0).toUpperCase() + project.domain.slice(1)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge 
              variant="outline" 
              className={project.project_type === 'bilingual' 
                ? 'bg-blue-500/10 text-blue-700 border-blue-500/20' 
                : 'bg-green-500/10 text-green-700 border-green-500/20'
              }
            >
              {project.project_type === 'bilingual' ? 'Bilingual' : 'Monolingual'}
            </Badge>
            <FolderOpen className="w-6 h-6 text-primary" />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0" onClick={e => e.stopPropagation()}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    onRename(project);
                  }}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Rename Project
                </DropdownMenuItem>
                <DropdownMenuItem onClick={e => onDelete(project.id, project.name, e)} disabled={isDeleting} className="text-red-600 focus:text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isDeleting ? 'Deleting...' : 'Delete Project'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>Updated {formatDate(project.updated_at)}</span>
        </div>
      </CardContent>
    </Card>
  );
};