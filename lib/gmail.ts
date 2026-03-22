import { google } from 'googleapis'
import type { Candidate, GmailLabel } from '@/types'

export function getGmailClient(accessToken: string) {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  return google.gmail({ version: 'v1', auth })
}

/** Get ONLY user-created Gmail labels (excludes INBOX, SENT, DRAFT, TRASH, etc.) */
export async function getLabels(accessToken: string): Promise<GmailLabel[]> {
  const gmail = getGmailClient(accessToken)
  const res = await gmail.users.labels.list({ userId: 'me' })
  const labels = res.data.labels ?? []
  // Only return user-created labels — skip all system labels
  return labels
    .filter((l) => l.type === 'user')
    .map((l) => ({
      id: l.id ?? '',
      name: l.name ?? '',
      type: 'user',
    }))
}

/**
 * Find a label by name or create it if it doesn't exist.
 * Returns the label ID.
 */
export async function getOrCreateLabel(
  accessToken: string,
  labelName: string
): Promise<string> {
  const gmail = getGmailClient(accessToken)
  const res = await gmail.users.labels.list({ userId: 'me' })
  const labels = res.data.labels ?? []

  const existing = labels.find(
    (l) => l.name?.toLowerCase() === labelName.toLowerCase()
  )
  if (existing?.id) return existing.id

  // Create the label
  const created = await gmail.users.labels.create({
    userId: 'me',
    requestBody: {
      name: labelName,
      labelListVisibility: 'labelShow',
      messageListVisibility: 'show',
    },
  })
  return created.data.id!
}

/**
 * Add a label to a Gmail thread (e.g. mark as "replied").
 */
export async function addLabelToThread(
  accessToken: string,
  threadId: string,
  labelId: string
): Promise<void> {
  const gmail = getGmailClient(accessToken)
  await gmail.users.threads.modify({
    userId: 'me',
    id: threadId,
    requestBody: {
      addLabelIds: [labelId],
    },
  })
}

/** Parse "Name <email>" or plain email */
function parseFrom(from: string): { name: string; email: string } {
  const match = from.match(/^"?([^"<]*)"?\s*<([^>]+)>$/)
  if (match) {
    return { name: match[1].trim() || match[2], email: match[2].trim() }
  }
  return { name: from, email: from }
}

/** Get all email threads with a given label, return as candidates */
export async function getCandidatesByLabel(
  accessToken: string,
  labelId: string
): Promise<Candidate[]> {
  const gmail = getGmailClient(accessToken)

  // List threads with label
  const threadRes = await gmail.users.threads.list({
    userId: 'me',
    labelIds: [labelId],
    maxResults: 100,
  })

  const threads = threadRes.data.threads ?? []
  const candidates: Candidate[] = []

  for (const thread of threads) {
    try {
      const threadData = await gmail.users.threads.get({
        userId: 'me',
        id: thread.id!,
        format: 'metadata',
        metadataHeaders: ['From', 'Subject', 'Date'],
      })

      const messages = threadData.data.messages ?? []
      if (!messages.length) continue

      // Use the first message (the original candidate email)
      const msg = messages[0]
      const headers = msg.payload?.headers ?? []

      const getHeader = (name: string) =>
        headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())
          ?.value ?? ''

      const fromRaw = getHeader('From')
      const subject = getHeader('Subject')
      const date = getHeader('Date')
      const { name, email } = parseFrom(fromRaw)

      candidates.push({
        threadId: thread.id!,
        messageId: msg.id!,
        fromEmail: email,
        fromName: name,
        subject,
        snippet: threadData.data.snippet ?? '',
        date,
      })
    } catch {
      // skip threads we can't read
    }
  }

  return candidates
}

/** Send an email via Gmail API using base64-encoded RFC 2822 message */
export async function sendEmail(
  accessToken: string,
  to: string,
  subject: string,
  htmlBody: string
): Promise<void> {
  const gmail = getGmailClient(accessToken)

  const message = [
    `To: ${to}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    '',
    htmlBody,
  ].join('\r\n')

  const encoded = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encoded },
  })
}
