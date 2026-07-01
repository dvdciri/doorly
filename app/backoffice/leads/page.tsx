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
} from 'lucide-react'
import { validateUKPhone } from '@/lib/phone'

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

interface ChatMessage {
  id: number
  direction: 'inbound' | 'outbound'
  body: string
  timestamp: string
}

interface UnreadItem {
  phone: string
  unreadCount: number
  lastMessageAt: string
  lastMessageBody: string
  lead: { id: string; name: string; stage: string | null } | null
}

function truncate(text: string, max = 80): string {
  if (text.length <= max) return text
  return `${text.slice(0, max)}…`
}

function encodePhoneForUrl(phone: string): string {
  return encodeURIComponent(phone)
}

export default function LeadsPipelinePage() {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [columns, setColumns] = useState<PipelineColumn[]>([])
  const [unread, setUnread] = useState<UnreadItem[]>([])
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [comments, setComments] = useState<NotionComment[]>([])
  const [commentsError, setCommentsError] = useState<string | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [messageSending, setMessageSending] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const canChat = selectedLead?.phone ? validateUKPhone(selectedLead.phone) : false

  const fetchPipeline = useCallback(async () => {
    try {
      const [leadsRes, unreadRes] = await Promise.all([
        fetch('/api/backoffice/leads'),
        fetch('/api/backoffice/leads/unread'),
      ])

      if (!leadsRes.ok) {
        const data = await leadsRes.json()
        throw new Error(data.error || 'Failed to load leads')
      }

      const leadsData = await leadsRes.json()
      setColumns(leadsData.columns || [])

      if (unreadRes.ok) {
        const unreadData = await unreadRes.json()
        setUnread(unreadData.unread || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pipeline')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchLeadDetail = useCallback(async (pageId: string) => {
    setDetailLoading(true)
    setDetailError(null)
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load lead'
      setDetailError(message)
      console.error(err)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const fetchChat = useCallback(async (phone: string, markRead = false) => {
    setChatLoading(true)
    try {
      const response = await fetch(`/api/backoffice/chat/${encodePhoneForUrl(phone)}`)
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to load chat')
      }
      const data = await response.json()
      setChatMessages(data.messages || [])

      if (markRead) {
        await fetch(`/api/backoffice/chat/${encodePhoneForUrl(phone)}/read`, {
          method: 'POST',
        })
        fetchPipeline()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setChatLoading(false)
    }
  }, [fetchPipeline])

  useEffect(() => {
    fetchPipeline()
  }, [fetchPipeline])

  useEffect(() => {
    if (!selectedLeadId) {
      setSelectedLead(null)
      setComments([])
      setChatMessages([])
      return
    }
    fetchLeadDetail(selectedLeadId)
  }, [selectedLeadId, fetchLeadDetail])

  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }

    if (!selectedLead?.phone || !canChat) {
      return
    }

    fetchChat(selectedLead.phone, true)

    pollRef.current = setInterval(() => {
      fetchChat(selectedLead.phone!, false)
    }, 5000)

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
      }
    }
  }, [selectedLead?.phone, canChat, fetchChat])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

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
    setSelectedLeadId(lead.id)
  }

  const closeLead = () => {
    setSelectedLeadId(null)
    setSelectedLead(null)
    setDetailError(null)
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
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send message')
      }
      setNewMessage('')
      await fetchChat(selectedLead.phone, false)
    } catch (err) {
      console.error(err)
    } finally {
      setMessageSending(false)
    }
  }

  const jumpToUnread = (item: UnreadItem) => {
    if (item.lead) {
      openLead({
        id: item.lead.id,
        name: item.lead.name,
        stage: item.lead.stage,
        phone: item.phone,
        leadSource: null,
        addedDate: null,
        propertyCount: null,
        extraInformation: null,
        url: '',
      })
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
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Unread inbox */}
              <div className="lg:col-span-1">
                <div className="bg-navy-900/50 border border-accent-red/30 rounded-2xl p-4 sticky top-4">
                  <h2 className="text-lg font-bold text-gray-50 mb-4 flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-accent-red" />
                    Unread Messages
                  </h2>
                  {unread.length === 0 ? (
                    <p className="text-gray-400 text-sm">No unread messages</p>
                  ) : (
                    <ul className="space-y-2">
                      {unread.map((item) => (
                        <li key={item.phone}>
                          <button
                            onClick={() => jumpToUnread(item)}
                            className="w-full text-left p-3 rounded-xl bg-navy-800/50 hover:bg-navy-800 border border-navy-700 hover:border-accent-red/40 transition-colors"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <span className="font-medium text-gray-50 text-sm">
                                {item.lead?.name || item.phone}
                              </span>
                              <span className="bg-accent-red text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                {item.unreadCount}
                              </span>
                            </div>
                            <p className="text-gray-400 text-xs mt-1 line-clamp-2">
                              {item.lastMessageBody}
                            </p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Pipeline board */}
              <div className="lg:col-span-3 overflow-x-auto">
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
                      <div className="space-y-2 max-h-[70vh] overflow-y-auto">
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
                            {lead.extraInformation && (
                              <p className="text-xs text-gray-400 mt-1 italic">
                                {truncate(lead.extraInformation)}
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
            <div className="flex-shrink-0 border-b border-navy-700 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-50">
                  {selectedLead?.name || 'Lead details'}
                </h2>
                {selectedLead?.stage && (
                  <p className="text-sm text-gray-400 mt-0.5">{selectedLead.stage}</p>
                )}
              </div>
              <button
                onClick={closeLead}
                className="p-2 text-gray-400 hover:text-accent-red transition-colors rounded-lg hover:bg-navy-800"
                aria-label="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {detailLoading && !selectedLead && (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-8 h-8 text-accent-red animate-spin" />
                </div>
              )}

              {detailError && (
                <div className="mx-6 mt-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
                  {detailError}
                </div>
              )}

              {selectedLead && (
                <div className={`p-6 sm:p-8 ${detailLoading ? 'opacity-60' : ''}`}>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                    {/* Left column: lead info + comments */}
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                          Lead information
                        </h3>
                        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                          <div>
                            <dt className="text-gray-400">Stage</dt>
                            <dd className="text-gray-50 mt-0.5">{selectedLead.stage || '—'}</dd>
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
                            <ul className="space-y-2 max-h-64 overflow-y-auto">
                              {comments.map((comment) => (
                                <li
                                  key={comment.id}
                                  className="bg-navy-800/50 rounded-lg p-3 text-sm text-gray-200"
                                >
                                  <p>{comment.text}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {new Date(comment.createdTime).toLocaleString()}
                                  </p>
                                </li>
                              ))}
                            </ul>
                          )
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
                    <div className="space-y-3 flex flex-col min-h-[480px] lg:min-h-0 lg:h-full">
                      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-2">
                        <MessageCircle className="w-4 h-4" />
                        WhatsApp Chat
                      </h3>

                      {canChat && selectedLead.phone ? (
                        <>
                          <div className="flex-1 bg-navy-800/30 border border-navy-700 rounded-xl p-4 min-h-[360px] lg:min-h-[580px] overflow-y-auto">
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
                                      <p>{msg.body}</p>
                                      <p className="text-xs opacity-70 mt-1">
                                        {new Date(msg.timestamp).toLocaleString()}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                                <div ref={chatEndRef} />
                              </div>
                            )}
                          </div>
                          <form onSubmit={handleSendMessage} className="flex gap-2">
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
