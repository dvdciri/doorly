'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navigation from '../../components/Navigation'
import Footer from '../../components/Footer'
import {
  LogOut,
  ArrowLeft,
  Loader2,
  X,
  ExternalLink,
  Trash2,
} from 'lucide-react'
import { formatUKPhone } from '@/lib/phone'
import { BackofficeToolbar } from '../BackofficeToolbar'

interface Lead {
  id: string
  name: string
  stage: string | null
  phone: string | null
  leadSource: string | null
  addedDate: string | null
  propertyCount: string | null
  extraInformation: string | null
  propertyAddress: string | null
  url: string
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
  const [commentsError, setCommentsError] = useState<string | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [stageSaving, setStageSaving] = useState(false)
  const [stageError, setStageError] = useState<string | null>(null)
  const [deleteConfirming, setDeleteConfirming] = useState(false)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null)
  const [commentDeleteError, setCommentDeleteError] = useState<string | null>(null)

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

  useEffect(() => {
    fetchPipeline()
    const id = setInterval(fetchPipeline, 30000)
    return () => clearInterval(id)
  }, [fetchPipeline])

  useEffect(() => {
    if (!selectedLeadId) {
      setSelectedLead(null)
      setComments([])
      return
    }
    fetchLeadDetail(selectedLeadId)
  }, [selectedLeadId, fetchLeadDetail])

  const closeLead = useCallback(() => {
    setSelectedLeadId(null)
    setSelectedLead(null)
    setDetailError(null)
    setStageError(null)
    setDeleteConfirming(false)
    setDeleteError(null)
    setCommentDeleteError(null)
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

  return (
    <div className="min-h-screen bg-navy-gradient px-4 md:px-0">
      <Navigation />

      <section className="px-4 sm:px-6 lg:px-8 pt-6 md:pt-8 pb-4">
        <div className="max-w-[1600px] mx-auto">
          <BackofficeToolbar
            title={
              <>
                Property Leads <span className="text-accent-red">Pipeline</span>
              </>
            }
            subtitle="Manage leads, stages, and Notion comments"
            left={
              <Link
                href="/backoffice"
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-accent-red transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Link>
            }
            right={
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-accent-red transition-colors disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            }
          />

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
                          <span className="font-medium text-gray-50 text-sm block">{lead.name}</span>
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

      {selectedLeadId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeLead}
          />
          <div className="relative w-full max-w-[min(800px,98vw)] max-h-[min(920px,96vh)] bg-navy-900 border border-accent-red/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
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
                  className={`flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-subtle p-6 sm:p-8 space-y-6 ${detailLoading ? 'opacity-60' : ''}`}
                >
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
                        <dd className="text-gray-50 mt-0.5">
                          {selectedLead.phone ? formatUKPhone(selectedLead.phone) : '—'}
                        </dd>
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
                    {selectedLead.propertyAddress && (
                      <div className="mt-3">
                        <p className="text-gray-400 text-xs mb-1">Property address</p>
                        <p className="text-gray-200 text-sm bg-navy-800/50 rounded-lg p-4 whitespace-pre-wrap">
                          {selectedLead.propertyAddress}
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
                    {!commentsError &&
                      (comments.length === 0 ? (
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
                      ))}
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
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}
