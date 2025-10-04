import { AuditLogger, type AuditAction } from '@/lib/auditLogger';

export const useAuditLog = () => {
  const logAction = async (
    action: AuditAction,
    resourceType: string,
    resourceId?: string,
    details?: Record<string, any>
  ) => {
    await AuditLogger.logAction(action, resourceType, resourceId, details);
  };

  const logAnalysis = async (sessionId: string, textLength: number) => {
    await AuditLogger.logAction(
      'analysis_performed',
      'analysis_session',
      sessionId,
      { text_length: textLength }
    );
  };

  const logFileUpload = async (fileId: string, fileName: string, fileSize: number) => {
    await AuditLogger.logAction(
      'file_uploaded',
      'file_upload',
      fileId,
      { file_name: fileName, file_size: fileSize }
    );
  };

  const logProjectCreated = async (projectId: string, projectName: string) => {
    await AuditLogger.logAction(
      'project_created',
      'project',
      projectId,
      { project_name: projectName }
    );
  };

  const logSessionRestored = async (sessionId: string) => {
    await AuditLogger.logAction(
      'session_restored',
      'analysis_session',
      sessionId
    );
  };

  return {
    logAction,
    logAnalysis,
    logFileUpload,
    logProjectCreated,
    logSessionRestored
  };
};
