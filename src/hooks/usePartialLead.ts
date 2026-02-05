import { useRef, useCallback } from 'react';
import apiService from '@/services/api';

interface PartialLeadState {
  leadId: string | null;
  savedData: Record<string, any>;
}

export const usePartialLead = (slug: string) => {
  const stateRef = useRef<PartialLeadState>({
    leadId: null,
    savedData: {},
  });
  
  const isSavingRef = useRef(false);

  const savePartialData = useCallback(async (fieldLabel: string, fieldValue: any) => {
    // Skip if value is empty or unchanged
    if (!fieldValue || fieldValue === '' || stateRef.current.savedData[fieldLabel] === fieldValue) {
      return;
    }

    // Prevent concurrent saves
    if (isSavingRef.current) {
      return;
    }

    isSavingRef.current = true;

    try {
      const newData = {
        ...stateRef.current.savedData,
        [fieldLabel]: fieldValue,
      };

      const response = await apiService.post<{ lead_id: string }>(`/public/forms/${slug}/partial`, {
        data: newData,
        partial_lead_id: stateRef.current.leadId,
      });

      if (response.success && response.data) {
        stateRef.current.leadId = response.data.lead_id || stateRef.current.leadId;
        stateRef.current.savedData = newData;
        console.log('[PartialLead] Saved:', fieldLabel, '- Lead ID:', stateRef.current.leadId);
      }
    } catch (error) {
      console.error('[PartialLead] Error saving:', error);
    } finally {
      isSavingRef.current = false;
    }
  }, [slug]);

  const getPartialLeadId = useCallback(() => {
    return stateRef.current.leadId;
  }, []);

  return {
    savePartialData,
    getPartialLeadId,
  };
};

