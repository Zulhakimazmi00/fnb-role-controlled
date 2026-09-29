import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

const allowedRoles = [
  'MANAGEMENT',
  'HQ_ADMIN',
  'HQ_MAINTENANCE',
  'FINANCE',
  'CONTRACTOR',
  'BRANCH_USER',
]

export async function POST(request: Request) {
  try {
    /*
     * Verify the currently logged-in user.
     */
    const supabase = await createServerClient()

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()

    if (!currentUser) {
      return NextResponse.json(
        {
          error: 'Authentication required.',
        },
        { status: 401 }
      )
    }

    /*
     * Verify HQ_ADMIN from the database.
     */
    const { data: currentProfile, error: profileError } =
      await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', currentUser.id)
        .maybeSingle()

    if (
      profileError ||
      !currentProfile ||
      currentProfile.role !== 'HQ_ADMIN' ||
      !currentProfile.is_active
    ) {
      return NextResponse.json(
        {
          error: 'You do not have permission to create users.',
        },
        { status: 403 }
      )
    }

    const body = await request.json()

    const {
      email,
      password,
      full_name,
      role,
      phone,
      branch_id,
      contractor_id,
      is_active,
    } = body

    /*
     * Basic validation.
     */
    if (
      !email ||
      !password ||
      !full_name ||
      !role
    ) {
      return NextResponse.json(
        {
          error:
            'Email, password, full name and role are required.',
        },
        { status: 400 }
      )
    }

    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        {
          error: 'Invalid user role.',
        },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          error:
            'Password must contain at least 8 characters.',
        },
        { status: 400 }
      )
    }

    /*
     * Create the authentication account.
     */
    const {
      data: authData,
      error: authError,
    } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        {
          error:
            authError?.message ||
            'Unable to create authentication account.',
        },
        { status: 400 }
      )
    }

    const newUserId = authData.user.id

    /*
     * Create the corresponding profile.
     */
    const { error: insertError } = await adminSupabase
         .from('profiles')
         .insert({
          id: newUserId,
           full_name,
           email,
          role,
          phone: phone || null,
         branch_id: branch_id || null,
         contractor_id: contractor_id || null,
           is_active:
            typeof is_active === 'boolean'
             ? is_active
               : true,
         })
    /*
     * If profile creation fails, remove the Auth account
     * so we don't leave an orphaned authentication user.
     */
    if (insertError) {
      await adminSupabase.auth.admin.deleteUser(
        newUserId
      )

      return NextResponse.json(
        {
          error:
            'User account could not be completed: ' +
            insertError.message,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: newUserId,
          email,
          full_name,
          role,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error(
      'Create user error:',
      error
    )

    return NextResponse.json(
      {
        error: 'Unexpected server error.',
      },
      { status: 500 }
    )
  }
}
