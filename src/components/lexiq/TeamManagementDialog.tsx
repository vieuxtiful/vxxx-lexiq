import React, { useState, useEffect } from 'react';
import { Users, Mail, Trash2, Shield } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useOrganization, type OrganizationMember, type PendingInvitation, type AppRole } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';

interface TeamManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  organizationName: string;
}

export const TeamManagementDialog: React.FC<TeamManagementDialogProps> = ({
  open,
  onOpenChange,
  organizationId,
  organizationName,
}) => {
  const { user } = useAuth();
  const {
    getOrganizationMembers,
    getPendingInvitations,
    inviteUserToOrganization,
    removeUserFromOrganization,
    updateUserRole,
    cancelInvitation,
  } = useOrganization();

  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<AppRole>('member');
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    if (open && organizationId) {
      loadData();
    }
  }, [open, organizationId]);

  const loadData = async () => {
    const [membersData, invitationsData] = await Promise.all([
      getOrganizationMembers(organizationId),
      getPendingInvitations(organizationId),
    ]);
    setMembers(membersData);
    setInvitations(invitationsData);
  };

  const handleInvite = async () => {
    if (!newEmail.trim()) return;

    setIsInviting(true);
    const success = await inviteUserToOrganization(organizationId, newEmail.trim(), newRole);
    setIsInviting(false);

    if (success) {
      setNewEmail('');
      setNewRole('member');
      loadData();
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (userId === user?.id) {
      alert("You cannot remove yourself from the organization");
      return;
    }

    if (confirm("Are you sure you want to remove this member?")) {
      const success = await removeUserFromOrganization(organizationId, userId);
      if (success) loadData();
    }
  };

  const handleChangeRole = async (userId: string, newRole: AppRole) => {
    const success = await updateUserRole(organizationId, userId, newRole);
    if (success) loadData();
  };

  const handleCancelInvitation = async (invitationId: string) => {
    const success = await cancelInvitation(invitationId);
    if (success) loadData();
  };

  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case 'admin': return 'default';
      case 'member': return 'secondary';
      case 'viewer': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Management - {organizationName}
          </DialogTitle>
          <DialogDescription>
            Manage team members and invitations for your organization.
          </DialogDescription>
        </DialogHeader>

        {/* Invite Section */}
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Invite New Member</h3>
          </div>
          
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="invite-email" className="sr-only">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              />
            </div>
            <Select value={newRole} onValueChange={(value) => setNewRole(value as AppRole)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleInvite} disabled={!newEmail.trim() || isInviting}>
              {isInviting ? 'Inviting...' : 'Invite'}
            </Button>
          </div>
        </div>

        <Separator />

        {/* Members Table */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Team Members ({members.length})</h3>
          </div>

          {members.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.user_id}>
                    <TableCell className="font-medium">
                      {member.name || 'Unknown'}
                      {member.user_id === user?.id && (
                        <Badge variant="outline" className="ml-2">You</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {member.email}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={member.role}
                        onValueChange={(value) => handleChangeRole(member.user_id, value as AppRole)}
                        disabled={member.user_id === user?.id}
                      >
                        <SelectTrigger className="w-[110px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.user_id)}
                        disabled={member.user_id === user?.id}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No members yet
            </p>
          )}
        </div>

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <>
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">Pending Invitations ({invitations.length})</h3>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell>{invitation.email}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(invitation.role)}>
                          {invitation.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(invitation.expires_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelInvitation(invitation.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
