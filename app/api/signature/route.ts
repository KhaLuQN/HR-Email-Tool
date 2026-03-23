import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
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



export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'signature' } })
    return NextResponse.json({
      signature: setting?.value ?? FALLBACK_SIGNATURE,
      isDefault: !setting,
    })
  } catch {
    return NextResponse.json({ signature: FALLBACK_SIGNATURE, isDefault: true })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { signature } = body as { signature: string }

  if (typeof signature !== 'string') {
    return NextResponse.json({ error: 'signature is required' }, { status: 400 })
  }

  try {
    await prisma.setting.upsert({
      where: { key: 'signature' },
      update: { value: signature },
      create: { key: 'signature', value: signature },
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to save signature' }, { status: 500 })
  }
}
