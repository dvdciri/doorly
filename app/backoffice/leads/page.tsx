'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navigation from '../../components/Navigation'
import Footer from '../../components/Footer'
import {
  LogOut,
  ArrowLeft,
  Loader2,
  MessageCircle,
  X,
  Send,
  ExternalLink,
  Check,
  CheckCheck,
  AlertCircle,
  Play,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { validateUKPhone, formatUKPhone } from '@/lib/phone'
import { formatUKDateTime, getInitials } from '@/lib/datetime'

interface Lead {
  id: string
  name: string
  stage: string | null
  phone: string | null
  leadSource: string | null
  addedDate: string | null
  propertyCount: string | null
  extraInformation: string | null
  url: string
  unreadCount?: number
}

interface PipelineColumn {
  stage: string
  leads: Lead[]
}

interface NotionComment {
  id: string
  text: string
  createdTime: string
  createdBy: string | null
}

interface WelcomeMessageJob {
  id: number
  notionPageId: string
  status: 'pending' | 'sent' | 'skipped' | 'failed'
  runAt: string
  sentAt: string | null
  error: string | null
  previewBody: string | null
}

interface ChatMessage {
  id: number
  direction: 'inbound' | 'outbound'
  body: string
  timestamp: string
  status?: string | null
  statusAt?: string | null
  statusError?: string | null
  messageType?: 'text' | 'image' | 'video' | 'audio'
  mediaMimeType?: string | null
  hasMedia?: boolean
}

interface ChatContact {
  phone: string
  waProfileName: string | null
}

function encodePhoneForUrl(phone: string): string {
  return encodeURIComponent(phone)
}

function getWelcomeMessageStatusLabel(job: WelcomeMessageJob): string {
  switch (job.status) {
    case 'pending':
      return `Scheduled for ${formatUKDateTime(job.runAt)}`
    case 'sent':
      return job.sentAt ? `Sent at ${formatUKDateTime(job.sentAt)}` : 'Sent'
    case 'skipped':
      return job.error ? `Skipped: ${job.error}` : 'Skipped'
    case 'failed':
      return job.error ? `Failed: ${job.error}` : 'Failed to send'
    default:
      return job.status
  }
}

function sortChatMessages(messages: ChatMessage[]): ChatMessage[] {
  return [...messages].sort((a, b) => {
    const timeDiff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    if (timeDiff !== 0) return timeDiff
    return a.id - b.id
  })
}

function isNearChatBottom(el: HTMLElement, threshold = 80): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold
}

function isMediaPlaceholder(body: string): boolean {
  return /^\[(Image|Video|Audio)\]$/.test(body)
}

const MEDIA_THUMBNAIL_CLASS =
  'w-[220px] h-[220px] max-w-full object-cover rounded-lg bg-navy-900/50'

function MediaLightbox({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean
  onClose: () => void
  label: string
  children: React.ReactNode
}) {
  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>
      <div onClick={(event) => event.stopPropagation()}>{children}</div>
    </div>
  )
}

function ChatImagePreview({ src }: { src: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block max-w-full overflow-hidden rounded-lg"
        aria-label="Open image"
      >
        <img
          src={src}
          alt=""
          className={MEDIA_THUMBNAIL_CLASS}
          loading="lazy"
        />
      </button>
      <MediaLightbox open={open} onClose={() => setOpen(false)} label="Image preview">
        <img
          src={src}
          alt=""
          className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
        />
      </MediaLightbox>
    </>
  )
}

function ChatVideoPreview({ src }: { src: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative block max-w-full overflow-hidden rounded-lg"
        aria-label="Open video"
      >
        <video
          src={src}
          muted
          preload="metadata"
          className={MEDIA_THUMBNAIL_CLASS}
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
          <span className="flex items-center justify-center w-12 h-12 rounded-full bg-black/50 text-white">
            <Play className="w-6 h-6 ml-0.5" fill="currentColor" />
          </span>
        </span>
      </button>
      <MediaLightbox open={open} onClose={() => setOpen(false)} label="Video preview">
        <video
          src={src}
          controls
          autoPlay
          className="max-w-[90vw] max-h-[90vh] rounded-lg"
        />
      </MediaLightbox>
    </>
  )
}

function ChatMessageContent({ msg }: { msg: ChatMessage }) {
  const messageType = msg.messageType || 'text'
  const mediaUrl = `/api/backoffice/chat/media/${msg.id}`
  const showCaption =
    messageType !== 'text' && msg.body && !isMediaPlaceholder(msg.body)

  if (messageType === 'image' && msg.hasMedia) {
    return (
      <>
        <ChatImagePreview src={mediaUrl} />
        {showCaption && <p className="mt-2 whitespace-pre-wrap">{msg.body}</p>}
      </>
    )
  }

  if (messageType === 'video' && msg.hasMedia) {
    return (
      <>
        <ChatVideoPreview src={mediaUrl} />
        {showCaption && <p className="mt-2 whitespace-pre-wrap">{msg.body}</p>}
      </>
    )
  }

  if (messageType === 'audio' && msg.hasMedia) {
    return (
      <>
        <audio src={mediaUrl} controls className="w-full min-w-[220px]" preload="metadata" />
        {showCaption && <p className="mt-2 whitespace-pre-wrap">{msg.body}</p>}
      </>
    )
  }

  if (messageType !== 'text' && msg.hasMedia) {
    return <p className="whitespace-pre-wrap">{msg.body || `[${messageType}]`}</p>
  }

  return <p className="whitespace-pre-wrap">{msg.body}</p>
}

function MessageStatusReceipt({
  status,
  statusError,
}: {
  status?: string | null
  statusError?: string | null
}) {
  const [showError, setShowError] = useState(false)

  if (!status) return null

  if (status === 'read') {
    return (
      <span className="inline-flex items-center gap-0.5 text-sky-300" title="Read">
        <CheckCheck className="w-3.5 h-3.5" />
      </span>
    )
  }
  if (status === 'delivered') {
    return (
      <span className="inline-flex items-center gap-0.5 opacity-70" title="Delivered">
        <CheckCheck className="w-3.5 h-3.5" />
      </span>
    )
  }
  if (status === 'sent') {
    return (
      <span className="inline-flex items-center gap-0.5 opacity-70" title="Sent">
        <Check className="w-3.5 h-3.5" />
      </span>
    )
  }
  if (status === 'failed') {
    const errorText =
      statusError ||
      'No error details stored. Check the server terminal for logs prefixed with [WhatsApp].'
    return (
      <span className="relative inline-flex items-center">
        <button
          type="button"
          onClick={() => setShowError((open) => !open)}
          className="inline-flex items-center gap-0.5 text-red-300 hover:text-red-200 transition-colors"
          title="Click to view failure reason"
          aria-label="View send failure reason"
          aria-expanded={showError}
        >
          <AlertCircle className="w-3.5 h-3.5" />
        </button>
        {showError && (
          <div
            role="tooltip"
            className="absolute bottom-full right-0 z-20 mb-2 w-64 max-w-[70vw] rounded-lg border border-red-500/30 bg-navy-900 px-3 py-2 text-left text-xs text-red-100 shadow-lg"
          >
            <p className="font-medium text-red-300 mb-1">Send failed</p>
            <p className="whitespace-pre-wrap break-words">{errorText}</p>
          </div>
        )}
      </span>
    )
  }
  return null
}

export default function LeadsPipelinePage() {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [columns, setColumns] = useState<PipelineColumn[]>([])
  const [stages, setStages] = useState<string[]>([])
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [comments, setComments] = useState<NotionComment[]>([])
  const [welcomeMessage, setWelcomeMessage] = useState<WelcomeMessageJob | null>(null)
  const [commentsError, setCommentsError] = useState<string | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatContact, setChatContact] = useState<ChatContact | null>(null)
  const [chatLoading, setChatLoading] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [messageSending, setMessageSending] = useState(false)
  const [stageSaving, setStageSaving] = useState(false)
  const [stageError, setStageError] = useState<string | null>(null)
  const [deleteConfirming, setDeleteConfirming] = useState(false)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null)
  const [commentDeleteError, setCommentDeleteError] = useState<string | null>(null)
  const [welcomeMessageRetrying, setWelcomeMessageRetrying] = useState(false)
  const [welcomeMessageRetryError, setWelcomeMessageRetryError] = useState<string | null>(null)
  const chatScrollRef = useRef<HTMLDivElement>(null)
  const scrollSmoothOnNextRef = useRef(false)
  const isAtBottomRef = useRef(true)

  const canChat = selectedLead?.phone ? validateUKPhone(selectedLead.phone) : false

  const fetchPipeline = useCallback(async () => {
    try {
      const leadsRes = await fetch('/api/backoffice/leads')

      if (!leadsRes.ok) {
        const data = await leadsRes.json()
        throw new Error(data.error || 'Failed to load leads')
      }

      const leadsData = await leadsRes.json()
      setColumns(leadsData.columns || [])
      setStages(leadsData.stages || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pipeline')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchLeadDetail = useCallback(async (pageId: string) => {
    setDetailLoading(true)
    setDetailError(null)
    setWelcomeMessageRetryError(null)
    try {
      const response = await fetch(`/api/backoffice/leads/${pageId}`)
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to load lead')
      }
      const data = await response.json()
      setSelectedLead(data.lead)
      setComments(data.comments || [])
      setCommentsError(data.commentsError || null)
      setWelcomeMessage(data.welcomeMessage || null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load lead'
      setDetailError(message)
      console.error(err)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const fetchChat = useCallback(async (
    phone: string,
    options?: { silent?: boolean; refreshPipeline?: boolean }
  ) => {
    if (!options?.silent) {
      setChatLoading(true)
    }
    try {
      const response = await fetch(`/api/backoffice/chat/${encodePhoneForUrl(phone)}`)
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to load chat')
      }
      const data = await response.json()
      setChatContact(data.contact || null)
      setChatMessages(sortChatMessages(data.messages || []))

      await fetch(`/api/backoffice/chat/${encodePhoneForUrl(phone)}/read`, {
        method: 'POST',
      })
      if (options?.refreshPipeline !== false) {
        fetchPipeline()
      }
    } catch (err) {
      console.error(err)
    } finally {
      if (!options?.silent) {
        setChatLoading(false)
      }
    }
  }, [fetchPipeline])

  useEffect(() => {
    if (!selectedLeadId) {
      setSelectedLead(null)
      setComments([])
      setChatMessages([])
      setChatContact(null)
      return
    }
    fetchLeadDetail(selectedLeadId)
  }, [selectedLeadId, fetchLeadDetail])

  useEffect(() => {
    const phone = selectedLead?.phone
    const chatOpen = Boolean(phone && canChat)
    const pollIntervalMs = chatOpen ? 3000 : 5000

    const tick = async () => {
      await fetchPipeline()
      if (chatOpen && phone) {
        await fetchChat(phone, { silent: true, refreshPipeline: false })
      }
    }

    tick()
    const id = setInterval(tick, pollIntervalMs)
    return () => clearInterval(id)
  }, [selectedLead?.phone, canChat, fetchPipeline, fetchChat])

  const scrollChatToBottom = useCallback((smooth = false) => {
    const el = chatScrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
    isAtBottomRef.current = true
  }, [])

  const handleChatScroll = useCallback(() => {
    const el = chatScrollRef.current
    if (!el) return
    isAtBottomRef.current = isNearChatBottom(el)
  }, [])

  useEffect(() => {
    isAtBottomRef.current = true
  }, [selectedLead?.phone])

  useEffect(() => {
    const smooth = scrollSmoothOnNextRef.current
    const forceScroll = scrollSmoothOnNextRef.current
    scrollSmoothOnNextRef.current = false

    if (!forceScroll && !isAtBottomRef.current) {
      return
    }

    requestAnimationFrame(() => {
      scrollChatToBottom(smooth)
    })
  }, [chatMessages, scrollChatToBottom])

  const closeLead = useCallback(() => {
    setSelectedLeadId(null)
    setSelectedLead(null)
    setDetailError(null)
    setChatContact(null)
    setChatMessages([])
    setStageError(null)
    setDeleteConfirming(false)
    setDeleteError(null)
    setCommentDeleteError(null)
    setWelcomeMessage(null)
  }, [])

  useEffect(() => {
    if (!selectedLeadId) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLead()
    }

    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [selectedLeadId, closeLead])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const response = await fetch('/api/backoffice/logout', { method: 'POST' })
      if (response.ok) {
        router.push('/backoffice/login')
      }
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const openLead = (lead: Lead) => {
    setSelectedLead(lead)
    setDetailError(null)
    setStageError(null)
    setDeleteConfirming(false)
    setDeleteError(null)
    setCommentDeleteError(null)
    setSelectedLeadId(lead.id)
  }

  const handleStageChange = async (newStage: string) => {
    if (!selectedLeadId || !selectedLead || newStage === selectedLead.stage) return

    const previousStage = selectedLead.stage
    setStageSaving(true)
    setStageError(null)
    setSelectedLead({ ...selectedLead, stage: newStage })

    try {
      const response = await fetch(`/api/backoffice/leads/${selectedLeadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update stage')
      }
      const data = await response.json()
      setSelectedLead(data.lead)
      await fetchPipeline()
    } catch (err) {
      setSelectedLead((prev) => (prev ? { ...prev, stage: previousStage } : prev))
      setStageError(err instanceof Error ? err.message : 'Failed to update stage')
    } finally {
      setStageSaving(false)
    }
  }

  const handleDeleteLead = async () => {
    if (!selectedLeadId) return

    setDeleteSubmitting(true)
    setDeleteError(null)
    try {
      const response = await fetch(`/api/backoffice/leads/${selectedLeadId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete lead')
      }
      closeLead()
      await fetchPipeline()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete lead')
      setDeleteConfirming(false)
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!selectedLeadId) return

    setDeletingCommentId(commentId)
    setCommentDeleteError(null)
    try {
      const response = await fetch(
        `/api/backoffice/leads/${selectedLeadId}/comments/${commentId}`,
        { method: 'DELETE' }
      )
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete comment')
      }
      setComments((prev) => prev.filter((c) => c.id !== commentId))
    } catch (err) {
      setCommentDeleteError(
        err instanceof Error ? err.message : 'Failed to delete comment'
      )
    } finally {
      setDeletingCommentId(null)
    }
  }

  const handleRetryWelcomeMessage = async () => {
    if (!selectedLeadId) return

    setWelcomeMessageRetrying(true)
    setWelcomeMessageRetryError(null)
    try {
      const response = await fetch(
        `/api/backoffice/leads/${selectedLeadId}/welcome-message`,
        { method: 'POST' }
      )
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend welcome message')
      }

      setWelcomeMessage(data.welcomeMessage || null)

      if (data.result === 'sent' && selectedLead?.phone && canChat) {
        await fetchChat(selectedLead.phone)
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to resend welcome message'
      setWelcomeMessageRetryError(message)
      await fetchLeadDetail(selectedLeadId)
    } finally {
      setWelcomeMessageRetrying(false)
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLeadId || !newComment.trim()) return

    setCommentSubmitting(true)
    try {
      const response = await fetch(`/api/backoffice/leads/${selectedLeadId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: newComment.trim() }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add comment')
      }
      setNewComment('')
      await fetchLeadDetail(selectedLeadId)
    } catch (err) {
      console.error(err)
    } finally {
      setCommentSubmitting(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLead?.phone || !newMessage.trim()) return

    setMessageSending(true)
    try {
      const response = await fetch(
        `/api/backoffice/chat/${encodePhoneForUrl(selectedLead.phone)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: newMessage.trim(),
            notionPageId: selectedLead.id,
          }),
        }
      )
      const data = await response.json()
      if (!response.ok) {
        setNewMessage('')
        scrollSmoothOnNextRef.current = true
        await fetchChat(selectedLead.phone)
        console.error(data.error || 'Failed to send message')
        return
      }
      setNewMessage('')
      scrollSmoothOnNextRef.current = true
      await fetchChat(selectedLead.phone)
    } catch (err) {
      console.error(err)
    } finally {
      setMessageSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy-gradient px-4 md:px-0">
      <Navigation />

      <section className="px-4 sm:px-6 lg:px-8 pt-12 md:pt-16 pb-8">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex justify-between items-center mb-6">
            <Link
              href="/backoffice"
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-accent-red transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-accent-red transition-colors disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-50 mb-2">
              Property Leads <span className="text-accent-red">Pipeline</span>
            </h1>
            <p className="text-gray-300">Manage leads, stages, and WhatsApp conversations</p>
          </div>

          {loading && (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 text-accent-red animate-spin" />
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-400 text-center">
              {error}
            </div>
          )}

          {!loading && !error && (
            <div className="overflow-x-auto">
                <div className="flex gap-4 min-w-max pb-4">
                  {columns.map((column) => (
                    <div
                      key={column.stage}
                      className="w-72 flex-shrink-0 bg-navy-900/30 border border-navy-700 rounded-2xl p-3"
                    >
                      <h3 className="font-bold text-gray-50 mb-3 px-1 flex justify-between items-center">
                        <span>{column.stage}</span>
                        <span className="text-xs text-gray-400 font-normal">
                          {column.leads.length}
                        </span>
                      </h3>
                      <div className="space-y-2 max-h-[70vh] overflow-y-auto scrollbar-subtle">
                        {column.leads.map((lead) => (
                          <button
                            key={lead.id}
                            onClick={() => openLead(lead)}
                            className={`w-full text-left p-3 rounded-xl border transition-colors ${
                              selectedLeadId === lead.id
                                ? 'bg-accent-red/10 border-accent-red/50'
                                : 'bg-navy-900/50 border-navy-700 hover:border-accent-red/30'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <span className="font-medium text-gray-50 text-sm">{lead.name}</span>
                              {(lead.unreadCount || 0) > 0 && (
                                <span className="bg-accent-red text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                                  {lead.unreadCount}
                                </span>
                              )}
                            </div>
                            {lead.leadSource && (
                              <p className="text-xs text-gray-400 mt-1">{lead.leadSource}</p>
                            )}
                            {lead.addedDate && (
                              <p className="text-xs text-gray-500 mt-0.5">{lead.addedDate}</p>
                            )}
                            {lead.propertyCount && (
                              <p className="text-xs text-gray-300 mt-1">
                                Properties: {lead.propertyCount}
                              </p>
                            )}
                            {lead.phone && validateUKPhone(lead.phone) && (
                              <p className="text-xs text-accent-red/80 mt-1 flex items-center gap-1">
                                <MessageCircle className="w-3 h-3" />
                                Chat available
                              </p>
                            )}
                          </button>
                        ))}
                        {column.leads.length === 0 && (
                          <p className="text-gray-500 text-xs text-center py-4">No leads</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
            </div>
          )}
        </div>
      </section>

      {/* Lead detail modal */}
      {selectedLeadId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeLead}
          />
          <div className="relative w-full max-w-[min(1600px,98vw)] h-[min(920px,96vh)] bg-navy-900 border border-accent-red/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex-shrink-0 border-b border-navy-700 px-6 py-4 flex justify-between items-center gap-4">
              <div className="min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-50 truncate">
                  {selectedLead?.name || 'Lead details'}
                </h2>
                {selectedLead?.stage && (
                  <p className="text-sm text-gray-400 mt-0.5">{selectedLead.stage}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {selectedLead && !deleteConfirming && (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirming(true)}
                    disabled={deleteSubmitting}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete lead
                  </button>
                )}
                {deleteConfirming && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Confirm delete?</span>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirming(false)}
                      disabled={deleteSubmitting}
                      className="px-3 py-1.5 text-sm text-gray-300 hover:text-gray-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteLead}
                      disabled={deleteSubmitting}
                      className="px-3 py-1.5 text-sm bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {deleteSubmitting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                )}
                <button
                  onClick={closeLead}
                  className="p-2 text-gray-400 hover:text-accent-red transition-colors rounded-lg hover:bg-navy-800"
                  aria-label="Close"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              {detailLoading && !selectedLead && (
                <div className="flex flex-1 min-h-0 items-center justify-center">
                  <Loader2 className="w-8 h-8 text-accent-red animate-spin" />
                </div>
              )}

              {detailError && (
                <div className="mx-6 mt-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
                  {detailError}
                </div>
              )}

              {deleteError && (
                <div className="mx-6 mt-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
                  {deleteError}
                </div>
              )}

              {selectedLead && (
                <div
                  className={`flex-1 min-h-0 flex flex-col p-6 sm:p-8 ${detailLoading ? 'opacity-60' : ''}`}
                >
                  <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-2 gap-8 lg:gap-12">
                    {/* Left column: lead info + comments */}
                    <div className="space-y-6 overflow-y-auto overscroll-contain scrollbar-subtle min-h-0 max-h-[38vh] shrink-0 lg:shrink lg:max-h-none pr-1">
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                          Lead information
                        </h3>
                        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                          <div>
                            <dt className="text-gray-400">Stage</dt>
                            <dd className="mt-0.5">
                              <select
                                value={selectedLead.stage || ''}
                                onChange={(e) => handleStageChange(e.target.value)}
                                disabled={stageSaving || stages.length === 0}
                                className="w-full px-2 py-1.5 bg-navy-800/50 border border-navy-700 rounded-lg text-gray-50 text-sm focus:ring-2 focus:ring-accent-red focus:border-transparent outline-none disabled:opacity-50"
                              >
                                {!selectedLead.stage && (
                                  <option value="">Unassigned</option>
                                )}
                                {stages.map((stage) => (
                                  <option key={stage} value={stage}>
                                    {stage}
                                  </option>
                                ))}
                              </select>
                              {stageSaving && (
                                <p className="text-xs text-gray-500 mt-1">Saving...</p>
                              )}
                              {stageError && (
                                <p className="text-xs text-red-400 mt-1">{stageError}</p>
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-gray-400">Phone</dt>
                            <dd className="text-gray-50 mt-0.5">{selectedLead.phone || '—'}</dd>
                          </div>
                          <div>
                            <dt className="text-gray-400">Lead source</dt>
                            <dd className="text-gray-50 mt-0.5">{selectedLead.leadSource || '—'}</dd>
                          </div>
                          <div>
                            <dt className="text-gray-400">Added date</dt>
                            <dd className="text-gray-50 mt-0.5">{selectedLead.addedDate || '—'}</dd>
                          </div>
                          <div className="col-span-2">
                            <dt className="text-gray-400">Properties</dt>
                            <dd className="text-gray-50 mt-0.5">{selectedLead.propertyCount || '—'}</dd>
                          </div>
                        </dl>
                        {selectedLead.extraInformation && (
                          <div className="mt-3">
                            <p className="text-gray-400 text-xs mb-1">Extra information</p>
                            <p className="text-gray-200 text-sm bg-navy-800/50 rounded-lg p-4 whitespace-pre-wrap">
                              {selectedLead.extraInformation}
                            </p>
                          </div>
                        )}
                        {welcomeMessage && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <p className="text-gray-400 text-xs">Welcome message</p>
                              {welcomeMessage.status === 'failed' && (
                                <button
                                  type="button"
                                  onClick={handleRetryWelcomeMessage}
                                  disabled={welcomeMessageRetrying}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-300 hover:text-gray-50 bg-navy-800 hover:bg-navy-700 border border-navy-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {welcomeMessageRetrying ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <RotateCcw className="w-3 h-3" />
                                  )}
                                  Resend
                                </button>
                              )}
                            </div>
                            <p className="text-gray-200 text-sm bg-navy-800/50 rounded-lg p-4">
                              {getWelcomeMessageStatusLabel(welcomeMessage)}
                            </p>
                            {welcomeMessageRetryError && (
                              <p className="text-red-400 text-xs mt-2">{welcomeMessageRetryError}</p>
                            )}
                            {welcomeMessage.previewBody && (
                              <p className="text-gray-400 text-xs mt-2 whitespace-pre-wrap">
                                {welcomeMessage.previewBody}
                              </p>
                            )}
                          </div>
                        )}
                        <a
                          href={selectedLead.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-accent-red hover:underline mt-2"
                        >
                          Open in Notion
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                          Comments
                        </h3>
                        {commentsError && (
                          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-amber-200 text-sm">
                            Could not load comments from Notion. Enable <strong>Read comments</strong> on
                            your integration at notion.so/my-integrations, then reconnect it to the
                            database.
                          </div>
                        )}
                        {!commentsError && (
                          comments.length === 0 ? (
                            <p className="text-gray-500 text-sm">No comments yet</p>
                          ) : (
                            <ul className="space-y-2">
                              {comments.map((comment) => (
                                <li
                                  key={comment.id}
                                  className="bg-navy-800/50 rounded-lg p-3 text-sm text-gray-200"
                                >
                                  <div className="flex justify-between items-start gap-2">
                                    <p className="flex-1 min-w-0">{comment.text}</p>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteComment(comment.id)}
                                      disabled={deletingCommentId === comment.id}
                                      className="flex-shrink-0 p-1 text-gray-500 hover:text-red-400 transition-colors disabled:opacity-50"
                                      aria-label="Delete comment"
                                    >
                                      {deletingCommentId === comment.id ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <Trash2 className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {new Date(comment.createdTime).toLocaleString()}
                                  </p>
                                </li>
                              ))}
                            </ul>
                          )
                        )}
                        {commentDeleteError && (
                          <p className="text-xs text-red-400">{commentDeleteError}</p>
                        )}
                        <form onSubmit={handleAddComment} className="space-y-2">
                          <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Add a comment to Notion..."
                            rows={3}
                            className="w-full px-3 py-2 bg-navy-800/50 border border-navy-700 rounded-xl text-gray-50 placeholder-gray-500 text-sm focus:ring-2 focus:ring-accent-red focus:border-transparent outline-none"
                          />
                          <button
                            type="submit"
                            disabled={commentSubmitting || !newComment.trim()}
                            className="px-4 py-2 bg-accent-red hover:bg-accent-red/90 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
                          >
                            {commentSubmitting ? 'Adding...' : 'Add comment'}
                          </button>
                        </form>
                      </div>
                    </div>

                    {/* Right column: WhatsApp chat */}
                    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                      {canChat && selectedLead.phone ? (
                        <>
                          <div className="flex-shrink-0 flex items-center gap-3 pb-3 border-b border-navy-700">
                            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-accent-red/20 border border-accent-red/40 flex items-center justify-center text-accent-red font-semibold">
                              {getInitials(
                                chatContact?.waProfileName || selectedLead.name
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-50 truncate">
                                {selectedLead.name}
                              </p>
                              {chatContact?.waProfileName &&
                                chatContact.waProfileName !== selectedLead.name && (
                                  <p className="text-sm text-gray-400 truncate">
                                    WhatsApp: {chatContact.waProfileName}
                                  </p>
                                )}
                              <p className="text-sm text-gray-500">
                                {formatUKPhone(selectedLead.phone)}
                              </p>
                            </div>
                          </div>

                          <div
                            ref={chatScrollRef}
                            onScroll={handleChatScroll}
                            className="flex-1 min-h-0 bg-navy-800/30 border border-navy-700 rounded-xl p-4 overflow-y-auto overscroll-contain scrollbar-subtle"
                          >
                            {chatLoading && chatMessages.length === 0 ? (
                              <div className="flex justify-center py-12">
                                <Loader2 className="w-6 h-6 text-accent-red animate-spin" />
                              </div>
                            ) : chatMessages.length === 0 ? (
                              <p className="text-gray-500 text-sm text-center py-12">No messages yet</p>
                            ) : (
                              <div className="space-y-3">
                                {chatMessages.map((msg) => (
                                  <div
                                    key={msg.id}
                                    className={`flex ${
                                      msg.direction === 'outbound' ? 'justify-end' : 'justify-start'
                                    }`}
                                  >
                                    <div
                                      className={`max-w-[85%] px-4 py-2.5 rounded-xl text-sm ${
                                        msg.direction === 'outbound'
                                          ? 'bg-accent-red text-white'
                                          : 'bg-navy-700 text-gray-100'
                                      }`}
                                    >
                                      <ChatMessageContent msg={msg} />
                                      <div className="flex items-center justify-end gap-1.5 mt-1">
                                        <span className="text-xs opacity-70">
                                          {formatUKDateTime(msg.timestamp)}
                                        </span>
                                        {msg.direction === 'outbound' && (
                                          <MessageStatusReceipt
                                            status={msg.status}
                                            statusError={msg.statusError}
                                          />
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <form onSubmit={handleSendMessage} className="flex-shrink-0 flex gap-2 mt-3">
                            <input
                              type="text"
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              placeholder="Type a message..."
                              className="flex-1 px-4 py-3 bg-navy-800/50 border border-navy-700 rounded-xl text-gray-50 placeholder-gray-500 text-sm focus:ring-2 focus:ring-accent-red focus:border-transparent outline-none"
                            />
                            <button
                              type="submit"
                              disabled={messageSending || !newMessage.trim()}
                              className="px-5 py-3 bg-accent-red hover:bg-accent-red/90 disabled:opacity-50 text-white rounded-xl transition-colors"
                            >
                              {messageSending ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <Send className="w-5 h-5" />
                              )}
                            </button>
                          </form>
                        </>
                      ) : selectedLead.phone && !canChat ? (
                        <div className="flex-1 flex items-center justify-center bg-navy-800/20 border border-navy-700 rounded-xl p-8">
                          <p className="text-gray-500 text-sm text-center">
                            Phone number is not valid for WhatsApp chat.
                          </p>
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-center bg-navy-800/20 border border-navy-700 rounded-xl p-8">
                          <p className="text-gray-500 text-sm text-center">
                            No phone number — chat unavailable.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}
