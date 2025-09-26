import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { code, gameId, seasonId, originalPrice } = await request.json()

    if (!code || !originalPrice) {
      return NextResponse.json({ error: 'Code and original price are required' }, { status: 400 })
    }

    // Find the discount code
    const { data: discountCode, error: codeError } = await supabase
      .from('discount_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single()

    if (codeError || !discountCode) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid discount code' 
      })
    }

    // Check if code is valid for this game/season
    if (discountCode.game_id && discountCode.game_id !== gameId) {
      return NextResponse.json({ 
        success: false, 
        error: 'This discount code is not valid for this game' 
      })
    }

    if (discountCode.season_id && discountCode.season_id !== seasonId) {
      return NextResponse.json({ 
        success: false, 
        error: 'This discount code is not valid for this season' 
      })
    }

    // Check if code has expired
    const now = new Date()
    if (discountCode.valid_until && new Date(discountCode.valid_until) < now) {
      return NextResponse.json({ 
        success: false, 
        error: 'This discount code has expired' 
      })
    }

    // Check if code has reached max uses
    if (discountCode.max_uses && discountCode.used_count >= discountCode.max_uses) {
      return NextResponse.json({ 
        success: false, 
        error: 'This discount code has reached its usage limit' 
      })
    }

    // Calculate discount
    let discountAmount = 0
    if (discountCode.discount_type === 'percentage') {
      discountAmount = (originalPrice * discountCode.discount_value) / 100
    } else if (discountCode.discount_type === 'fixed') {
      discountAmount = discountCode.discount_value
    }

    // Ensure discount doesn't exceed original price
    discountAmount = Math.min(discountAmount, originalPrice)
    const finalPrice = originalPrice - discountAmount

    return NextResponse.json({
      success: true,
      discount: {
        code: discountCode.code,
        type: discountCode.discount_type,
        value: discountCode.discount_value,
        amount: discountAmount,
        finalPrice: finalPrice,
        description: discountCode.description
      }
    })
  } catch (error) {
    console.error('Error validating discount code:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

