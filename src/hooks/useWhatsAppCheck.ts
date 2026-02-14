import { useState, useCallback, useRef } from 'react';
import apiService from '@/services/api';
import { API_CONFIG } from '@/config/api';

interface WhatsAppCheckResult {
  exists: boolean | null;
  reason?: string;
  jid?: string;
}

export const useWhatsAppCheck = (formSlug: string) => {
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<WhatsAppCheckResult | null>(null);
  const lastCheckedRef = useRef<string>('');

  const checkWhatsApp = useCallback(async (phone: string): Promise<WhatsAppCheckResult | null> => {
    const digits = phone.replace(/\D/g, '');
    
    // Only check if we have a valid-looking number (13 digits for Brazil mobile)
    if (digits.length < 12 || !digits.startsWith('55')) {
      setCheckResult(null);
      return null;
    }

    // DDD cannot start with 0
    const ddd = digits.substring(2, 4);
    if (ddd.startsWith('0')) {
      setCheckResult(null);
      return null;
    }

    // Don't re-check the same number
    if (digits === lastCheckedRef.current) {
      return checkResult;
    }

    lastCheckedRef.current = digits;
    setIsChecking(true);
    setCheckResult(null);

    try {
      const response = await apiService.post<WhatsAppCheckResult>(
        API_CONFIG.ENDPOINTS.CHECK_WHATSAPP,
        { phone: digits, form_slug: formSlug }
      );

      const result = response.data || null;
      setCheckResult(result);
      return result;
    } catch (error) {
      console.error('WhatsApp check error:', error);
      setCheckResult(null);
      return null;
    } finally {
      setIsChecking(false);
    }
  }, [formSlug, checkResult]);

  const resetCheck = useCallback(() => {
    setCheckResult(null);
    lastCheckedRef.current = '';
  }, []);

  return { checkWhatsApp, isChecking, checkResult, resetCheck };
};
