import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const results: Record<string, any> = {
      tables: {},
      buckets: {},
      functions: {},
      errors: []
    }

    // ============================================
    // CREATE STORAGE BUCKETS
    // ============================================

    console.log('Creating storage buckets...')

    // Create avatars bucket
    try {
      const { data, error } = await supabase.storage.createBucket('avatars', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      })
      if (error && !error.message.includes('already exists')) {
        results.errors.push(`avatars bucket: ${error.message}`)
      } else {
        results.buckets.avatars = 'created or already exists'
      }
    } catch (error: any) {
      results.errors.push(`avatars bucket: ${error.message}`)
    }

    // Create companion-images bucket
    try {
      const { data, error } = await supabase.storage.createBucket('companion-images', {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
      })
      if (error && !error.message.includes('already exists')) {
        results.errors.push(`companion-images bucket: ${error.message}`)
      } else {
        results.buckets['companion-images'] = 'created or already exists'
      }
    } catch (error: any) {
      results.errors.push(`companion-images bucket: ${error.message}`)
    }

    // Create profile-pics bucket
    try {
      const { data, error } = await supabase.storage.createBucket('profile-pics', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      })
      if (error && !error.message.includes('already exists')) {
        results.errors.push(`profile-pics bucket: ${error.message}`)
      } else {
        results.buckets['profile-pics'] = 'created or already exists'
      }
    } catch (error: any) {
      results.errors.push(`profile-pics bucket: ${error.message}`)
    }

    // Create banners bucket
    try {
      const { data, error } = await supabase.storage.createBucket('banners', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      })
      if (error && !error.message.includes('already exists')) {
        results.errors.push(`banners bucket: ${error.message}`)
      } else {
        results.buckets.banners = 'created or already exists'
      }
    } catch (error: any) {
      results.errors.push(`banners bucket: ${error.message}`)
    }

    // ============================================
    // CREATE DATABASE TABLES
    // ============================================

    console.log('Creating database tables...')

    // Create all tables by calling create_table RPC functions
    // These functions are created by migrations and handle table creation safely
    const tableFunctions = [
      'create_table_user_profiles',
      'create_table_user_preferences',
      'create_table_user_stats',
      'create_table_user_profile_pics',
      'create_table_user_banners',
      'create_table_companions',
      'create_table_swipe_decisions',
      'create_table_matches',
      'create_table_conversations',
      'create_table_messages'
    ]

    for (const funcName of tableFunctions) {
      const tableName = funcName.replace('create_table_', '')
      try {
        const { error } = await supabase.rpc(funcName)
        if (error) {
          // If RPC doesn't exist, that's okay - tables might be created by migrations
          if (error.message.includes('does not exist') || error.message.includes('function')) {
            results.tables[tableName] = 'RPC function not found (may be created by migrations)'
          } else {
            results.errors.push(`${tableName} table: ${error.message}`)
          }
        } else {
          results.tables[tableName] = 'created or already exists'
        }
      } catch (error: any) {
        results.errors.push(`${tableName} table: ${error.message}`)
      }
    }


    // ============================================
    // SET UP STORAGE POLICIES
    // ============================================

    console.log('Setting up storage policies...')

    // Note: Storage policies are typically set up via migrations
    // This function ensures buckets exist, policies are handled by migrations

    // ============================================
    // SUMMARY
    // ============================================

    const success = results.errors.length === 0

    return new Response(
      JSON.stringify({
        success,
        message: success 
          ? 'All tables and buckets initialized successfully' 
          : 'Initialization completed with some errors',
        results,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: success ? 200 : 207 // 207 Multi-Status for partial success
      }
    )

  } catch (error) {
    console.error('Error during initialization:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred during initialization',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

