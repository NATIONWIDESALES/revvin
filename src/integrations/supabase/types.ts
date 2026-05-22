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
          business_email: string | null
          category: string | null
          city: string | null
          created_at: string
          current_period_end: string | null
          description: string | null
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
          name: string
          offer_amount: string | null
          offer_fine_print: string | null
          offer_trigger: string | null
          phone: string | null
          pricing_tier: string
          service_area: string | null
          slug: string | null
          state: string | null
          stripe_connect_status: string | null
          stripe_connected_account_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          trigger_delay_hours: number
          trigger_email_enabled: boolean
          trigger_sms_enabled: boolean
          trigger_template_email: string | null
          trigger_template_sms: string | null
          updated_at: string
          user_id: string
          verified: boolean | null
          website: string | null
        }
        Insert: {
          account_status?: string
          business_email?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          current_period_end?: string | null
          description?: string | null
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
          name: string
          offer_amount?: string | null
          offer_fine_print?: string | null
          offer_trigger?: string | null
          phone?: string | null
          pricing_tier?: string
          service_area?: string | null
          slug?: string | null
          state?: string | null
          stripe_connect_status?: string | null
          stripe_connected_account_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          trigger_delay_hours?: number
          trigger_email_enabled?: boolean
          trigger_sms_enabled?: boolean
          trigger_template_email?: string | null
          trigger_template_sms?: string | null
          updated_at?: string
          user_id: string
          verified?: boolean | null
          website?: string | null
        }
        Update: {
          account_status?: string
          business_email?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          current_period_end?: string | null
          description?: string | null
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
          name?: string
          offer_amount?: string | null
          offer_fine_print?: string | null
          offer_trigger?: string | null
          phone?: string | null
          pricing_tier?: string
          service_area?: string | null
          slug?: string | null
          state?: string | null
          stripe_connect_status?: string | null
          stripe_connected_account_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          trigger_delay_hours?: number
          trigger_email_enabled?: boolean
          trigger_sms_enabled?: boolean
          trigger_template_email?: string | null
          trigger_template_sms?: string | null
          updated_at?: string
          user_id?: string
          verified?: boolean | null
          website?: string | null
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
          relationship_to_lead: string | null
          status: string
          updated_at: string
        }
        Insert: {
          business_id: string
          consent_given?: boolean
          created_at?: string
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
          relationship_to_lead?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          consent_given?: boolean
          created_at?: string
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
        ]
      }
      notification_settings: {
        Row: {
          business_id: string
          created_at: string
          email_notifications_enabled: boolean
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
          deposit_amount: number | null
          deposit_currency: string | null
          deposit_paid_at: string | null
          deposit_status: string
          description: string | null
          featured: boolean | null
          id: string
          is_sample: boolean
          location: string | null
          max_payout_cap: number | null
          paused_reason: string | null
          payout: number
          payout_type: string
          platform_fee_rate: number
          qualification_criteria: string | null
          remote_eligible: boolean | null
          restricted: boolean | null
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
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
          deposit_amount?: number | null
          deposit_currency?: string | null
          deposit_paid_at?: string | null
          deposit_status?: string
          description?: string | null
          featured?: boolean | null
          id?: string
          is_sample?: boolean
          location?: string | null
          max_payout_cap?: number | null
          paused_reason?: string | null
          payout?: number
          payout_type?: string
          platform_fee_rate?: number
          qualification_criteria?: string | null
          remote_eligible?: boolean | null
          restricted?: boolean | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
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
          deposit_amount?: number | null
          deposit_currency?: string | null
          deposit_paid_at?: string | null
          deposit_status?: string
          description?: string | null
          featured?: boolean | null
          id?: string
          is_sample?: boolean
          location?: string | null
          max_payout_cap?: number | null
          paused_reason?: string | null
          payout?: number
          payout_type?: string
          platform_fee_rate?: number
          qualification_criteria?: string | null
          remote_eligible?: boolean | null
          restricted?: boolean | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
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
        ]
      }
      payouts: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          currency: string
          id: string
          method: string | null
          notes: string | null
          paid_at: string | null
          platform_fee: number
          processed_by: string | null
          provider_reference: string | null
          referral_id: string
          referrer_id: string
          status: string
          tremendous_reward_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          business_id: string
          created_at?: string
          currency?: string
          id?: string
          method?: string | null
          notes?: string | null
          paid_at?: string | null
          platform_fee?: number
          processed_by?: string | null
          provider_reference?: string | null
          referral_id: string
          referrer_id: string
          status?: string
          tremendous_reward_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          currency?: string
          id?: string
          method?: string | null
          notes?: string | null
          paid_at?: string | null
          platform_fee?: number
          processed_by?: string | null
          provider_reference?: string | null
          referral_id?: string
          referrer_id?: string
          status?: string
          tremendous_reward_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
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
          file_url: string | null
          id: string
          notes: string | null
          offer_id: string
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
          file_url?: string | null
          id?: string
          notes?: string | null
          offer_id: string
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
          file_url?: string | null
          id?: string
          notes?: string | null
          offer_id?: string
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
            foreignKeyName: "referrals_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      referrer_payout_preferences: {
        Row: {
          created_at: string
          email: string | null
          id: string
          method: string | null
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          id: string
          mode: string
          recipient: string
          subject: string | null
        }
        Insert: {
          body?: string | null
          business_id?: string | null
          channel: string
          context?: string | null
          created_at?: string
          id?: string
          mode?: string
          recipient: string
          subject?: string | null
        }
        Update: {
          body?: string | null
          business_id?: string | null
          channel?: string
          context?: string | null
          created_at?: string
          id?: string
          mode?: string
          recipient?: string
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
      tremendous_webhook_log: {
        Row: {
          event: string
          payload: Json | null
          processed_at: string
          resource_id: string | null
          resource_type: string | null
          uuid: string
        }
        Insert: {
          event: string
          payload?: Json | null
          processed_at?: string
          resource_id?: string | null
          resource_type?: string | null
          uuid: string
        }
        Update: {
          event?: string
          payload?: Json | null
          processed_at?: string
          resource_id?: string | null
          resource_type?: string | null
          uuid?: string
        }
        Relationships: []
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
      wallet_balances: {
        Row: {
          available: number
          created_at: string
          currency: string
          id: string
          paid_out: number
          platform_fees: number
          reserved: number
          total_funded: number
          updated_at: string
          user_id: string
        }
        Insert: {
          available?: number
          created_at?: string
          currency?: string
          id?: string
          paid_out?: number
          platform_fees?: number
          reserved?: number
          total_funded?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          available?: number
          created_at?: string
          currency?: string
          id?: string
          paid_out?: number
          platform_fees?: number
          reserved?: number
          total_funded?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          offer_id: string | null
          referral_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          offer_id?: string | null
          referral_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          offer_id?: string | null
          referral_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      offers_public: {
        Row: {
          approval_status: string | null
          business_id: string | null
          category: string | null
          close_time_days: number | null
          country: string | null
          created_at: string | null
          currency: string | null
          deal_size_max: number | null
          deal_size_min: number | null
          deposit_amount: number | null
          deposit_currency: string | null
          deposit_paid_at: string | null
          deposit_status: string | null
          description: string | null
          featured: boolean | null
          id: string | null
          location: string | null
          max_payout_cap: number | null
          payout: number | null
          payout_type: string | null
          platform_fee_rate: number | null
          qualification_criteria: string | null
          remote_eligible: boolean | null
          restricted: boolean | null
          status: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          approval_status?: string | null
          business_id?: string | null
          category?: string | null
          close_time_days?: number | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          deal_size_max?: number | null
          deal_size_min?: number | null
          deposit_amount?: number | null
          deposit_currency?: string | null
          deposit_paid_at?: string | null
          deposit_status?: string | null
          description?: string | null
          featured?: boolean | null
          id?: string | null
          location?: string | null
          max_payout_cap?: number | null
          payout?: number | null
          payout_type?: string | null
          platform_fee_rate?: number | null
          qualification_criteria?: string | null
          remote_eligible?: boolean | null
          restricted?: boolean | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          approval_status?: string | null
          business_id?: string | null
          category?: string | null
          close_time_days?: number | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          deal_size_max?: number | null
          deal_size_min?: number | null
          deposit_amount?: number | null
          deposit_currency?: string | null
          deposit_paid_at?: string | null
          deposit_status?: string | null
          description?: string | null
          featured?: boolean | null
          id?: string | null
          location?: string | null
          max_payout_cap?: number | null
          payout?: number | null
          payout_type?: string | null
          platform_fee_rate?: number | null
          qualification_criteria?: string | null
          remote_eligible?: boolean | null
          restricted?: boolean | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
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
      fn_is_suppressed: {
        Args: {
          p_business_id: string
          p_contact_type: string
          p_contact_value: string
        }
        Returns: boolean
      }
      fn_platform_counts: { Args: never; Returns: Json }
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
