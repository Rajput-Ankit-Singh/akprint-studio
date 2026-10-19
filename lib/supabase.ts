import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const CYBERPRINT_CONFIG = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://lyspjwfnupbumzlnrhuz.supabase.co",
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5c3Bqd2ZudXBidW16bG5yaHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNzM0NDYsImV4cCI6MjEwNzY0OTQ0Nn0.0I-o3p5BYktNDgl0oUH4W1FI79fcYWbnaLAfiEQXjtQ",
  SHOP_NAME: process.env.NEXT_PUBLIC_SHOP_NAME || "CyberPrint Pay",
  PRICE_BW: 5,
  PRICE_COLOR: 10,
  BUCKET: "jobs",
  RETENTION_MINUTES: 10,
  MAX_FILE_MB: 20,
  DEFAULT_UPI_ID: process.env.NEXT_PUBLIC_UPI_ID || "uniquehacker@axl",
  ALLOWED_TYPES: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
};

export type DbPrintJob = {
  id: string;
  created_at: string;
  updated_at: string;
  customer_name?: string | null;
  file_name: string;
  file_path?: string | null;
  file_type?: string | null;
  file_deleted?: boolean;
  page_count: number;
  copies: number;
  color_mode: "bw" | "color";
  paper_size: string;
  orientation: "portrait" | "landscape";
  status: "pending" | "approved" | "rejected" | "cancelled";
  note?: string | null;
  total_price: number;
};

export function isSupabaseConfigured(): boolean {
  return Boolean(
    CYBERPRINT_CONFIG.SUPABASE_URL &&
    CYBERPRINT_CONFIG.SUPABASE_ANON_KEY &&
    !CYBERPRINT_CONFIG.SUPABASE_URL.includes("YOUR-PROJECT-REF")
  );
}

let customerClient: SupabaseClient | null = null;
let operatorClient: SupabaseClient | null = null;

/**
 * Client for customer uploads (unauthenticated / anon).
 * Disables session persistence so customers don't accidentally inherit operator credentials.
 */
export function getCustomerSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!customerClient) {
    customerClient = createClient(CYBERPRINT_CONFIG.SUPABASE_URL, CYBERPRINT_CONFIG.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return customerClient;
}

/**
 * Client for café counter operator desk.
 * Preserves operator authentication session in localStorage.
 */
export function getOperatorSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!operatorClient) {
    operatorClient = createClient(CYBERPRINT_CONFIG.SUPABASE_URL, CYBERPRINT_CONFIG.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return operatorClient;
}
