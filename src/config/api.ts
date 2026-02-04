// API Configuration
// Configure your Easypanel backend URL here
// Set VITE_API_URL in Lovable: Settings → Environment Variables
// Example: https://formbuilder-api.easypanel.host/api
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'https://teste-formflow-backend.exf0ty.easypanel.host/api',
  
  // Endpoints
  ENDPOINTS: {
    // Auth
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
    
    // Forms
    FORMS: '/forms',
    FORM_BY_ID: (id: string) => `/forms/${id}`,
    FORM_BY_SLUG: (slug: string) => `/forms/slug/${slug}`,
    
    // Leads
    LEADS: '/leads',
    LEADS_BY_FORM: (formId: string) => `/leads/form/${formId}`,
    LEAD_BY_ID: (id: string) => `/leads/${id}`,
    
    // Evolution Instances
    EVOLUTION_INSTANCES: '/evolution-instances',
    EVOLUTION_INSTANCE_BY_ID: (id: string) => `/evolution-instances/${id}`,
    
    // Webhooks
    WEBHOOKS: '/webhooks',
    WEBHOOK_BY_ID: (id: string) => `/webhooks/${id}`,
    
    // Dashboard
    DASHBOARD_STATS: '/dashboard/stats',
    
    // Public form submission
    SUBMIT_FORM: (slug: string) => `/public/forms/${slug}/submit`,
  },
};

export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};
