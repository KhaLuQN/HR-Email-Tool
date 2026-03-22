export interface GmailLabel {
  id: string
  name: string
  type: string
}

export interface Candidate {
  threadId: string
  messageId: string
  fromEmail: string
  fromName: string
  subject: string
  snippet: string
  date: string
}

export interface Template {
  id: number
  labelId: string
  labelName: string
  subject: string
  body: string
  createdAt: string
  updatedAt: string
}

export interface SendLogEntry {
  id: number
  toEmail: string
  toName: string
  subject: string
  labelId: string
  status: string
  errorMsg?: string | null
  sentAt: string
}

export interface CandidateEmail {
  candidate: Candidate
  subject: string
  body: string
  selected: boolean
}

export interface SendResult {
  email: string
  name: string
  status: 'sent' | 'error'
  error?: string
}
