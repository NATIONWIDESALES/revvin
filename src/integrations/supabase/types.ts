export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          actor_id: string
          created_at: string
          event_type: string
          id: string
          payload: Json | null
          referral_id: string | null
        }
        Insert: {
          actor_id: string
          created_at?: string
          event_type: string
          id?: string
          payload?: Json | null
          referral_id?: string | null
        }
        Update: {
          actor_id?: string
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json | null
          referral_id?: string | null
        }
        Relationships: []
      }
      badges: {
        Row: {
          badge_type: string
          description: string | null
          icon: string | null
          id: string
          name: string
          threshold: number
        }
        Insert: {
          badge_type?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          threshold?: number
        }
        Update: {
          badge_type?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          threshold?: number
        }
        Relationships: []
      }
      businesses: {
        Row: {
          account_status: string
          brand_color: string | null
          business_email: string | null
          category: string | null
          city: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string
          current_period_end: string | null
          description: string | null
          geocode_status: string | null
          geocoded_at: string | null
          headline: string | null
          id: string
          industry: string | null
          is_disabled: boolean
          is_published: boolean
          jobber_access_token_encrypted: string | null
          jobber_account_id: string | null
          jobber_integration_status: string | null
          jobber_refresh_token_encrypted: string | null
          jobber_token_expires_at: string | null
          latitude: number | null
          launch_package_status: string | null
          logo_url: string | null
          longitude: number | null
          marketplace_listed: boolean
          name: string
          offer_amount: string | null
          offer_fine_print: string | null
          offer_trigger: string | null
          phone: string | null
          postal_code: string | null
          referral_cta_label: string | null
          service_area: string | null
          slug: string | null
          state: string | null
          street_address: string | null
          stripe_connect_status: string | null
          stripe_connected_account_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          testimonials: Json | null
          trigger_delay_hours: number
          trigger_email_enabled: boolean
          trigger_sms_enabled: boolean
          trigger_template_email: string | null
          trigger_template_sms: string | null
          updated_at: string
          user_id: string
          verified: boolean | null
          website: string | null
          welcome_message: string | null
        }
        Insert: {
          account_status?: string
          brand_color?: string | null
          business_email?: string | null
          category?: string | null
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          current_period_end?: string | null
          description?: string | null
          geocode_status?: string | null
          geocoded_at?: string | null
          headline?: string | null
          id?: string
          industry?: string | null
          is_disabled?: boolean
          is_published?: boolean
          jobber_access_token_encrypted?: string | null
          jobber_account_id?: string | null
          jobber_integration_status?: string | null
          jobber_refresh_token_encrypted?: string | null
          jobber_token_expires_at?: string | null
          latitude?: number | null
          launch_package_status?: string | null
          logo_url?: string | null
          longitude?: number | null
          marketplace_listed?: boolean
          name: string
          offer_amount?: string | null
          offer_fine_print?: string | null
          offer_trigger?: string | null
          phone?: string | null
          postal_code?: string | null
          referral_cta_label?: string | null
          service_area?: string | null
          slug?: string | null
          state?: string | null
          street_address?: string | null
          stripe_connect_status?: string | null
          stripe_connected_account_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          testimonials?: Json | null
          trigger_delay_hours?: number
          trigger_email_enabled?: boolean
          trigger_sms_enabled?: boolean
          trigger_template_email?: string | null
          trigger_template_sms?: string | null
          updated_at?: string
          user_id: string
          verified?: boolean | null
          website?: string | null
          welcome_message?: string | null
        }
        Update: {
          account_status?: string
          brand_color?: string | null
          business_email?: string | null
          category?: string | null
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          current_period_end?: string | null
          description?: string | null
          geocode_status?: string | null
          geocoded_at?: string | null
          headline?: string | null
          id?: string
          industry?: string | null
          is_disabled?: boolean
          is_published?: boolean
          jobber_access_token_encrypted?: string | null
          jobber_account_id?: string | null
          jobber_integration_status?: string | null
          jobber_refresh_token_encrypted?: string | null
          jobber_token_expires_at?: string | null
          latitude?: number | null
          launch_package_status?: string | null
          logo_url?: string | null
          longitude?: number | null
          marketplace_listed?: boolean
          name?: string
          offer_amount?: string | null
          offer_fine_print?: string | null
          offer_trigger?: string | null
          phone?: string | null
          postal_code?: string | null
          referral_cta_label?: string | null
          service_area?: string | null
          slug?: string | null
          state?: string | null
          street_address?: string | null
          stripe_connect_status?: string | null
          stripe_connected_account_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          testimonials?: Json | null
          trigger_delay_hours?: number
          trigger_email_enabled?: boolean
          trigger_sms_enabled?: boolean
          trigger_template_email?: string | null
          trigger_template_sms?: string | null
          updated_at?: string
          user_id?: string
          verified?: boolean | null
          website?: string | null
          welcome_message?: string | null
        }
        Relationships: []
      }
      callback_requests: {
        Row: {
          business_name: string | null
          city: string | null
          created_at: string
          email: string
          help_with: string | null
          id: string
          is_mock: boolean
          name: string
          phone: string | null
        }
        Insert: {
          business_name?: string | null
          city?: string | null
          created_at?: string
          email: string
          help_with?: string | null
          id?: string
          is_mock?: boolean
          name: string
          phone?: string | null
        }
        Update: {
          business_name?: string | null
          city?: string | null
          created_at?: string
          email?: string
          help_with?: string | null
          id?: string
          is_mock?: boolean
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      campaign_contacts: {
        Row: {
          business_id: string
          consent_confirmed_at: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          opted_out: boolean
          opted_out_at: string | null
          phone: string | null
          source: string | null
        }
        Insert: {
          business_id: string
          consent_confirmed_at?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          opted_out?: boolean
          opted_out_at?: string | null
          phone?: string | null
          source?: string | null
        }
        Update: {
          business_id?: string
          consent_confirmed_at?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          opted_out?: boolean
          opted_out_at?: string | null
          phone?: string | null
          source?: string | null
        }
        Relationships: []
      }
      campaign_sends: {
        Row: {
          business_id: string
          campaign_id: string
          clicked_at: string | null
          contact_id: string | null
          created_at: string
          failure_reason: string | null
          id: string
          message_id: string | null
          opened_at: string | null
          recipient_email: string | null
          recipient_phone: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          business_id: string
          campaign_id: string
          clicked_at?: string | null
          contact_id?: string | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          message_id?: string | null
          opened_at?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          business_id?: string
          campaign_id?: string
          clicked_at?: string | null
          contact_id?: string | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          message_id?: string | null
          opened_at?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: []
      }
      campaign_templates: {
        Row: {
          body: string
          business_id: string | null
          channel: string
          created_at: string
          id: string
          is_system: boolean
          name: string
          subject: string | null
        }
        Insert: {
          body: string
          business_id?: string | null
          channel: string
          created_at?: string
          id?: string
          is_system?: boolean
          name: string
          subject?: string | null
        }
        Update: {
          body?: string
          business_id?: string | null
          channel?: string
          created_at?: string
          id?: string
          is_system?: boolean
          name?: string
          subject?: string | null
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          body: string
          business_id: string
          channel: string
          clicked_count: number
          completed_at: string | null
          consent_confirmed: boolean
          created_at: string
          created_by: string
          failed_count: number
          id: string
          name: string
          opened_count: number
          opted_out_count: number
          scheduled_at: string | null
          sent_count: number
          started_at: string | null
          status: string
          subject: string | null
          total_recipients: number
          updated_at: string
        }
        Insert: {
          body: string
          business_id: string
          channel: string
          clicked_count?: number
          completed_at?: string | null
          consent_confirmed?: boolean
          created_at?: string
          created_by: string
          failed_count?: number
          id?: string
          name: string
          opened_count?: number
          opted_out_count?: number
          scheduled_at?: string | null
          sent_count?: number
          started_at?: string | null
          status?: string
          subject?: string | null
          total_recipients?: number
          updated_at?: string
        }
        Update: {
          body?: string
          business_id?: string
          channel?: string
          clicked_count?: number
          completed_at?: string | null
          consent_confirmed?: boolean
          created_at?: string
          created_by?: string
          failed_count?: number
          id?: string
          name?: string
          opened_count?: number
          opted_out_count?: number
          scheduled_at?: string | null
          sent_count?: number
          started_at?: string | null
          status?: string
          subject?: string | null
          total_recipients?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      launch_tasks: {
        Row: {
          amount_paid: number
          assigned_admin_id: string | null
          business_id: string
          created_at: string
          currency: string
          delivered_at: string | null
          id: string
          notes: string | null
          package_type: string
          status: string
          stripe_payment_intent_id: string | null
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          assigned_admin_id?: string | null
          business_id: string
          created_at?: string
          currency?: string
          delivered_at?: string | null
          id?: string
          notes?: string | null
          package_type?: string
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          assigned_admin_id?: string | null
          business_id?: string
          created_at?: string
          currency?: string
          delivered_at?: string | null
          id?: string
          notes?: string | null
          package_type?: string
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          business_id: string
          consent_given: boolean
          created_at: string
          deal_value: number | null
          id: string
          lead_email: string | null
          lead_name: string
          lead_need: string
          lead_phone: string
          lead_source: string | null
          notes: string | null
          referrer_email: string
          referrer_name: string
          referrer_phone: string | null
          referrer_user_id: string | null
          relationship_to_lead: string | null
          status: string
          updated_at: string
        }
        Insert: {
          business_id: string
          consent_given?: boolean
          created_at?: string
          deal_value?: number | null
          id?: string
          lead_email?: string | null
          lead_name: string
          lead_need: string
          lead_phone: string
          lead_source?: string | null
          notes?: string | null
          referrer_email: string
          referrer_name: string
          referrer_phone?: string | null
          referrer_user_id?: string | null
          relationship_to_lead?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          consent_given?: boolean
          created_at?: string
          deal_value?: number | null
          id?: string
          lead_email?: string | null
          lead_name?: string
          lead_need?: string
          lead_phone?: string
          lead_source?: string | null
          notes?: string | null
          referrer_email?: string
          referrer_name?: string
          referrer_phone?: string | null
          referrer_user_id?: string | null
          relationship_to_lead?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_inquiries: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_mock: boolean
          kind: string
          listing_slug: string
          message: string | null
          name: string | null
          phone: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_mock?: boolean
          kind: string
          listing_slug: string
          message?: string | null
          name?: string | null
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_mock?: boolean
          kind?: string
          listing_slug?: string
          message?: string | null
          name?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      mock_listings: {
        Row: {
          about: string | null
          category: string
          city: string
          country: string
          created_at: string
          currency: string
          email: string | null
          gallery: Json
          hero_image: string
          hours: Json | null
          id: string
          is_mock: boolean
          lat: number | null
          lng: number | null
          name: string
          phone: string | null
          price_max: number | null
          price_min: number | null
          rating: number
          referral_fee: number
          referral_fee_unit: string
          region: string
          review_count: number
          reviews: Json
          services: Json
          slug: string
          tagline: string | null
          verified: boolean
          website: string | null
        }
        Insert: {
          about?: string | null
          category: string
          city: string
          country: string
          created_at?: string
          currency?: string
          email?: string | null
          gallery?: Json
          hero_image: string
          hours?: Json | null
          id?: string
          is_mock?: boolean
          lat?: number | null
          lng?: number | null
          name: string
          phone?: string | null
          price_max?: number | null
          price_min?: number | null
          rating?: number
          referral_fee: number
          referral_fee_unit: string
          region: string
          review_count?: number
          reviews?: Json
          services?: Json
          slug: string
          tagline?: string | null
          verified?: boolean
          website?: string | null
        }
        Update: {
          about?: string | null
          category?: string
          city?: string
          country?: string
          created_at?: string
          currency?: string
          email?: string | null
          gallery?: Json
          hero_image?: string
          hours?: Json | null
          id?: string
          is_mock?: boolean
          lat?: number | null
          lng?: number | null
          name?: string
          phone?: string | null
          price_max?: number | null
          price_min?: number | null
          rating?: number
          referral_fee?: number
          referral_fee_unit?: string
          region?: string
          review_count?: number
          reviews?: Json
          services?: Json
          slug?: string
          tagline?: string | null
          verified?: boolean
          website?: string | null
        }
        Relationships: []
      }
      monthly_recap_log: {
        Row: {
          business_id: string
          created_at: string
          id: string
          period_month: string
          recipient_email: string
          sent_at: string
          status: string
          summary: Json
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          period_month: string
          recipient_email: string
          sent_at?: string
          status?: string
          summary: Json
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          period_month?: string
          recipient_email?: string
          sent_at?: string
          status?: string
          summary?: Json
        }
        Relationships: [
          {
            foreignKeyName: "monthly_recap_log_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_recap_log_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          business_id: string
          created_at: string
          email_notifications_enabled: boolean
          email_on_closed_deal: boolean
          email_on_new_lead: boolean
          id: string
          notification_email: string | null
          notification_phone: string | null
          sms_notifications_enabled: boolean
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          email_notifications_enabled?: boolean
          email_on_closed_deal?: boolean
          email_on_new_lead?: boolean
          id?: string
          notification_email?: string | null
          notification_phone?: string | null
          sms_notifications_enabled?: boolean
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          email_notifications_enabled?: boolean
          email_on_closed_deal?: boolean
          email_on_new_lead?: boolean
          id?: string
          notification_email?: string | null
          notification_phone?: string | null
          sms_notifications_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read: boolean
          referral_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          referral_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          referral_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications_log: {
        Row: {
          body: string
          created_at: string
          id: string
          recipient_email: string
          recipient_name: string | null
          status: string
          subject: string
          type: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          recipient_email: string
          recipient_name?: string | null
          status?: string
          subject: string
          type: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          recipient_email?: string
          recipient_name?: string | null
          status?: string
          subject?: string
          type?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          approval_status: string | null
          business_id: string
          category: string
          close_time_days: number | null
          country: string
          created_at: string
          currency: string
          deal_size_max: number | null
          deal_size_min: number | null
          description: string | null
          featured: boolean | null
          id: string
          is_sample: boolean
          location: string | null
          paused_reason: string | null
          payout: number
          payout_type: string
          qualification_criteria: string | null
          remote_eligible: boolean | null
          restricted: boolean | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          approval_status?: string | null
          business_id: string
          category: string
          close_time_days?: number | null
          country?: string
          created_at?: string
          currency?: string
          deal_size_max?: number | null
          deal_size_min?: number | null
          description?: string | null
          featured?: boolean | null
          id?: string
          is_sample?: boolean
          location?: string | null
          paused_reason?: string | null
          payout?: number
          payout_type?: string
          qualification_criteria?: string | null
          remote_eligible?: boolean | null
          restricted?: boolean | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          approval_status?: string | null
          business_id?: string
          category?: string
          close_time_days?: number | null
          country?: string
          created_at?: string
          currency?: string
          deal_size_max?: number | null
          deal_size_min?: number | null
          description?: string | null
          featured?: boolean | null
          id?: string
          is_sample?: boolean
          location?: string | null
          paused_reason?: string | null
          payout?: number
          payout_type?: string
          qualification_criteria?: string | null
          remote_eligible?: boolean | null
          restricted?: boolean | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_contacts: {
        Row: {
          business_id: string
          created_at: string
          email: string | null
          id: string
          is_mock: boolean
          last_sent_at: string | null
          name: string
          phone: string | null
          send_channel: string | null
          status: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          email?: string | null
          id?: string
          is_mock?: boolean
          last_sent_at?: string | null
          name: string
          phone?: string | null
          send_channel?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_mock?: boolean
          last_sent_at?: string | null
          name?: string
          phone?: string | null
          send_channel?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_contacts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_contacts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_triggers: {
        Row: {
          amount_paid: number | null
          attempts: number
          business_id: string
          channel: string | null
          created_at: string
          customer_email: string | null
          customer_first_name: string | null
          customer_phone: string | null
          failure_reason: string | null
          id: string
          scheduled_send_at: string
          sent_at: string | null
          service_description: string | null
          source: string
          source_event_id: string | null
          status: string
        }
        Insert: {
          amount_paid?: number | null
          attempts?: number
          business_id: string
          channel?: string | null
          created_at?: string
          customer_email?: string | null
          customer_first_name?: string | null
          customer_phone?: string | null
          failure_reason?: string | null
          id?: string
          scheduled_send_at?: string
          sent_at?: string | null
          service_description?: string | null
          source: string
          source_event_id?: string | null
          status?: string
        }
        Update: {
          amount_paid?: number | null
          attempts?: number
          business_id?: string
          channel?: string | null
          created_at?: string
          customer_email?: string | null
          customer_first_name?: string | null
          customer_phone?: string | null
          failure_reason?: string | null
          id?: string
          scheduled_send_at?: string
          sent_at?: string | null
          service_description?: string | null
          source?: string
          source_event_id?: string | null
          status?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          business_id: string
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          deal_value: number | null
          file_url: string | null
          flagged_unpaid_at: string | null
          id: string
          notes: string | null
          offer_id: string
          payment_marked_at: string | null
          payment_status: string
          payout_amount: number | null
          payout_snapshot: number | null
          payout_status: string
          payout_type_snapshot: string | null
          referrer_id: string
          status: string
          updated_at: string
          void_reason: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          deal_value?: number | null
          file_url?: string | null
          flagged_unpaid_at?: string | null
          id?: string
          notes?: string | null
          offer_id: string
          payment_marked_at?: string | null
          payment_status?: string
          payout_amount?: number | null
          payout_snapshot?: number | null
          payout_status?: string
          payout_type_snapshot?: string | null
          referrer_id: string
          status?: string
          updated_at?: string
          void_reason?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          deal_value?: number | null
          file_url?: string | null
          flagged_unpaid_at?: string | null
          id?: string
          notes?: string | null
          offer_id?: string
          payment_marked_at?: string | null
          payment_status?: string
          payout_amount?: number | null
          payout_snapshot?: number | null
          payout_status?: string
          payout_type_snapshot?: string | null
          referrer_id?: string
          status?: string
          updated_at?: string
          void_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_tiers: {
        Row: {
          created_at: string
          id: string
          min_referrals: number
          offer_id: string
          reward_amount: number
          tier_label: string
        }
        Insert: {
          created_at?: string
          id?: string
          min_referrals: number
          offer_id: string
          reward_amount: number
          tier_label: string
        }
        Update: {
          created_at?: string
          id?: string
          min_referrals?: number
          offer_id?: string
          reward_amount?: number
          tier_label?: string
        }
        Relationships: []
      }
      saved_offers: {
        Row: {
          created_at: string
          id: string
          offer_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          offer_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          offer_id?: string
          user_id?: string
        }
        Relationships: []
      }
      seasonal_campaigns: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          is_active: boolean
          multiplier: number
          name: string
          offer_id: string
          starts_at: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          is_active?: boolean
          multiplier: number
          name: string
          offer_id: string
          starts_at: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          is_active?: boolean
          multiplier?: number
          name?: string
          offer_id?: string
          starts_at?: string
        }
        Relationships: []
      }
      send_log: {
        Row: {
          body: string | null
          business_id: string | null
          channel: string
          context: string | null
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          mode: string
          recipient: string
          status: string
          subject: string | null
        }
        Insert: {
          body?: string | null
          business_id?: string | null
          channel: string
          context?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          mode?: string
          recipient: string
          status?: string
          subject?: string | null
        }
        Update: {
          body?: string | null
          business_id?: string | null
          channel?: string
          context?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          mode?: string
          recipient?: string
          status?: string
          subject?: string | null
        }
        Relationships: []
      }
      sms_outbound_log: {
        Row: {
          body: string
          business_id: string | null
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_phone: string
          status: string
        }
        Insert: {
          body: string
          business_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_phone: string
          status?: string
        }
        Update: {
          body?: string
          business_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_phone?: string
          status?: string
        }
        Relationships: []
      }
      suppressed_contacts: {
        Row: {
          business_id: string
          contact_type: string
          contact_value: string
          created_at: string
          id: string
          reason: string | null
          source: string | null
        }
        Insert: {
          business_id: string
          contact_type: string
          contact_value: string
          created_at?: string
          id?: string
          reason?: string | null
          source?: string | null
        }
        Update: {
          business_id?: string
          contact_type?: string
          contact_value?: string
          created_at?: string
          id?: string
          reason?: string | null
          source?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      unsubscribe_tokens: {
        Row: {
          business_id: string
          contact_type: string
          contact_value: string
          created_at: string
          token: string
          used_at: string | null
        }
        Insert: {
          business_id: string
          contact_type: string
          contact_value: string
          created_at?: string
          token: string
          used_at?: string | null
        }
        Update: {
          business_id?: string
          contact_type?: string
          contact_value?: string
          created_at?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unsubscribe_tokens_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unsubscribe_tokens_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      businesses_public: {
        Row: {
          account_status: string | null
          brand_color: string | null
          category: string | null
          city: string | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          headline: string | null
          id: string | null
          industry: string | null
          is_disabled: boolean | null
          is_published: boolean | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string | null
          offer_amount: string | null
          offer_fine_print: string | null
          offer_trigger: string | null
          referral_cta_label: string | null
          service_area: string | null
          slug: string | null
          state: string | null
          subscription_status: string | null
          testimonials: Json | null
          updated_at: string | null
          user_id: string | null
          verified: boolean | null
          website: string | null
          welcome_message: string | null
        }
        Insert: {
          account_status?: string | null
          brand_color?: string | null
          category?: string | null
          city?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          headline?: string | null
          id?: string | null
          industry?: string | null
          is_disabled?: boolean | null
          is_published?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string | null
          offer_amount?: string | null
          offer_fine_print?: string | null
          offer_trigger?: string | null
          referral_cta_label?: string | null
          service_area?: string | null
          slug?: string | null
          state?: string | null
          subscription_status?: string | null
          testimonials?: Json | null
          updated_at?: string | null
          user_id?: string | null
          verified?: boolean | null
          website?: string | null
          welcome_message?: string | null
        }
        Update: {
          account_status?: string | null
          brand_color?: string | null
          category?: string | null
          city?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          headline?: string | null
          id?: string | null
          industry?: string | null
          is_disabled?: boolean | null
          is_published?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string | null
          offer_amount?: string | null
          offer_fine_print?: string | null
          offer_trigger?: string | null
          referral_cta_label?: string | null
          service_area?: string | null
          slug?: string | null
          state?: string | null
          subscription_status?: string | null
          testimonials?: Json | null
          updated_at?: string | null
          user_id?: string | null
          verified?: boolean | null
          website?: string | null
          welcome_message?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      award_badge_if_qualified: {
        Args: { p_badge_id: string }
        Returns: boolean
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      fn_business_privileged_unchanged: {
        Args: {
          p_account_status: string
          p_current_period_end: string
          p_id: string
          p_is_disabled: boolean
          p_is_published: boolean
          p_launch_package_status: string
          p_stripe_connect_status: string
          p_stripe_connected_account_id: string
          p_stripe_customer_id: string
          p_stripe_subscription_id: string
          p_subscription_status: string
          p_verified: boolean
        }
        Returns: boolean
      }
      fn_check_duplicate_referral: {
        Args: {
          p_business_id: string
          p_email: string
          p_offer_id: string
          p_phone?: string
          p_window_days?: number
        }
        Returns: boolean
      }
      fn_claim_referrer_leads: { Args: never; Returns: number }
      fn_create_audit_entry:
        | {
            Args: {
              p_actor_id: string
              p_event_type: string
              p_payload?: Json
              p_referral_id: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_event_type: string
              p_payload?: Json
              p_referral_id: string
            }
            Returns: undefined
          }
      fn_create_notification: {
        Args: {
          p_body: string
          p_referral_id?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      fn_get_business_roi: {
        Args: { p_business_id: string; p_from?: string; p_to?: string }
        Returns: Json
      }
      fn_is_suppressed: {
        Args: {
          p_business_id: string
          p_contact_type: string
          p_contact_value: string
        }
        Returns: boolean
      }
      fn_platform_counts: { Args: never; Returns: Json }
      fn_referral_privileged_unchanged: {
        Args: {
          p_business_id: string
          p_deal_value: number
          p_id: string
          p_offer_id: string
          p_payment_marked_at: string
          p_payment_status: string
          p_payout_amount: number
          p_payout_snapshot: number
          p_payout_status: string
          p_payout_type_snapshot: string
          p_referrer_id: string
          p_status: string
        }
        Returns: boolean
      }
      fn_slug_available: { Args: { p_slug: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "business" | "referrer" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["business", "referrer", "admin"],
    },
  },
} as const
