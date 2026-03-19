// src/lib/types.ts

export interface EventSettings {
  currency: string;
  gst_enabled: boolean;
  gst_percentage: number;
  branding?: {
    primary_color: string;
    secondary_color: string;
  };
}

export interface Event {
  id?: string;
  name: string;
  slug: string;
  description: string;
  event_type: string;
  start_date: string;
  end_date: string;
  city: string;
  state?: string;
  country: string;
  timezone: string;
  max_attendees?: number | null;
  settings: EventSettings;
  ai_confidence?: number;
}

export interface Ticket {
  id?: string;
  name: string;
  description: string;
  user_type: string;
  price: number;
  currency: string;
  total_quantity?: number | null;
  sale_start?: string;
  sale_end?: string;
  is_active: boolean;
  ai_generated: boolean;
  ai_rationale?: string;
}

export interface FormField {
  field_id: string;
  label: string;
  type: "text" | "email" | "phone" | "select" | "textarea" | "file" | "date" | "number" | "checkbox";
  placeholder?: string;
  required: boolean;
  options?: string[];
  options_source?: string;
  validation?: Record<string, any>;
  is_unique_identifier?: boolean;
  ai_generated?: boolean;
  sort_order: number;
}

export interface FormPage {
  page_number: number;
  title: string;
  description?: string;
  fields: FormField[];
}

export interface RegistrationForm {
  id?: string;
  name: string;
  user_type: string;
  schema: {
    pages: FormPage[];
  };
}

export interface ConfirmationEmail {
  subject: string;
  body_html: string;
}

export interface AISetupResponse {
  success: boolean;
  data: {
    event: Event;
    tickets: Ticket[];
    form: RegistrationForm;
    confirmation_email: ConfirmationEmail;
  };
}