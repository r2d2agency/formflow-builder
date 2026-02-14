import React from 'react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WhatsAppCheckStatusProps {
  isChecking: boolean;
  checkResult: { exists: boolean | null; reason?: string } | null;
  className?: string;
}

const WhatsAppCheckStatus: React.FC<WhatsAppCheckStatusProps> = ({ isChecking, checkResult, className }) => {
  if (isChecking) {
    return (
      <div className={cn("flex items-center gap-1.5 text-xs text-muted-foreground mt-1", className)}>
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Verificando WhatsApp...</span>
      </div>
    );
  }

  if (!checkResult || checkResult.exists === null) {
    return null;
  }

  if (checkResult.exists) {
    return (
      <div className={cn("flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 mt-1", className)}>
        <CheckCircle2 className="h-3 w-3" />
        <span>Número verificado no WhatsApp ✓</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 mt-1", className)}>
      <XCircle className="h-3 w-3" />
      <span>Este número não possui WhatsApp. Informe um número válido.</span>
    </div>
  );
};

export default WhatsAppCheckStatus;
