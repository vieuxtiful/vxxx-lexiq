import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface SmartDefaults {
  lastLanguage?: string;
  lastDomain?: string;
  preferredLanguages?: string[];
  languageDetectionEnabled?: boolean;
}

export function useSmartDefaults() {
  const { user } = useAuth();
  const [defaults, setDefaults] = useState<SmartDefaults>({
    languageDetectionEnabled: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDefaults();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadDefaults = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('id', user?.id)
        .single();

      if (profile?.preferences) {
        setDefaults(profile.preferences as SmartDefaults);
      }
    } catch (error) {
      console.error('Error loading smart defaults:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateDefaults = async (updates: Partial<SmartDefaults>) => {
    if (!user) return;

    try {
      const newDefaults = { ...defaults, ...updates };
      
      const { error } = await supabase
        .from('profiles')
        .update({ preferences: newDefaults })
        .eq('id', user.id);

      if (error) throw error;
      
      setDefaults(newDefaults);
    } catch (error) {
      console.error('Error updating smart defaults:', error);
    }
  };

  const recordLanguageUse = async (language: string) => {
    const preferredLanguages = defaults.preferredLanguages || [];
    const updated = [language, ...preferredLanguages.filter(l => l !== language)].slice(0, 5);
    
    await updateDefaults({
      lastLanguage: language,
      preferredLanguages: updated,
    });
  };

  const recordDomainUse = async (domain: string) => {
    await updateDefaults({
      lastDomain: domain,
    });
  };

  return {
    defaults,
    loading,
    updateDefaults,
    recordLanguageUse,
    recordDomainUse,
  };
}
