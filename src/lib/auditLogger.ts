import { supabase } from '@/integrations/supabase/client';

export type AuditAction =
  | 'analysis_performed'
  | 'file_uploaded'
  | 'project_created'
  | 'project_deleted'
  | 'user_invited'
  | 'role_changed'
  | 'glossary_created'
  | 'glossary_updated'
  | 'glossary_deleted'
  | 'session_restored';

export class AuditLogger {
  static async logAction(
    action: AuditAction,
    resourceType: string,
    resourceId?: string,
    details?: Record<string, any>
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.warn('Cannot log audit action: No authenticated user');
        return;
      }

      // Get user's organization if available
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .maybeSingle();

      await supabase.from('audit_logs').insert([{
        user_id: user.id,
        organization_id: profile?.organization_id || null,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        details: details || {},
        user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : null
      }]);
    } catch (error) {
      console.error('Failed to log audit action:', error);
      // Don't throw - audit logging shouldn't break app functionality
    }
  }
}
