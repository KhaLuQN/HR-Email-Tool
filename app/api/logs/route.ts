import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const logs = await prisma.sendLog.findMany({
    orderBy: { sentAt: 'desc' },
    take: 200,
  })
  return NextResponse.json({ logs })
}
