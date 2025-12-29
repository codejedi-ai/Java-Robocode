import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const STORAGE_BUCKET = Deno.env.get('STORAGE_BUCKET') || 'profile-pics'

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

    // Parse form data
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return new Response(
        JSON.stringify({ error: 'File must be an image' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: 'File size must be less than 5MB' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Delete old profile picture if exists
    const { data: existingPic } = await supabase
      .from('user_profile_pics')
      .select('profile_pic_key')
      .eq('user_id', user.id)
      .single()

    if (existingPic?.profile_pic_key) {
      try {
        // Use userSupabase for storage operations to respect auth.uid() policies
        await userSupabase.storage
          .from(STORAGE_BUCKET)
          .remove([existingPic.profile_pic_key])
      } catch (error) {
        console.warn('Failed to delete old profile picture:', error)
      }
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `${user.id}/${fileName}`

    // Convert File to ArrayBuffer for upload
    const fileBuffer = await file.arrayBuffer()

    // Upload to storage bucket using userSupabase to respect auth.uid() policies
    const { error: uploadError } = await userSupabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, fileBuffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      })

    if (uploadError) {
      throw new Error(`Failed to upload profile picture: ${uploadError.message}`)
    }

    // Update user_profile_pics table with the profile_pic_key (use service role for DB operations)
    const { error: tableUpdateError } = await supabase
      .from('user_profile_pics')
      .upsert({
        user_id: user.id,
        profile_pic_key: filePath
      }, {
        onConflict: 'user_id'
      })

    if (tableUpdateError) {
      // Try to clean up uploaded file using userSupabase
      await userSupabase.storage.from(STORAGE_BUCKET).remove([filePath])
      throw new Error(`Failed to update profile picture record: ${tableUpdateError.message}`)
    }

    // Get public URL (can use either client for public URLs)
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath)

    return new Response(
      JSON.stringify({ 
        success: true, 
        url: publicUrl,
        key: filePath
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error uploading profile picture:', error)
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

