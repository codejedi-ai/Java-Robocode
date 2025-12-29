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
    const { error: tableError } = await supabase.rpc('create_table_user_profile_pics')
    if (tableError) {
      console.error('Failed to ensure table exists:', tableError)
    }

    // Get the profile_pic_key from the table
    const { data: profilePic, error: fetchError } = await supabase
      .from('user_profile_pics')
      .select('profile_pic_key')
      .eq('user_id', user.id)
      .single()

    if (fetchError || !profilePic?.profile_pic_key) {
      // No profile picture to delete
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No profile picture to delete'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Delete from storage using userSupabase to respect auth.uid() policies
    const { error: storageError } = await userSupabase.storage
      .from(STORAGE_BUCKET)
      .remove([profilePic.profile_pic_key])

    if (storageError) {
      throw new Error(`Failed to delete profile picture from storage: ${storageError.message}`)
    }

    // Remove the record from user_profile_pics table
    const { error: tableDeleteError } = await supabase
      .from('user_profile_pics')
      .delete()
      .eq('user_id', user.id)

    if (tableDeleteError) {
      console.error('Failed to delete profile picture record:', tableDeleteError)
      // Don't throw here since the file is already deleted
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Profile picture deleted successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error deleting profile picture:', error)
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

