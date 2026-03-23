import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sendEmail, getOrCreateLabel, addLabelToThread, removeLabelFromThread } from '@/lib/gmail'
import { prisma } from '@/lib/prisma'

const FALLBACK_SIGNATURE = `<div style="font-family:Arial,sans-serif;font-size:13px;color:#333">
  <table cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="padding-right:14px;vertical-align:middle">
        <img src="https://i.imgur.com/mau8egI.jpeg"
             width="90" alt="Leadsmax" style="display:block"/>
      </td>
      <td style="border-left:2px solid #e5400a;padding-left:14px;vertical-align:middle">
        <div style="font-weight:700;color:#1a1a1a;font-size:14px">Human Resources</div>
        <div style="color:#555;margin-top:3px">(+84) 372 571 498</div>
        <div><a href="https://leadsmaxgroup.com" style="color:#e5400a;text-decoration:none">leadsmaxgroup.com</a></div>
        <div style="color:#888;font-size:12px;margin-top:2px">84 Ho Tung Mau, Hoa Minh, Lien Chieu, Da Nang, Vietnam</div>
      </td>
    </tr>
  </table>
</div>`

interface SendItem {
  toEmail: string
  toName: string
  subject: string
  body: string
  labelId: string
  threadId: string
  useSignature: boolean
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

  // Fetch signature from DB once for entire batch
  let signature = FALLBACK_SIGNATURE
  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'signature' } })
    if (setting?.value) signature = setting.value
  } catch (e) {
    console.error('Could not fetch signature from DB:', e)
  }

  const DIVIDER = `<div style="border-top:1px solid #e5e7eb;margin:20px 0 16px"></div>`

  // Get or create the "replied" label once before the loop
  let repliedLabelId: string | null = null
  try {
    repliedLabelId = await getOrCreateLabel(accessToken, 'replied')
  } catch (e) {
    console.error('Could not get/create "replied" label:', e)
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    // Conditionally inject signature based on per-item flag
    const finalBody = item.useSignature
      ? item.body + DIVIDER + signature
      : item.body
    try {
      await sendEmail(accessToken, item.toEmail, item.subject, finalBody)

      // Move thread: add "replied" label AND remove original label
      if (repliedLabelId && item.threadId) {
        try {
          await addLabelToThread(accessToken, item.threadId, repliedLabelId)
          if (item.labelId && item.labelId !== repliedLabelId) {
            await removeLabelFromThread(accessToken, item.threadId, item.labelId)
          }
        } catch (e) {
          console.error('Label modify failed:', e)
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
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
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
