import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCandidatesByLabel } from '@/lib/gmail'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const labelId = searchParams.get('labelId')

  if (!labelId) {
    return NextResponse.json({ error: 'labelId is required' }, { status: 400 })
  }

  try {
    const candidates = await getCandidatesByLabel(session.accessToken, labelId)
    return NextResponse.json({ candidates })
  } catch (error: any) {
    console.error('Emails error:', error)
    return NextResponse.json(
      { error: error.message ?? 'Failed to fetch emails' },
      { status: 500 }
    )
  }
}
