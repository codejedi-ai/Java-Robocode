import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STORAGE_BUCKET = Deno.env.get('BANNER_BUCKET') || Deno.env.get('STORAGE_BUCKET') || 'banners'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'DELETE') {
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
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    
    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const authHeader = req.headers.get('Authorization')
    
    // Create client with user's auth token
    const userSupabase = createClient(supabaseUrl, anonKey, {
      global: {
        headers: { Authorization: authHeader ?? '' },
      },
    })

    // Get user from auth token
    const { data: { user }, error: authError } = await userSupabase.auth.getUser()
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Ensure table exists
    const { error: tableError } = await supabase.rpc('create_table_user_banners')
    if (tableError) {
      console.error('Failed to ensure table exists:', tableError)
    }

    // Get the banner_key from the table
    const { data: banner, error: fetchError } = await supabase
      .from('user_banners')
      .select('banner_key')
      .eq('user_id', user.id)
      .single()

    if (fetchError || !banner?.banner_key) {
      // No banner to delete
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No banner to delete'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Delete from storage using userSupabase to respect auth.uid() policies
    const { error: storageError } = await userSupabase.storage
      .from(STORAGE_BUCKET)
      .remove([banner.banner_key])

    if (storageError) {
      throw new Error(`Failed to delete banner from storage: ${storageError.message}`)
    }

    // Remove the record from user_banners table
    const { error: tableDeleteError } = await supabase
      .from('user_banners')
      .delete()
      .eq('user_id', user.id)

    if (tableDeleteError) {
      console.error('Failed to delete banner record:', tableDeleteError)
      // Don't throw here since the file is already deleted
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Banner deleted successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error deleting banner:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

