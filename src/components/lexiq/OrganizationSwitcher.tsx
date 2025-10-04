import React, { useState } from 'react';
import { Building, Plus, Users, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useOrganization } from '@/hooks/useOrganization';
import { OrganizationCreateModal } from './OrganizationCreateModal';
import { TeamManagementDialog } from './TeamManagementDialog';

export const OrganizationSwitcher: React.FC = () => {
  const { organizations, currentOrg, switchOrganization, loading } = useOrganization();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);

  if (loading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Building className="h-4 w-4 mr-2" />
        Loading...
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Building className="h-4 w-4" />
            <span className="max-w-[150px] truncate">
              {currentOrg?.name || 'No Organization'}
            </span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[250px]">
          <DropdownMenuLabel>Organizations</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {organizations.length > 0 ? (
            organizations.map((org) => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => switchOrganization(org)}
                className={currentOrg?.id === org.id ? 'bg-accent' : ''}
              >
                <Building className="h-4 w-4 mr-2" />
                {org.name}
              </DropdownMenuItem>
            ))
          ) : (
            <div className="px-2 py-4 text-sm text-muted-foreground text-center">
              No organizations yet
            </div>
          )}

          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Organization
          </DropdownMenuItem>
          
          {currentOrg && (
            <DropdownMenuItem onClick={() => setTeamDialogOpen(true)}>
              <Users className="h-4 w-4 mr-2" />
              Manage Team
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <OrganizationCreateModal 
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />

      {currentOrg && (
        <TeamManagementDialog
          open={teamDialogOpen}
          onOpenChange={setTeamDialogOpen}
          organizationId={currentOrg.id}
          organizationName={currentOrg.name}
        />
      )}
    </>
  );
};
