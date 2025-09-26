import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

console.log('🔧 Supabase Config:', {
  url: supabaseUrl,
  hasKey: !!supabaseServiceKey,
  keyLength: supabaseServiceKey?.length || 0
});

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('SUPABASE_URL:', supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client with service role key for server-side operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

// Database types (we'll generate these from Supabase)
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone_number: string | null;
          role: 'SUPER_ADMIN' | 'BRANCH_ADMIN' | 'TEACHER' | 'STUDENT';
          branch_id: string | null;
          hashed_password: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          phone_number?: string | null;
          role: 'SUPER_ADMIN' | 'BRANCH_ADMIN' | 'TEACHER' | 'STUDENT';
          branch_id?: string | null;
          hashed_password?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          phone_number?: string | null;
          role?: 'SUPER_ADMIN' | 'BRANCH_ADMIN' | 'TEACHER' | 'STUDENT';
          branch_id?: string | null;
          hashed_password?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      branches: {
        Row: {
          id: string;
          name: string;
          address: string;
          phone: string;
          email: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          address: string;
          phone: string;
          email: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string;
          phone?: string;
          email?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      slots: {
        Row: {
          id: string;
          teacher_id: string;
          branch_id: string;
          start_time: string;
          end_time: string;
          date: string;
          capacity: number;
          booked_count: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          teacher_id: string;
          branch_id: string;
          start_time: string;
          end_time: string;
          date: string;
          capacity: number;
          booked_count?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          teacher_id?: string;
          branch_id?: string;
          start_time?: string;
          end_time?: string;
          date?: string;
          capacity?: number;
          booked_count?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      bookings: {
        Row: {
          id: string;
          student_id: string;
          slot_id: string;
          status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          slot_id: string;
          status?: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          slot_id?: string;
          status?: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
          created_at?: string;
          updated_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: 'BOOKING_CONFIRMED' | 'BOOKING_REMINDER' | 'BOOKING_CANCELLED' | 'SYSTEM_ALERT' | 'ANNOUNCEMENT' | 'REMINDER' | 'URGENT' | 'MAINTENANCE';
          status: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'FAILED';
          is_read: boolean;
          tags: string[];
          scheduled_at: string | null;
          sent_at: string | null;
          read_at: string | null;
          action_url: string | null;
          metadata: any;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          type: 'BOOKING_CONFIRMED' | 'BOOKING_REMINDER' | 'BOOKING_CANCELLED' | 'SYSTEM_ALERT' | 'ANNOUNCEMENT' | 'REMINDER' | 'URGENT' | 'MAINTENANCE';
          status?: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'FAILED';
          is_read?: boolean;
          tags?: string[];
          scheduled_at?: string | null;
          sent_at?: string | null;
          read_at?: string | null;
          action_url?: string | null;
          metadata?: any;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          message?: string;
          type?: 'BOOKING_CONFIRMED' | 'BOOKING_REMINDER' | 'BOOKING_CANCELLED' | 'SYSTEM_ALERT' | 'ANNOUNCEMENT' | 'REMINDER' | 'URGENT' | 'MAINTENANCE';
          status?: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'FAILED';
          is_read?: boolean;
          tags?: string[];
          scheduled_at?: string | null;
          sent_at?: string | null;
          read_at?: string | null;
          action_url?: string | null;
          metadata?: any;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      assessments: {
        Row: {
          id: string;
          student_id: string;
          teacher_id: string;
          slot_id: string;
          score: number;
          feedback: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          teacher_id: string;
          slot_id: string;
          score: number;
          feedback: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          teacher_id?: string;
          slot_id?: string;
          score?: number;
          feedback?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      waiting_list: {
        Row: {
          id: string;
          student_id: string;
          slot_id: string;
          priority: number;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          slot_id: string;
          priority?: number;
          created_at?: string;
          expires_at: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          slot_id?: string;
          priority?: number;
          created_at?: string;
          expires_at?: string;
        };
      };
    };
  };
}

// Type aliases for easier use
export type User = Database['public']['Tables']['users']['Row'];
export type Branch = Database['public']['Tables']['branches']['Row'];
export type Slot = Database['public']['Tables']['slots']['Row'];
export type Booking = Database['public']['Tables']['bookings']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];
export type Assessment = Database['public']['Tables']['assessments']['Row'];
export type WaitingList = Database['public']['Tables']['waiting_list']['Row'];

export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type BranchInsert = Database['public']['Tables']['branches']['Insert'];
export type SlotInsert = Database['public']['Tables']['slots']['Insert'];
export type BookingInsert = Database['public']['Tables']['bookings']['Insert'];
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];
export type AssessmentInsert = Database['public']['Tables']['assessments']['Insert'];
export type WaitingListInsert = Database['public']['Tables']['waiting_list']['Insert'];

export type UserUpdate = Database['public']['Tables']['users']['Update'];
export type BranchUpdate = Database['public']['Tables']['branches']['Update'];
export type SlotUpdate = Database['public']['Tables']['slots']['Update'];
export type BookingUpdate = Database['public']['Tables']['bookings']['Update'];
export type NotificationUpdate = Database['public']['Tables']['notifications']['Update'];
export type AssessmentUpdate = Database['public']['Tables']['assessments']['Update'];
export type WaitingListUpdate = Database['public']['Tables']['waiting_list']['Update'];
