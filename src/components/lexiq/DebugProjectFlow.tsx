import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProject } from '@/contexts/ProjectContext';

export const DebugProjectFlow: React.FC = () => {
  const { user } = useAuth();
  const { currentProject, projects, requiresProjectSetup, loading } = useProject();

  return (
    <div className="fixed bottom-4 right-4 bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 dark:border-yellow-600 rounded-lg p-4 max-w-sm text-sm z-50 shadow-lg">
      <h4 className="font-semibold mb-2 text-yellow-900 dark:text-yellow-100">
        Project Flow Debug
      </h4>
      <div className="space-y-1 text-yellow-800 dark:text-yellow-200">
        <div>User: {user ? 'Logged in' : 'Logged out'}</div>
        <div>Loading: {loading ? 'Yes' : 'No'}</div>
        <div>Requires Setup: {requiresProjectSetup ? 'Yes' : 'No'}</div>
        <div>Current Project: {currentProject?.name || 'None'}</div>
        <div>Total Projects: {projects.length}</div>
      </div>
    </div>
  );
};
