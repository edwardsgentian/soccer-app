import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Fallback values in case env vars aren't loaded
const FALLBACK_URL = 'https://xrhjexjgjhdgxzumngpj.supabase.co'
const FALLBACK_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyaGpleGpnamhkZ3h6dW1uZ3BqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQ2MTA3MCwiZXhwIjoyMDc0MDM3MDcwfQ.au7AAVNWssM59PPV934Z96DRiYiJ2orJAXlSe3gZ4xo'

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.trim()) || FALLBACK_URL
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY.trim()) || FALLBACK_SERVICE_KEY

export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase credentials')
      return NextResponse.json(
        { error: 'Server configuration error: Missing Supabase credentials' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { groupId, playerId, updates } = body

    // Create service role client to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Verify the player is the creator
    const { data: group, error: fetchError } = await supabase
      .from('groups')
      .select('created_by')
      .eq('id', groupId)
      .single()

    if (fetchError || !group) {
      console.error('Group not found or error:', fetchError)
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      )
    }

    if (group.created_by !== playerId) {
      return NextResponse.json(
        { error: 'Unauthorized: Only the group creator can update this group' },
        { status: 403 }
      )
    }

    // Update the group
    const { data, error } = await supabase
      .from('groups')
      .update(updates)
      .eq('id', groupId)
      .select()
      .single()

    if (error) {
      console.error('Error updating group:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('API error:', err)
    console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace')
    console.error('Error details:', JSON.stringify(err, null, 2))
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

