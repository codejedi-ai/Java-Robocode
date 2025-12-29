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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    
    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const authHeader = req.headers.get('Authorization')
    
    const userSupabase = createClient(supabaseUrl, anonKey, {
      global: {
        headers: { Authorization: authHeader ?? '' },
      },
    })

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
    await supabase.rpc('create_table_matches').catch(() => {})

    const url = new URL(req.url)
    const matchId = url.searchParams.get('id')
    const withDetails = url.searchParams.get('details') === 'true'

    if (matchId) {
      // Get single match
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          companion:companions(*)
        `)
        .eq('id', matchId)
        .eq('user_id', user.id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return new Response(
            JSON.stringify({ success: true, data: null }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        throw new Error(`Failed to fetch match: ${error.message}`)
      }

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // Get all matches
      if (withDetails) {
        // Use database function for better performance
        const { data, error } = await supabase.rpc('get_user_matches_with_details', {
          p_user_id: user.id,
        })

        if (error) {
          throw new Error(`Failed to fetch matches with details: ${error.message}`)
        }

        // Transform the data
        const matches = (data || []).map((row: any) => ({
          match_id: row.match_id,
          matched_at: row.matched_at,
          companion: {
            id: row.companion_id,
            name: row.companion_name,
            age: row.companion_age,
            bio: row.companion_bio,
            image_url: row.companion_image_url,
            personality: row.companion_personality,
            interests: row.companion_interests || [],
            compatibility_score: row.companion_compatibility_score,
          },
          conversation_id: row.conversation_id || undefined,
          last_message: row.last_message_content
            ? {
                content: row.last_message_content,
                created_at: row.last_message_created_at,
                sender_id: row.last_message_sender_id || undefined,
              }
            : undefined,
          unread_count: Number(row.unread_count) || 0,
        }))

        return new Response(
          JSON.stringify({ success: true, data: matches }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        const { data, error } = await supabase
          .from('matches')
          .select(`
            *,
            companion:companions(*)
          `)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('matched_at', { ascending: false })

        if (error) {
          throw new Error(`Failed to fetch matches: ${error.message}`)
        }

        return new Response(
          JSON.stringify({ success: true, data: data || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }
  } catch (error) {
    console.error('Error getting matches:', error)
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

