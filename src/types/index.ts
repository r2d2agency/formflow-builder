// User & Auth Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
  assigned_forms?: { id: string; name: string; slug: string }[];
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'user';
  form_ids?: string[];
}

export interface UpdateUserPayload {
  email: string;
  name: string;
  role: 'admin' | 'user';
  form_ids?: string[];
}

export interface ChangePasswordPayload {
  current_password?: string;
  new_password: string;
}

// Form Types
export type FormType = 'typeform' | 'chat' | 'standard';

export interface FormField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'whatsapp' | 'select' | 'radio' | 'checkbox' | 'textarea' | 'number' | 'date' | 'file';
  label: string;
  placeholder?: string;
  required: boolean;
  validation?: FieldValidation;
  options?: string[]; // For select, radio, checkbox
  order: number;
}

export interface FieldValidation {
  min?: number;
  max?: number;
  pattern?: string;
  message?: string;
}

// WhatsApp Message Types
export interface WhatsAppMessageItem {
  id: string;
  type: 'text' | 'audio' | 'video' | 'document';
  content: string; // text content or file URL
  filename?: string; // original filename for documents
  mimeType?: string;
}

export interface WhatsAppMessage {
  items: WhatsAppMessageItem[];
  delay_seconds?: number; // delay between messages
}

export interface FormSettings {
  redirect_url?: string;
  facebook_pixel?: string;
  google_analytics?: string;
  google_tag_manager?: string;
  webhook_url?: string;
  webhook_enabled: boolean;
  whatsapp_notification: boolean;
  evolution_instance_id?: string;
  success_message?: string;
  button_text?: string;
  primary_color?: string;
  background_color?: string;
  text_color?: string;
  button_text_color?: string;
  logo_url?: string;
  whatsapp_message?: WhatsAppMessage;
}

export interface Form {
  id: string;
  name: string;
  slug: string;
  description?: string;
  type: FormType;
  fields: FormField[];
  settings: FormSettings;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  submissions_count?: number;
}

// Lead Types
export interface Lead {
  id: string;
  form_id: string;
  form_name?: string;
  data: Record<string, any>;
  source?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// Evolution API Types
export interface EvolutionInstance {
  id: string;
  name: string;
  api_url: string;
  api_key: string;
  default_number?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Webhook Types
export interface WebhookConfig {
  id: string;
  form_id: string;
  url: string;
  method: 'POST' | 'PUT';
  headers?: Record<string, string>;
  is_active: boolean;
  created_at: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Dashboard Stats
export interface DashboardStats {
  total_forms: number;
  active_forms: number;
  total_leads: number;
  leads_today: number;
  leads_this_week: number;
  leads_this_month: number;
}
