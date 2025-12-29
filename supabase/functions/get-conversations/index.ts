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

    // Ensure tables exist
    await supabase.rpc('create_table_conversations').catch(() => {})
    await supabase.rpc('create_table_messages').catch(() => {})

    const url = new URL(req.url)
    const conversationId = url.searchParams.get('id')
    const getMessages = url.searchParams.get('messages') === 'true'
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    if (conversationId) {
      // Get single conversation
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          companion:companions(*)
        `)
        .eq('id', conversationId)
        .eq('user_id', user.id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return new Response(
            JSON.stringify({ success: true, data: null }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        throw new Error(`Failed to fetch conversation: ${error.message}`)
      }

      // Get messages if requested
      if (getMessages && data) {
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (!messagesError) {
          return new Response(
            JSON.stringify({ 
              success: true, 
              data: { ...data, messages: (messages || []).reverse() }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // Get all conversations
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          companion:companions(*),
          messages!inner(
            id,
            content,
            message_type,
            is_read,
            created_at,
            sender_id,
            companion_id
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('last_message_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch conversations: ${error.message}`)
      }

      const conversations = (data || []).map((conv: any) => ({
        ...conv,
        last_message: conv.messages?.[0] || null,
      }))

      return new Response(
        JSON.stringify({ success: true, data: conversations }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error('Error getting conversations:', error)
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

