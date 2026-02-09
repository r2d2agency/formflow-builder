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
export type FormType = 'typeform' | 'chat' | 'standard' | 'link_bio';

export interface OptionWithImage {
  value: string;
  label: string;
  image_url?: string;
  description?: string;
}

export interface FormField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'whatsapp' | 'select' | 'radio' | 'checkbox' | 'textarea' | 'number' | 'date' | 'file' | 'link' | 'image_select';
  label: string;
  placeholder?: string;
  required: boolean;
  validation?: FieldValidation;
  options?: string[]; // For select, radio, checkbox
  options_with_images?: OptionWithImage[]; // For image_select
  order: number;
  // Quiz specific fields
  correct_answer?: string | string[];
  points?: number;
  feedback_correct?: string;
  feedback_incorrect?: string;
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
  // Facebook Pixel
  facebook_pixel?: string;
  facebook_pixel_access_token?: string;
  facebook_pixel_test_code?: string;
  // Google
  google_analytics?: string;
  google_tag_manager?: string;
  // RD Station
  rdstation_enabled?: boolean;
  rdstation_api_token?: string;
  rdstation_conversion_identifier?: string;
  // Webhook
  webhook_url?: string;
  webhook_enabled: boolean;
  whatsapp_notification: boolean;
  whatsapp_lead_notification?: boolean;
  whatsapp_lead_message?: string;
  evolution_instance_id?: string;
  whatsapp_target_number?: string;
  success_message?: string;
  button_text?: string;
  // Colors - more precise control
  primary_color?: string;
  background_color?: string;
  text_color?: string;
  button_text_color?: string;
  input_border_color?: string;
  placeholder_color?: string;
  logo_url?: string;
  whatsapp_message?: WhatsAppMessage;
  // Floating WhatsApp button
  whatsapp_float_enabled?: boolean;
  whatsapp_float_number?: string;
  whatsapp_float_message?: string;
  // Custom code injection for domain verification (Meta, Google, etc.)
  custom_head_code?: string;
  custom_body_code?: string;
  // Download Button
  download_button_text?: string;
  download_button_url?: string;
  // Quiz Settings
  is_quiz_mode?: boolean;
  max_attempts_per_user?: number;
  collect_lead_before_quiz?: boolean;
  lead_fields?: ('name' | 'email' | 'phone' | 'whatsapp')[];
  quiz_success_message?: string; // Message based on score?
  quiz_passing_score?: number; // % or absolute
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
  is_partial?: boolean;
  created_at: string;
  updated_at?: string;
}

// Evolution API Types
export interface EvolutionInstance {
  id: string;
  name: string;
  api_url: string;
  internal_api_url?: string; // URL/IP interno para uso no backend (bypass DNS)
  api_key: string;
  default_number?: string;
  is_active: boolean;
  user_id?: string;
  user_name?: string;
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

// Short Links
export interface ShortLink {
  id: string;
  code: string;
  original_url: string;
  title?: string;
  is_active: boolean;
  created_by?: string;
  created_by_name?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  click_count?: number;
}

export interface LinkClick {
  id: string;
  link_id: string;
  ip_address?: string;
  user_agent?: string;
  referer?: string;
  country?: string;
  city?: string;
  device_type?: string;
  browser?: string;
  os?: string;
  clicked_at: string;
}

export interface LinkStats {
  clicks: LinkClick[];
  device_stats: { device_type: string; count: number }[];
  browser_stats: { browser: string; count: number }[];
  daily_stats: { date: string; count: number }[];
}

export interface ShortLinkWithStats extends ShortLink, LinkStats {}
