import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface MaskedInputProps extends Omit<React.ComponentProps<'input'>, 'onChange'> {
  mask: 'phone' | 'whatsapp' | 'email' | 'none';
  value: string;
  onChange: (value: string) => void;
  style?: React.CSSProperties;
}

// Phone mask: (00) 00000-0000
const applyPhoneMask = (value: string): string => {
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  
  if (numbers.length === 0) return '';
  if (numbers.length <= 2) return `(${numbers}`;
  if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
};

// WhatsApp mask: +55 (00) 00000-0000
const applyWhatsAppMask = (value: string): string => {
  // Remove all non-digits
  let numbers = value.replace(/\D/g, '');
  
  // If starts with 55, keep it, otherwise add it
  if (!numbers.startsWith('55')) {
    numbers = '55' + numbers;
  }
  
  // Limit to 13 digits (55 + 11 digits)
  numbers = numbers.slice(0, 13);
  
  if (numbers.length <= 2) return '+55';
  if (numbers.length <= 4) return `+55 (${numbers.slice(2)}`;
  if (numbers.length <= 9) return `+55 (${numbers.slice(2, 4)}) ${numbers.slice(4)}`;
  return `+55 (${numbers.slice(2, 4)}) ${numbers.slice(4, 9)}-${numbers.slice(9)}`;
};

// Get raw value (numbers only) for phone/whatsapp
const getRawValue = (value: string, mask: string): string => {
  if (mask === 'phone' || mask === 'whatsapp') {
    return value.replace(/\D/g, '');
  }
  return value;
};

const MaskedInput: React.FC<MaskedInputProps> = ({
  mask,
  value,
  onChange,
  className,
  placeholder,
  style,
  ...props
}) => {
  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    // Apply mask to initial/external value
    if (mask === 'phone') {
      setDisplayValue(applyPhoneMask(value));
    } else if (mask === 'whatsapp') {
      setDisplayValue(value ? applyWhatsAppMask(value) : '+55 ');
    } else {
      setDisplayValue(value);
    }
  }, [value, mask]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    if (mask === 'phone') {
      const masked = applyPhoneMask(inputValue);
      setDisplayValue(masked);
      onChange(getRawValue(masked, mask));
    } else if (mask === 'whatsapp') {
      // Don't allow removing the +55 prefix
      if (inputValue.length < 4) {
        setDisplayValue('+55 ');
        onChange('55');
        return;
      }
      const masked = applyWhatsAppMask(inputValue);
      setDisplayValue(masked);
      onChange(getRawValue(masked, mask));
    } else {
      setDisplayValue(inputValue);
      onChange(inputValue);
    }
  };

  const handleFocus = () => {
    // Initialize WhatsApp with +55 on focus if empty
    if (mask === 'whatsapp' && !displayValue) {
      setDisplayValue('+55 ');
      onChange('55');
    }
  };

  const getPlaceholder = () => {
    if (placeholder) return placeholder;
    
    switch (mask) {
      case 'phone':
        return '(00) 00000-0000';
      case 'whatsapp':
        return '+55 (00) 00000-0000';
      case 'email':
        return 'seu@email.com';
      default:
        return '';
    }
  };

  const getInputType = () => {
    if (mask === 'email') return 'email';
    if (mask === 'phone' || mask === 'whatsapp') return 'tel';
    return 'text';
  };

  return (
    <Input
      {...props}
      type={getInputType()}
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      placeholder={getPlaceholder()}
      className={cn(className)}
      style={style}
    />
  );
};

export default MaskedInput;
