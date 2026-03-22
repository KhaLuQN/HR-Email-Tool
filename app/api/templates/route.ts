import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const labelId = searchParams.get('labelId')

  if (labelId) {
    const template = await prisma.template.findUnique({ where: { labelId } })
    return NextResponse.json({ template })
  }

  const templates = await prisma.template.findMany({
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ templates })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { labelId, labelName, subject, body: tmplBody } = body

  if (!labelId || !labelName || !subject || !tmplBody) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const template = await prisma.template.upsert({
    where: { labelId },
    update: { labelName, subject, body: tmplBody },
    create: { labelId, labelName, subject, body: tmplBody },
  })

  return NextResponse.json({ template })
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  await prisma.template.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ success: true })
}
