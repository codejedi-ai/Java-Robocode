import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STORAGE_BUCKET = Deno.env.get('STORAGE_BUCKET') || 'profile-pics'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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
    const { error: tableError } = await supabase.rpc('create_table_user_profile_pics')
    if (tableError) {
      console.error('Failed to ensure table exists:', tableError)
    }

    // Get profile picture key from database
    const { data: profilePic, error: queryError } = await supabase
      .from('user_profile_pics')
      .select('profile_pic_key')
      .eq('user_id', user.id)
      .single()

    if (queryError) {
      if (queryError.code === 'PGRST116') {
        // No profile picture found
        return new Response(
          JSON.stringify({ 
            success: true, 
            url: null,
            message: 'No profile picture found'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      throw new Error(`Failed to query profile picture: ${queryError.message}`)
    }

    if (!profilePic?.profile_pic_key) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          url: null,
          message: 'No profile picture found'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get public URL from storage
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(profilePic.profile_pic_key)

    // Add cache busting if requested
    const urlParams = new URL(req.url).searchParams
    const cacheBust = urlParams.get('cacheBust') === 'true'
    const finalUrl = cacheBust 
      ? `${publicUrl}${publicUrl.includes('?') ? '&' : '?'}t=${Date.now()}`
      : publicUrl

    return new Response(
      JSON.stringify({ 
        success: true, 
        url: finalUrl,
        key: profilePic.profile_pic_key
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error getting profile picture:', error)
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

