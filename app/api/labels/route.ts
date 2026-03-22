import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getLabels } from '@/lib/gmail'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const labels = await getLabels(session.accessToken)
    return NextResponse.json({ labels })
  } catch (error: any) {
    console.error('Labels error:', error)
    return NextResponse.json(
      { error: error.message ?? 'Failed to fetch labels' },
      { status: 500 }
    )
  }
}
