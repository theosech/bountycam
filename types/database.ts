export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          points_balance: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          points_balance?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          points_balance?: number
          created_at?: string
          updated_at?: string
        }
      }
      bounties: {
        Row: {
          id: string
          creator_id: string
          title: string
          description: string | null
          amount: number
          lat: number
          lng: number
          status: 'open' | 'accepted' | 'completed' | 'cancelled'
          accepted_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          creator_id: string
          title: string
          description?: string | null
          amount: number
          lat: number
          lng: number
          status?: 'open' | 'accepted' | 'completed' | 'cancelled'
          accepted_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          creator_id?: string
          title?: string
          description?: string | null
          amount?: number
          lat?: number
          lng?: number
          status?: 'open' | 'accepted' | 'completed' | 'cancelled'
          accepted_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sessions: {
        Row: {
          id: string
          bounty_id: string
          streamer_id: string
          status: 'active' | 'completed' | 'cancelled'
          started_at: string
          completed_at: string | null
          approved: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bounty_id: string
          streamer_id: string
          status?: 'active' | 'completed' | 'cancelled'
          started_at?: string
          completed_at?: string | null
          approved?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bounty_id?: string
          streamer_id?: string
          status?: 'active' | 'completed' | 'cancelled'
          started_at?: string
          completed_at?: string | null
          approved?: boolean | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      nearby_bounties: {
        Args: {
          user_lat: number
          user_lng: number
          radius_km?: number
        }
        Returns: {
          id: string
          creator_id: string
          title: string
          description: string
          amount: number
          lat: number
          lng: number
          distance_km: number
          status: 'open' | 'accepted' | 'completed' | 'cancelled'
          created_at: string
        }[]
      }
      accept_bounty: {
        Args: {
          p_bounty_id: string
        }
        Returns: Json
      }
      finish_session: {
        Args: {
          p_session_id: string
          p_approved: boolean
        }
        Returns: Json
      }
    }
    Enums: {
      bounty_status: 'open' | 'accepted' | 'completed' | 'cancelled'
      session_status: 'active' | 'completed' | 'cancelled'
    }
  }
}