/**
 * Supabase Database Types
 *
 * 由 Supabase CLI 自动生成：
 * npx supabase gen types --lang=typescript --project-id $SUPABASE_PROJECT_ID --schema public > src/types/supabase.ts
 *
 * 或从本地数据库生成：
 * npx supabase gen types --lang=typescript --local > src/types/supabase.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      // 价格操纵检测表
      manipulation_detections: {
        Row: {
          id: string;
          protocol: string;
          symbol: string;
          chain: string;
          feed_key: string;
          type: string;
          severity: string;
          confidence_score: number;
          detected_at: string;
          evidence: Json | null;
          suspicious_transactions: Json | null;
          related_blocks: number[] | null;
          price_impact: number | null;
          financial_impact_usd: number | null;
          affected_addresses: string[] | null;
          status: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          protocol: string;
          symbol: string;
          chain: string;
          feed_key: string;
          type: string;
          severity: string;
          confidence_score: number;
          detected_at?: string;
          evidence?: Json | null;
          suspicious_transactions?: Json | null;
          related_blocks?: number[] | null;
          price_impact?: number | null;
          financial_impact_usd?: number | null;
          affected_addresses?: string[] | null;
          status?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          protocol?: string;
          symbol?: string;
          chain?: string;
          feed_key?: string;
          type?: string;
          severity?: string;
          confidence_score?: number;
          detected_at?: string;
          evidence?: Json | null;
          suspicious_transactions?: Json | null;
          related_blocks?: number[] | null;
          price_impact?: number | null;
          financial_impact_usd?: number | null;
          affected_addresses?: string[] | null;
          status?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      // 检测配置表
      detection_config: {
        Row: {
          id: string;
          config: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          config: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          config?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      // 被阻止的喂价表
      blocked_feeds: {
        Row: {
          id: string;
          feed_key: string;
          protocol: string;
          symbol: string;
          chain: string;
          reason: string;
          detection_id: string | null;
          blocked_at: string;
          unblocked_at: string | null;
          unblocked_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          feed_key: string;
          protocol: string;
          symbol: string;
          chain: string;
          reason: string;
          detection_id?: string | null;
          blocked_at?: string;
          unblocked_at?: string | null;
          unblocked_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          feed_key?: string;
          protocol?: string;
          symbol?: string;
          chain?: string;
          reason?: string;
          detection_id?: string | null;
          blocked_at?: string;
          unblocked_at?: string | null;
          unblocked_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'blocked_feeds_detection_id_fkey';
            columns: ['detection_id'];
            isOneToOne: false;
            referencedRelation: 'manipulation_detections';
            referencedColumns: ['id'];
          },
        ];
      };
      // 监控日志表
      monitoring_logs: {
        Row: {
          id: string;
          event: string;
          protocol: string | null;
          symbol: string | null;
          chain: string | null;
          timestamp: string;
          details: Json | null;
        };
        Insert: {
          id?: string;
          event: string;
          protocol?: string | null;
          symbol?: string | null;
          chain?: string | null;
          timestamp?: string;
          details?: Json | null;
        };
        Update: {
          id?: string;
          event?: string;
          protocol?: string | null;
          symbol?: string | null;
          chain?: string | null;
          timestamp?: string;
          details?: Json | null;
        };
        Relationships: [];
      };
      // 检测指标表
      detection_metrics: {
        Row: {
          id: string;
          total_detections: number;
          detections_by_type: Json;
          detections_by_severity: Json;
          false_positives: number;
          average_confidence: number;
          last_detection_time: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          total_detections?: number;
          detections_by_type?: Json;
          detections_by_severity?: Json;
          false_positives?: number;
          average_confidence?: number;
          last_detection_time?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          total_detections?: number;
          detections_by_type?: Json;
          detections_by_severity?: Json;
          false_positives?: number;
          average_confidence?: number;
          last_detection_time?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      // 预言机协议信息表
      oracle_protocols_info: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          logo_url: string | null;
          website: string | null;
          supported_chains: string[];
          features: string[];
          tvl: number | null;
          market_share: number | null;
          is_active: boolean;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          description?: string | null;
          logo_url?: string | null;
          website?: string | null;
          supported_chains?: string[];
          features?: string[];
          tvl?: number | null;
          market_share?: number | null;
          is_active?: boolean;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          logo_url?: string | null;
          website?: string | null;
          supported_chains?: string[];
          features?: string[];
          tvl?: number | null;
          market_share?: number | null;
          is_active?: boolean;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      // 统一预言机实例表
      unified_oracle_instances: {
        Row: {
          id: string;
          name: string;
          protocol: string;
          chain: string;
          enabled: boolean;
          config: Json;
          protocol_config: Json | null;
          metadata: Json | null;
          total_updates: number;
          last_update_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          protocol: string;
          chain: string;
          enabled?: boolean;
          config?: Json;
          protocol_config?: Json | null;
          metadata?: Json | null;
          total_updates?: number;
          last_update_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          protocol?: string;
          chain?: string;
          enabled?: boolean;
          config?: Json;
          protocol_config?: Json | null;
          metadata?: Json | null;
          total_updates?: number;
          last_update_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      // 统一价格喂价表
      unified_price_feeds: {
        Row: {
          id: string;
          instance_id: string;
          protocol: string;
          chain: string;
          symbol: string;
          base_asset: string;
          quote_asset: string;
          price: number;
          price_raw: string;
          decimals: number;
          timestamp: string;
          block_number: number | null;
          confidence: number | null;
          sources: number | null;
          is_stale: boolean;
          staleness_seconds: number | null;
          tx_hash: string | null;
          log_index: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          instance_id: string;
          protocol: string;
          chain: string;
          symbol: string;
          base_asset: string;
          quote_asset: string;
          price: number;
          price_raw: string;
          decimals?: number;
          timestamp: string;
          block_number?: number | null;
          confidence?: number | null;
          sources?: number | null;
          is_stale?: boolean;
          staleness_seconds?: number | null;
          tx_hash?: string | null;
          log_index?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          instance_id?: string;
          protocol?: string;
          chain?: string;
          symbol?: string;
          base_asset?: string;
          quote_asset?: string;
          price?: number;
          price_raw?: string;
          decimals?: number;
          timestamp?: string;
          block_number?: number | null;
          confidence?: number | null;
          sources?: number | null;
          is_stale?: boolean;
          staleness_seconds?: number | null;
          tx_hash?: string | null;
          log_index?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'unified_price_feeds_instance_id_fkey';
            columns: ['instance_id'];
            isOneToOne: false;
            referencedRelation: 'unified_oracle_instances';
            referencedColumns: ['id'];
          },
        ];
      };
      // 统一价格更新表
      unified_price_updates: {
        Row: {
          id: string;
          feed_id: string;
          instance_id: string;
          protocol: string;
          previous_price: number;
          current_price: number;
          price_change: number;
          price_change_percent: number;
          timestamp: string;
          block_number: number | null;
          tx_hash: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          feed_id: string;
          instance_id: string;
          protocol: string;
          previous_price: number;
          current_price: number;
          price_change: number;
          price_change_percent: number;
          timestamp: string;
          block_number?: number | null;
          tx_hash?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          feed_id?: string;
          instance_id?: string;
          protocol?: string;
          previous_price?: number;
          current_price?: number;
          price_change?: number;
          price_change_percent?: number;
          timestamp?: string;
          block_number?: number | null;
          tx_hash?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'unified_price_updates_feed_id_fkey';
            columns: ['feed_id'];
            isOneToOne: false;
            referencedRelation: 'unified_price_feeds';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'unified_price_updates_instance_id_fkey';
            columns: ['instance_id'];
            isOneToOne: false;
            referencedRelation: 'unified_oracle_instances';
            referencedColumns: ['id'];
          },
        ];
      };
      // 统一断言表
      unified_assertions: {
        Row: {
          id: string;
          instance_id: string;
          protocol: string;
          chain: string;
          identifier: string;
          description: string | null;
          proposer: string;
          proposed_value: string | null;
          proposed_at: string;
          expires_at: string | null;
          settled_at: string | null;
          status: string;
          settlement_value: string | null;
          bond_amount: number | null;
          bond_token: string | null;
          reward: number | null;
          disputed: boolean;
          disputer: string | null;
          disputed_at: string | null;
          tx_hash: string;
          block_number: number;
          log_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          instance_id: string;
          protocol: string;
          chain: string;
          identifier: string;
          description?: string | null;
          proposer: string;
          proposed_value?: string | null;
          proposed_at: string;
          expires_at?: string | null;
          settled_at?: string | null;
          status?: string;
          settlement_value?: string | null;
          bond_amount?: number | null;
          bond_token?: string | null;
          reward?: number | null;
          disputed?: boolean;
          disputer?: string | null;
          disputed_at?: string | null;
          tx_hash: string;
          block_number: number;
          log_index: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          instance_id?: string;
          protocol?: string;
          chain?: string;
          identifier?: string;
          description?: string | null;
          proposer?: string;
          proposed_value?: string | null;
          proposed_at?: string;
          expires_at?: string | null;
          settled_at?: string | null;
          status?: string;
          settlement_value?: string | null;
          bond_amount?: number | null;
          bond_token?: string | null;
          reward?: number | null;
          disputed?: boolean;
          disputer?: string | null;
          disputed_at?: string | null;
          tx_hash?: string;
          block_number?: number;
          log_index?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'unified_assertions_instance_id_fkey';
            columns: ['instance_id'];
            isOneToOne: false;
            referencedRelation: 'unified_oracle_instances';
            referencedColumns: ['id'];
          },
        ];
      };
      // 统一争议表
      unified_disputes: {
        Row: {
          id: string;
          instance_id: string;
          protocol: string;
          chain: string;
          assertion_id: string;
          disputer: string;
          reason: string | null;
          disputed_at: string;
          voting_ends_at: string | null;
          resolved_at: string | null;
          status: string;
          outcome: string | null;
          votes_for: number;
          votes_against: number;
          total_votes: number;
          dispute_bond: number | null;
          tx_hash: string;
          block_number: number;
          log_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          instance_id: string;
          protocol: string;
          chain: string;
          assertion_id: string;
          disputer: string;
          reason?: string | null;
          disputed_at: string;
          voting_ends_at?: string | null;
          resolved_at?: string | null;
          status?: string;
          outcome?: string | null;
          votes_for?: number;
          votes_against?: number;
          total_votes?: number;
          dispute_bond?: number | null;
          tx_hash: string;
          block_number: number;
          log_index: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          instance_id?: string;
          protocol?: string;
          chain?: string;
          assertion_id?: string;
          disputer?: string;
          reason?: string | null;
          disputed_at?: string;
          voting_ends_at?: string | null;
          resolved_at?: string | null;
          status?: string;
          outcome?: string | null;
          votes_for?: number;
          votes_against?: number;
          total_votes?: number;
          dispute_bond?: number | null;
          tx_hash?: string;
          block_number?: number;
          log_index?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'unified_disputes_assertion_id_fkey';
            columns: ['assertion_id'];
            isOneToOne: false;
            referencedRelation: 'unified_assertions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'unified_disputes_instance_id_fkey';
            columns: ['instance_id'];
            isOneToOne: false;
            referencedRelation: 'unified_oracle_instances';
            referencedColumns: ['id'];
          },
        ];
      };
      // 统一同步状态表
      unified_sync_state: {
        Row: {
          instance_id: string;
          protocol: string;
          chain: string;
          last_processed_block: number;
          latest_block: number | null;
          safe_block: number | null;
          lag_blocks: number | null;
          last_sync_at: string | null;
          last_sync_duration_ms: number | null;
          avg_sync_duration_ms: number | null;
          status: string;
          consecutive_failures: number;
          last_error: string | null;
          last_error_at: string | null;
          active_rpc_url: string | null;
          rpc_health: string;
          updated_at: string;
        };
        Insert: {
          instance_id: string;
          protocol: string;
          chain: string;
          last_processed_block?: number;
          latest_block?: number | null;
          safe_block?: number | null;
          lag_blocks?: number | null;
          last_sync_at?: string | null;
          last_sync_duration_ms?: number | null;
          avg_sync_duration_ms?: number | null;
          status?: string;
          consecutive_failures?: number;
          last_error?: string | null;
          last_error_at?: string | null;
          active_rpc_url?: string | null;
          rpc_health?: string;
          updated_at?: string;
        };
        Update: {
          instance_id?: string;
          protocol?: string;
          chain?: string;
          last_processed_block?: number;
          latest_block?: number | null;
          safe_block?: number | null;
          lag_blocks?: number | null;
          last_sync_at?: string | null;
          last_sync_duration_ms?: number | null;
          avg_sync_duration_ms?: number | null;
          status?: string;
          consecutive_failures?: number;
          last_error?: string | null;
          last_error_at?: string | null;
          active_rpc_url?: string | null;
          rpc_health?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'unified_sync_state_instance_id_fkey';
            columns: ['instance_id'];
            isOneToOne: true;
            referencedRelation: 'unified_oracle_instances';
            referencedColumns: ['id'];
          },
        ];
      };
      // 统一统计表
      unified_statistics: {
        Row: {
          id: number;
          instance_id: string;
          protocol: string;
          chain: string;
          hour: string;
          total_updates: number;
          avg_price: number | null;
          min_price: number | null;
          max_price: number | null;
          price_volatility: number | null;
          total_assertions: number;
          active_assertions: number;
          disputed_assertions: number;
          settled_assertions: number;
          total_disputes: number;
          resolved_disputes: number;
          avg_response_time_ms: number | null;
          uptime_percent: number | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          instance_id: string;
          protocol: string;
          chain: string;
          hour: string;
          total_updates?: number;
          avg_price?: number | null;
          min_price?: number | null;
          max_price?: number | null;
          price_volatility?: number | null;
          total_assertions?: number;
          active_assertions?: number;
          disputed_assertions?: number;
          settled_assertions?: number;
          total_disputes?: number;
          resolved_disputes?: number;
          avg_response_time_ms?: number | null;
          uptime_percent?: number | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          instance_id?: string;
          protocol?: string;
          chain?: string;
          hour?: string;
          total_updates?: number;
          avg_price?: number | null;
          min_price?: number | null;
          max_price?: number | null;
          price_volatility?: number | null;
          total_assertions?: number;
          active_assertions?: number;
          disputed_assertions?: number;
          settled_assertions?: number;
          total_disputes?: number;
          resolved_disputes?: number;
          avg_response_time_ms?: number | null;
          uptime_percent?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'unified_statistics_instance_id_fkey';
            columns: ['instance_id'];
            isOneToOne: false;
            referencedRelation: 'unified_oracle_instances';
            referencedColumns: ['id'];
          },
        ];
      };
      // 跨预言机对比表
      cross_oracle_comparisons: {
        Row: {
          id: string;
          symbol: string;
          base_asset: string;
          quote_asset: string;
          avg_price: number;
          median_price: number;
          min_price: number;
          max_price: number;
          price_range: number;
          price_range_percent: number;
          max_deviation: number;
          max_deviation_percent: number;
          outlier_protocols: string[] | null;
          recommended_price: number;
          recommendation_source: string | null;
          participating_protocols: string[] | null;
          participating_instances: string[] | null;
          timestamp: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          symbol: string;
          base_asset: string;
          quote_asset: string;
          avg_price: number;
          median_price: number;
          min_price: number;
          max_price: number;
          price_range: number;
          price_range_percent: number;
          max_deviation: number;
          max_deviation_percent: number;
          outlier_protocols?: string[] | null;
          recommended_price: number;
          recommendation_source?: string | null;
          participating_protocols?: string[] | null;
          participating_instances?: string[] | null;
          timestamp: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          symbol?: string;
          base_asset?: string;
          quote_asset?: string;
          avg_price?: number;
          median_price?: number;
          min_price?: number;
          max_price?: number;
          price_range?: number;
          price_range_percent?: number;
          max_deviation?: number;
          max_deviation_percent?: number;
          outlier_protocols?: string[] | null;
          recommended_price?: number;
          recommendation_source?: string | null;
          participating_protocols?: string[] | null;
          participating_instances?: string[] | null;
          timestamp?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      // 统一告警规则表
      unified_alert_rules: {
        Row: {
          id: string;
          name: string;
          enabled: boolean;
          event: string;
          severity: string;
          protocols: string[] | null;
          chains: string[] | null;
          instances: string[] | null;
          symbols: string[] | null;
          params: Json | null;
          channels: string[];
          recipients: string[] | null;
          cooldown_minutes: number;
          max_notifications_per_hour: number;
          runbook: string | null;
          owner: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          enabled?: boolean;
          event: string;
          severity?: string;
          protocols?: string[] | null;
          chains?: string[] | null;
          instances?: string[] | null;
          symbols?: string[] | null;
          params?: Json | null;
          channels?: string[];
          recipients?: string[] | null;
          cooldown_minutes?: number;
          max_notifications_per_hour?: number;
          runbook?: string | null;
          owner?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          enabled?: boolean;
          event?: string;
          severity?: string;
          protocols?: string[] | null;
          chains?: string[] | null;
          instances?: string[] | null;
          symbols?: string[] | null;
          params?: Json | null;
          channels?: string[];
          recipients?: string[] | null;
          cooldown_minutes?: number;
          max_notifications_per_hour?: number;
          runbook?: string | null;
          owner?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      // 统一告警记录表
      unified_alerts: {
        Row: {
          id: string;
          rule_id: string | null;
          event: string;
          severity: string;
          title: string;
          message: string;
          protocol: string | null;
          chain: string | null;
          instance_id: string | null;
          symbol: string | null;
          assertion_id: string | null;
          dispute_id: string | null;
          context: Json | null;
          status: string;
          acknowledged_by: string | null;
          acknowledged_at: string | null;
          resolved_by: string | null;
          resolved_at: string | null;
          occurrences: number;
          first_seen_at: string;
          last_seen_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          rule_id?: string | null;
          event: string;
          severity: string;
          title: string;
          message: string;
          protocol?: string | null;
          chain?: string | null;
          instance_id?: string | null;
          symbol?: string | null;
          assertion_id?: string | null;
          dispute_id?: string | null;
          context?: Json | null;
          status?: string;
          acknowledged_by?: string | null;
          acknowledged_at?: string | null;
          resolved_by?: string | null;
          resolved_at?: string | null;
          occurrences?: number;
          first_seen_at?: string;
          last_seen_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          rule_id?: string | null;
          event?: string;
          severity?: string;
          title?: string;
          message?: string;
          protocol?: string | null;
          chain?: string | null;
          instance_id?: string | null;
          symbol?: string | null;
          assertion_id?: string | null;
          dispute_id?: string | null;
          context?: Json | null;
          status?: string;
          acknowledged_by?: string | null;
          acknowledged_at?: string | null;
          resolved_by?: string | null;
          resolved_at?: string | null;
          occurrences?: number;
          first_seen_at?: string;
          last_seen_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'unified_alerts_rule_id_fkey';
            columns: ['rule_id'];
            isOneToOne: false;
            referencedRelation: 'unified_alert_rules';
            referencedColumns: ['id'];
          },
        ];
      };
      // 统一配置模板表
      unified_config_templates: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          protocol: string;
          config: Json;
          supported_chains: string[];
          requirements: string[] | null;
          is_default: boolean;
          is_official: boolean;
          author: string | null;
          usage_count: number;
          rating: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          description?: string | null;
          protocol: string;
          config?: Json;
          supported_chains?: string[];
          requirements?: string[] | null;
          is_default?: boolean;
          is_official?: boolean;
          author?: string | null;
          usage_count?: number;
          rating?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          protocol?: string;
          config?: Json;
          supported_chains?: string[];
          requirements?: string[] | null;
          is_default?: boolean;
          is_official?: boolean;
          author?: string | null;
          usage_count?: number;
          rating?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      // 健康检查表
      oracle_health_checks: {
        Row: {
          id: number;
          protocol: string;
          chain: string;
          feed_id: string;
          healthy: boolean;
          last_update: string | null;
          staleness_seconds: number;
          issues: Json | null;
          checked_at: string;
          latency_ms: number;
          active_assertions: number | null;
          active_disputes: number | null;
          total_bonded: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          protocol: string;
          chain: string;
          feed_id: string;
          healthy?: boolean;
          last_update?: string | null;
          staleness_seconds?: number;
          issues?: Json | null;
          checked_at?: string;
          latency_ms?: number;
          active_assertions?: number | null;
          active_disputes?: number | null;
          total_bonded?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          protocol?: string;
          chain?: string;
          feed_id?: string;
          healthy?: boolean;
          last_update?: string | null;
          staleness_seconds?: number;
          issues?: Json | null;
          checked_at?: string;
          latency_ms?: number;
          active_assertions?: number | null;
          active_disputes?: number | null;
          total_bonded?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      // 网络指标表
      oracle_network_metrics: {
        Row: {
          id: number;
          chain: string;
          gas_price_gwei: number | null;
          gas_price_fast_gwei: number | null;
          gas_price_standard_gwei: number | null;
          gas_price_slow_gwei: number | null;
          block_number: number | null;
          block_timestamp: string | null;
          network_congestion: number | null;
          timestamp: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          chain: string;
          gas_price_gwei?: number | null;
          gas_price_fast_gwei?: number | null;
          gas_price_standard_gwei?: number | null;
          gas_price_slow_gwei?: number | null;
          block_number?: number | null;
          block_timestamp?: string | null;
          network_congestion?: number | null;
          timestamp?: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          chain?: string;
          gas_price_gwei?: number | null;
          gas_price_fast_gwei?: number | null;
          gas_price_standard_gwei?: number | null;
          gas_price_slow_gwei?: number | null;
          block_number?: number | null;
          block_timestamp?: string | null;
          network_congestion?: number | null;
          timestamp?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      // 流动性表
      oracle_liquidity: {
        Row: {
          id: number;
          symbol: string;
          chain: string;
          liquidity_usd: number | null;
          liquidity_token: number | null;
          volume_24h_usd: number | null;
          dex_name: string | null;
          pool_address: string | null;
          timestamp: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          symbol: string;
          chain: string;
          liquidity_usd?: number | null;
          liquidity_token?: number | null;
          volume_24h_usd?: number | null;
          dex_name?: string | null;
          pool_address?: string | null;
          timestamp?: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          symbol?: string;
          chain?: string;
          liquidity_usd?: number | null;
          liquidity_token?: number | null;
          volume_24h_usd?: number | null;
          dex_name?: string | null;
          pool_address?: string | null;
          timestamp?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      // 原始价格历史
      price_history_raw: {
        Row: {
          id: number;
          symbol: string;
          protocol: string;
          chain: string;
          price: number;
          price_raw: string;
          decimals: number;
          timestamp: string;
          block_number: number | null;
          confidence: number | null;
          volume_24h: number | null;
          change_24h: number | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          symbol: string;
          protocol: string;
          chain: string;
          price: number;
          price_raw: string;
          decimals?: number;
          timestamp: string;
          block_number?: number | null;
          confidence?: number | null;
          volume_24h?: number | null;
          change_24h?: number | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          symbol?: string;
          protocol?: string;
          chain?: string;
          price?: number;
          price_raw?: string;
          decimals?: number;
          timestamp?: string;
          block_number?: number | null;
          confidence?: number | null;
          volume_24h?: number | null;
          change_24h?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      // 1分钟聚合价格历史
      price_history_min1: {
        Row: {
          id: number;
          symbol: string;
          protocol: string;
          chain: string;
          price_open: number;
          price_high: number;
          price_low: number;
          price_close: number;
          volume: number;
          timestamp: string;
          sample_count: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          symbol: string;
          protocol: string;
          chain: string;
          price_open: number;
          price_high: number;
          price_low: number;
          price_close: number;
          volume?: number;
          timestamp: string;
          sample_count?: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          symbol?: string;
          protocol?: string;
          chain?: string;
          price_open?: number;
          price_high?: number;
          price_low?: number;
          price_close?: number;
          volume?: number;
          timestamp?: string;
          sample_count?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      // 5分钟聚合价格历史
      price_history_min5: {
        Row: {
          id: number;
          symbol: string;
          protocol: string;
          chain: string;
          price_open: number;
          price_high: number;
          price_low: number;
          price_close: number;
          volume: number;
          timestamp: string;
          sample_count: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          symbol: string;
          protocol: string;
          chain: string;
          price_open: number;
          price_high: number;
          price_low: number;
          price_close: number;
          volume?: number;
          timestamp: string;
          sample_count?: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          symbol?: string;
          protocol?: string;
          chain?: string;
          price_open?: number;
          price_high?: number;
          price_low?: number;
          price_close?: number;
          volume?: number;
          timestamp?: string;
          sample_count?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      // 1小时聚合价格历史
      price_history_hour1: {
        Row: {
          id: number;
          symbol: string;
          protocol: string;
          chain: string;
          price_open: number;
          price_high: number;
          price_low: number;
          price_close: number;
          volume: number;
          timestamp: string;
          sample_count: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          symbol: string;
          protocol: string;
          chain: string;
          price_open: number;
          price_high: number;
          price_low: number;
          price_close: number;
          volume?: number;
          timestamp: string;
          sample_count?: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          symbol?: string;
          protocol?: string;
          chain?: string;
          price_open?: number;
          price_high?: number;
          price_low?: number;
          price_close?: number;
          volume?: number;
          timestamp?: string;
          sample_count?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      // 1天聚合价格历史
      price_history_day1: {
        Row: {
          id: number;
          symbol: string;
          protocol: string;
          chain: string;
          price_open: number;
          price_high: number;
          price_low: number;
          price_close: number;
          volume: number;
          timestamp: string;
          sample_count: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          symbol: string;
          protocol: string;
          chain: string;
          price_open: number;
          price_high: number;
          price_low: number;
          price_close: number;
          volume?: number;
          timestamp: string;
          sample_count?: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          symbol?: string;
          protocol?: string;
          chain?: string;
          price_open?: number;
          price_high?: number;
          price_low?: number;
          price_close?: number;
          volume?: number;
          timestamp?: string;
          sample_count?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      // Solana 价格喂价
      solana_price_feeds: {
        Row: {
          id: string;
          symbol: string;
          name: string;
          price: number;
          confidence: number;
          timestamp: string;
          slot: number;
          signature: string;
          source: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          symbol: string;
          name: string;
          price: number;
          confidence: number;
          timestamp: string;
          slot: number;
          signature: string;
          source: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          symbol?: string;
          name?: string;
          price?: number;
          confidence?: number;
          timestamp?: string;
          slot?: number;
          signature?: string;
          source?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      // Solana 价格历史
      solana_price_histories: {
        Row: {
          id: string;
          feed_id: string;
          price: number;
          confidence: number;
          timestamp: string;
          slot: number;
          signature: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          feed_id: string;
          price: number;
          confidence: number;
          timestamp: string;
          slot: number;
          signature: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          feed_id?: string;
          price?: number;
          confidence?: number;
          timestamp?: string;
          slot?: number;
          signature?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'solana_price_histories_feed_id_fkey';
            columns: ['feed_id'];
            isOneToOne: false;
            referencedRelation: 'solana_price_feeds';
            referencedColumns: ['id'];
          },
        ];
      };
      // Solana 预言机实例
      solana_oracle_instances: {
        Row: {
          id: string;
          name: string;
          program_id: string;
          cluster: string;
          rpc_url: string;
          is_active: boolean;
          last_sync_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          program_id: string;
          cluster: string;
          rpc_url: string;
          is_active?: boolean;
          last_sync_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          program_id?: string;
          cluster?: string;
          rpc_url?: string;
          is_active?: boolean;
          last_sync_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      // Solana 同步状态
      solana_sync_status: {
        Row: {
          id: string;
          instance_id: string;
          feed_symbol: string;
          last_slot: number;
          last_signature: string;
          last_timestamp: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          instance_id: string;
          feed_symbol: string;
          last_slot: number;
          last_signature: string;
          last_timestamp: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          instance_id?: string;
          feed_symbol?: string;
          last_slot?: number;
          last_signature?: string;
          last_timestamp?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      // Solana 告警
      solana_alerts: {
        Row: {
          id: string;
          type: string;
          severity: string;
          symbol: string;
          message: string;
          details: Json | null;
          status: string;
          resolved_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: string;
          severity: string;
          symbol: string;
          message: string;
          details?: Json | null;
          status?: string;
          resolved_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          type?: string;
          severity?: string;
          symbol?: string;
          message?: string;
          details?: Json | null;
          status?: string;
          resolved_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      // 事件时间线
      event_timeline: {
        Row: {
          id: string;
          event_type: string;
          severity: string;
          title: string;
          description: string | null;
          protocol: string | null;
          chain: string | null;
          symbol: string | null;
          entity_type: string | null;
          entity_id: string | null;
          metadata: Json | null;
          occurred_at: string;
          created_at: string;
          parent_event_id: string | null;
          related_event_ids: string[] | null;
          source: string;
          source_user: string | null;
        };
        Insert: {
          id?: string;
          event_type: string;
          severity?: string;
          title: string;
          description?: string | null;
          protocol?: string | null;
          chain?: string | null;
          symbol?: string | null;
          entity_type?: string | null;
          entity_id?: string | null;
          metadata?: Json | null;
          occurred_at: string;
          created_at?: string;
          parent_event_id?: string | null;
          related_event_ids?: string[] | null;
          source?: string;
          source_user?: string | null;
        };
        Update: {
          id?: string;
          event_type?: string;
          severity?: string;
          title?: string;
          description?: string | null;
          protocol?: string | null;
          chain?: string | null;
          symbol?: string | null;
          entity_type?: string | null;
          entity_id?: string | null;
          metadata?: Json | null;
          occurred_at?: string;
          created_at?: string;
          parent_event_id?: string | null;
          related_event_ids?: string[] | null;
          source?: string;
          source_user?: string | null;
        };
        Relationships: [];
      };
      // 部署记录
      deployment_records: {
        Row: {
          id: string;
          version: string;
          environment: string;
          commit_hash: string | null;
          branch: string | null;
          changes: Json | null;
          affected_services: string[] | null;
          status: string;
          deployed_by: string | null;
          started_at: string;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          version: string;
          environment: string;
          commit_hash?: string | null;
          branch?: string | null;
          changes?: Json | null;
          affected_services?: string[] | null;
          status?: string;
          deployed_by?: string | null;
          started_at: string;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          version?: string;
          environment?: string;
          commit_hash?: string | null;
          branch?: string | null;
          changes?: Json | null;
          affected_services?: string[] | null;
          status?: string;
          deployed_by?: string | null;
          started_at?: string;
          completed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// 辅助类型
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type Inserts<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type Updates<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

// 常用表类型导出 - 价格操纵检测
export type ManipulationDetection = Tables<'manipulation_detections'>;
export type DetectionConfig = Tables<'detection_config'>;
export type BlockedFeed = Tables<'blocked_feeds'>;
export type MonitoringLog = Tables<'monitoring_logs'>;

// 常用表类型导出 - 统一预言机
export type OracleProtocolInfo = Tables<'oracle_protocols_info'>;
export type UnifiedOracleInstance = Tables<'unified_oracle_instances'>;
export type UnifiedPriceFeed = Tables<'unified_price_feeds'>;
export type UnifiedPriceUpdate = Tables<'unified_price_updates'>;
export type UnifiedAssertion = Tables<'unified_assertions'>;
export type UnifiedDispute = Tables<'unified_disputes'>;
export type UnifiedSyncState = Tables<'unified_sync_state'>;
export type UnifiedStatistics = Tables<'unified_statistics'>;
export type CrossOracleComparison = Tables<'cross_oracle_comparisons'>;
export type UnifiedAlertRule = Tables<'unified_alert_rules'>;
export type UnifiedAlert = Tables<'unified_alerts'>;
export type UnifiedConfigTemplate = Tables<'unified_config_templates'>;
export type OracleHealthCheck = Tables<'oracle_health_checks'>;
export type OracleNetworkMetric = Tables<'oracle_network_metrics'>;
export type OracleLiquidity = Tables<'oracle_liquidity'>;

// 常用表类型导出 - 价格历史
export type PriceHistoryRaw = Tables<'price_history_raw'>;
export type PriceHistoryMin1 = Tables<'price_history_min1'>;
export type PriceHistoryMin5 = Tables<'price_history_min5'>;
export type PriceHistoryHour1 = Tables<'price_history_hour1'>;
export type PriceHistoryDay1 = Tables<'price_history_day1'>;

// 常用表类型导出 - Solana
export type SolanaPriceFeed = Tables<'solana_price_feeds'>;
export type SolanaPriceHistory = Tables<'solana_price_histories'>;
export type SolanaOracleInstance = Tables<'solana_oracle_instances'>;
export type SolanaSyncStatus = Tables<'solana_sync_status'>;
export type SolanaAlert = Tables<'solana_alerts'>;

// 常用表类型导出 - 事件
export type EventTimeline = Tables<'event_timeline'>;
export type DeploymentRecord = Tables<'deployment_records'>;
