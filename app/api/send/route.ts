import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sendEmail, getOrCreateLabel, addLabelToThread } from '@/lib/gmail'
import { prisma } from '@/lib/prisma'

interface SendItem {
  toEmail: string
  toName: string
  subject: string
  body: string
  labelId: string
  threadId: string  // needed to move thread to "replied" label
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const items: SendItem[] = body.items

  if (!items?.length) {
    return NextResponse.json({ error: 'No items to send' }, { status: 400 })
  }

  const accessToken = session.accessToken
  const results = []

  // Get or create the "replied" label once before the loop
  let repliedLabelId: string | null = null
  try {
    repliedLabelId = await getOrCreateLabel(accessToken, 'replied')
  } catch (e) {
    console.error('Could not get/create "replied" label:', e)
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    try {
      await sendEmail(accessToken, item.toEmail, item.subject, item.body)

      // Move thread to "replied" label
      if (repliedLabelId && item.threadId) {
        try {
          await addLabelToThread(accessToken, item.threadId, repliedLabelId)
        } catch (e) {
          console.error('addLabelToThread failed:', e)
        }
      }

      await prisma.sendLog.create({
        data: {
          toEmail: item.toEmail,
          toName: item.toName,
          subject: item.subject,
          labelId: item.labelId,
          status: 'sent',
        },
      })
      results.push({ email: item.toEmail, name: item.toName, status: 'sent' })
    } catch (err: any) {
      const errorMsg = err.message ?? 'Unknown error'
      await prisma.sendLog.create({
        data: {
          toEmail: item.toEmail,
          toName: item.toName,
          subject: item.subject,
          labelId: item.labelId,
          status: 'error',
          errorMsg,
        },
      })
      results.push({ email: item.toEmail, name: item.toName, status: 'error', error: errorMsg })
    }

    // 800ms delay between emails for rate-limit safety
    if (i < items.length - 1) {
      await sleep(800)
    }
  }

  return NextResponse.json({ results })
}
