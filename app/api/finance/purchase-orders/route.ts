import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: profile, error: profileError } =
      await supabase
        .from('profiles')
        .select('full_name, role, is_active')
        .eq('id', user.id)
        .maybeSingle()

    if (
      profileError ||
      !profile ||
      !profile.is_active ||
      !['FINANCE', 'HQ_ADMIN'].includes(profile.role)
    ) {
      return NextResponse.json(
        { error: 'Access denied.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const quotationId = body?.quotationId

    if (!quotationId) {
      return NextResponse.json(
        { error: 'Quotation ID is required.' },
        { status: 400 }
      )
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json(
        { error: 'Supabase URL is not configured.' },
        { status: 500 }
      )
    }

    if (!process.env.SUPABASE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Supabase secret key is not configured.' },
        { status: 500 }
      )
    }

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const { data: quotation, error: quotationError } =
      await adminSupabase
        .from('quotations')
        .select(`
          id,
          quotation_number,
          job_id,
          subtotal,
          sst_amount,
          total_amount,
          status,
          maintenance_jobs (
            id,
            job_number,
            branch_id,
            contractor_id,
            category,
            problem_description
          )
        `)
        .eq('id', quotationId)
        .maybeSingle()

    if (quotationError || !quotation) {
      return NextResponse.json(
        {
          error:
            quotationError?.message ||
            'Quotation not found.',
        },
        { status: 404 }
      )
    }

    if (quotation.status !== 'APPROVED') {
      return NextResponse.json(
        {
          error:
            'Only approved quotations can be converted into a purchase order.',
        },
        { status: 400 }
      )
    }

    const { data: existingPO, error: existingPOError } =
      await adminSupabase
        .from('purchase_orders')
        .select('id, po_number')
        .eq('quotation_id', quotation.id)
        .maybeSingle()

    if (existingPOError) {
      return NextResponse.json(
        {
          error: existingPOError.message,
        },
        { status: 500 }
      )
    }

    if (existingPO) {
      return NextResponse.json(
        {
          error: `A purchase order already exists for this quotation: ${existingPO.po_number}`,
          poId: existingPO.id,
        },
        { status: 409 }
      )
    }

    const year = new Date().getFullYear().toString()

    const { count } = await adminSupabase
      .from('purchase_orders')
      .select('*', {
        count: 'exact',
        head: true,
      })

    const sequence = (count || 0) + 1

    const poNumber =
      `PO-${year}-${sequence
        .toString()
        .padStart(5, '0')}`

    const job = Array.isArray(quotation.maintenance_jobs)
      ? quotation.maintenance_jobs[0]
      : quotation.maintenance_jobs

    const { data: newPO, error: poError } =
      await adminSupabase
        .from('purchase_orders')
        .insert({
          po_number: poNumber,
          quotation_id: quotation.id,
          job_id: quotation.job_id,
          contractor_id: job?.contractor_id || null,
          branch_id: job?.branch_id || null,
          po_date: new Date()
            .toISOString()
            .slice(0, 10),
          description:
            job?.problem_description ||
            `Maintenance works for ${job?.job_number || 'maintenance job'}`,
          subtotal: quotation.subtotal,
          sst_amount: quotation.sst_amount,
          total_amount: quotation.total_amount,
          status: 'DRAFT',
          requested_by: profile.full_name,
        })
        .select('id, po_number')
        .single()

    if (poError || !newPO) {
      return NextResponse.json(
        {
          error:
            poError?.message ||
            'Failed to create purchase order.',
        },
        { status: 500 }
      )
    }

    await adminSupabase
      .from('job_updates')
      .insert({
        job_id: quotation.job_id,
        update_type: 'PURCHASE_ORDER_CREATED',
        old_status: null,
        new_status: 'PO CREATED',
        remarks:
          `Purchase Order ${newPO.po_number} created from approved quotation ${
            quotation.quotation_number || quotation.id
          }.`,
        updated_by: profile.full_name,
      })

    return NextResponse.json({
      success: true,
      poId: newPO.id,
      poNumber: newPO.po_number,
    })
  } catch (error) {
    console.error('Purchase order creation error:', error)

    return NextResponse.json(
      {
        error:
          'Unexpected error while creating purchase order.',
      },
      { status: 500 }
    )
  }
}
