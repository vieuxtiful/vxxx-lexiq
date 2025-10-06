import React, { useState, useEffect } from 'react';
import { FolderOpen, Plus, Clock, Search, Trash2, MoreVertical } from 'lucide-react';
import { Project } from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FloatingBackground } from './FloatingBackground';
import { useProject } from '@/contexts/ProjectContext';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
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
    refreshProjects
  } = useProject();
  const {
    signOut
  } = useAuth();
  const {
    toast
  } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Force light mode on project selection screen
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    return () => {
      // Restore dark mode preference when leaving this screen
      const savedDarkMode = localStorage.getItem('lexiq-dark-mode');
      if (savedDarkMode === 'true') {
        document.documentElement.classList.add('dark');
      }
    };
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = userProjects.filter(project => project.name.toLowerCase().includes(searchTerm.toLowerCase()) || project.language.toLowerCase().includes(searchTerm.toLowerCase()) || project.domain.toLowerCase().includes(searchTerm.toLowerCase()));
      setFilteredProjects(filtered);
    } else {
      setFilteredProjects(userProjects);
    }
  }, [searchTerm, userProjects]);
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
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  if (loading) {
    return <div className="min-h-screen relative overflow-hidden" style={{
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
  return <div className="min-h-screen relative overflow-hidden" style={{
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProjects.length === 0 ? <div className="col-span-2 text-center py-12">
                <FolderOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">
                  {searchTerm ? 'No projects found matching your search' : 'No projects yet'}
                </p>
              </div> : filteredProjects.map(project => <Card key={project.id} className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] bg-card/95 backdrop-blur-sm border-border/40 group relative" onClick={() => onProjectSelect(project)}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl text-foreground font-light">
                            {project.name}
                          </h3>
                          <Badge 
                            variant="outline" 
                            className={project.project_type === 'bilingual' 
                              ? 'bg-blue-500/10 text-blue-700 border-blue-500/20' 
                              : 'bg-green-500/10 text-green-700 border-green-500/20'
                            }
                          >
                            {project.project_type === 'bilingual' ? 'Bilingual' : 'Monolingual'}
                          </Badge>
                        </div>
                        <div className="flex gap-3 text-sm text-muted-foreground">
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
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-6 h-6 text-primary" />
                        
                        {/* Delete dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0" onClick={e => e.stopPropagation()}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={e => handleDeleteProject(project.id, project.name, e)} disabled={deletingId === project.id} className="text-red-600 focus:text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              {deletingId === project.id ? 'Deleting...' : 'Delete Project'}
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
                </Card>)}
          </div>
        </div>
        
        {/* Return to Home Link - at the very bottom */}
        <div className="text-center pb-8 mt-8">
          <button onClick={() => signOut()} className="text-sm text-foreground/40 hover:text-foreground/60 transition-colors underline">
            Return to Home
          </button>
        </div>
      </div>
    </div>;
};