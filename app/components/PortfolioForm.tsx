'use client'

import { useState } from 'react'
import { ChevronRight, CheckCircle } from 'lucide-react'

interface PortfolioFormProps {
  onSubmitted?: () => void
}

export default function PortfolioForm({ onSubmitted }: PortfolioFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    propertyCount: '',
  })

  const [errors, setErrors] = useState({
    name: '',
    phone: '',
    propertyCount: '',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [step, setStep] = useState<'form' | 'thankYou'>('form')
  const [notionPageId, setNotionPageId] = useState<string | null>(null)
  const [submissionId, setSubmissionId] = useState<number | null>(null)
  const [additionalInfo, setAdditionalInfo] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [commentError, setCommentError] = useState('')
  const [hasSubmittedAdditionalInfo, setHasSubmittedAdditionalInfo] = useState(false)

  // Check if phone number is complete (has enough digits)
  const isPhoneComplete = (phone: string): boolean => {
    const digits = phone.replace(/\D/g, '') // Extract only digits
    return digits.length >= 10 // At least 10 digits required
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')
    
    const newErrors = {
      name: '',
      phone: '',
      propertyCount: '',
    }

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    } else {
      newErrors.name = ''
    }

    // Validate phone
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    } else if (!isPhoneComplete(formData.phone)) {
      newErrors.phone = 'Please enter a complete phone number'
    } else {
      newErrors.phone = ''
    }

    setErrors(newErrors)

    // Only submit if there are no errors
    if (!newErrors.name && !newErrors.phone) {
      setIsSubmitting(true)
      
      try {
        const response = await fetch('/api/submit-portfolio-form', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.name.trim(),
            phone: formData.phone.trim(),
            propertyCount: formData.propertyCount.trim() || undefined,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to submit form')
        }

        // Success - move to thank you step
        setNotionPageId(data.notionPageId || null)
        setSubmissionId(data.id || null)
        setStep('thankYou')
        // Notify parent component
        onSubmitted?.()
        // Reset form
        setFormData({
          name: '',
          phone: '',
          propertyCount: '',
        })
      } catch (error: any) {
        console.error('Error submitting form:', error)
        setSubmitError(error.message || 'Failed to submit form. Please try again later.')
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
    
    // Clear error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors({
        ...errors,
        [name]: '',
      })
    }
  }

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAdditionalInfo(e.target.value)
    // Clear errors when user starts typing
    if (commentError) {
      setCommentError('')
    }
  }

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCommentError('')

    // Only submit if there's content
    if (!additionalInfo.trim()) {
      return
    }

    setIsSubmittingComment(true)

    try {
      const response = await fetch('/api/add-portfolio-comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notionPageId: notionPageId || null,
          submissionId: submissionId || null,
          comment: additionalInfo.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit additional information')
      }

      // Success - mark as submitted and clear form
      setHasSubmittedAdditionalInfo(true)
      setAdditionalInfo('')
    } catch (error: any) {
      console.error('Error submitting comment:', error)
      setCommentError(error.message || 'Failed to submit additional information. Please try again later.')
    } finally {
      setIsSubmittingComment(false)
    }
  }

  if (step === 'thankYou') {
    return (
      <div className="bg-navy-900/50 backdrop-blur-sm border border-navy-800/50 rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl relative">
        {/* Thank You Message */}
        <div className="text-center mb-6">
          {/* Success icon */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-accent-red/20 border border-accent-red/30">
              <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-accent-red" />
            </div>
          </div>

          {/* Message */}
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-50 mb-4">
            We got your details
          </h2>
          <p className="text-base sm:text-lg text-gray-300 leading-relaxed mb-6">
            Thank you for your submission. We will be in touch within 48 hours.
          </p>
        </div>

        {/* Optional Additional Information Form - only show if not yet submitted */}
        {!hasSubmittedAdditionalInfo ? (
          <form onSubmit={handleCommentSubmit} className="space-y-4 mt-8">
            <div>
              <label
                htmlFor="additionalInfo"
                className="block text-sm sm:text-base font-medium text-gray-300 mb-2"
              >
                Any other information you'd like to share?
              </label>
              <textarea
                id="additionalInfo"
                name="additionalInfo"
                value={additionalInfo}
                onChange={handleCommentChange}
                rows={4}
                className={`w-full px-4 py-3.5 bg-navy-800/50 border rounded-xl text-gray-50 placeholder-gray-400 focus:ring-2 focus:ring-accent-red focus:border-transparent outline-none transition text-base sm:text-lg resize-none ${
                  commentError ? 'border-red-500' : 'border-navy-700'
                }`}
                placeholder="Addressess, property types, condition or anything else you'd like to share.."
              />
              {commentError && (
                <p className="mt-1 text-sm text-red-400">{commentError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmittingComment || !additionalInfo.trim()}
              className="w-full bg-accent-red hover:bg-accent-red/90 active:scale-95 text-white py-4 px-6 min-h-[52px] rounded-xl font-semibold text-base sm:text-lg transition-all shadow-lg shadow-accent-red/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmittingComment ? 'Submitting...' : 'Submit'}
              {!isSubmittingComment && <ChevronRight className="w-5 h-5" />}
            </button>
          </form>
        ) : (
          <div className="mt-8">
            <p className="text-sm sm:text-base text-green-400 text-center">
              Thank you! Your additional information has been received.
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-navy-900/50 backdrop-blur-sm border border-navy-800/50 rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl relative">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className={`w-full px-4 py-3.5 min-h-[48px] bg-navy-800/50 border rounded-xl text-gray-50 placeholder-gray-400 focus:ring-2 focus:ring-accent-red focus:border-transparent outline-none transition text-base sm:text-lg ${
              errors.name ? 'border-red-500' : 'border-navy-700'
            }`}
            placeholder="Full Name"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-400">{errors.name}</p>
          )}
        </div>

        <div>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
            className={`w-full px-4 py-3.5 min-h-[48px] bg-navy-800/50 border rounded-xl text-gray-50 placeholder-gray-400 focus:ring-2 focus:ring-accent-red focus:border-transparent outline-none transition text-base sm:text-lg ${
              errors.phone ? 'border-red-500' : 'border-navy-700'
            }`}
            placeholder="Phone Number"
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-400">{errors.phone}</p>
          )}
        </div>

        <div>
          <select
            id="propertyCount"
            name="propertyCount"
            value={formData.propertyCount}
            onChange={handleChange}
            className="w-full pl-4 pr-12 py-3.5 min-h-[48px] bg-navy-800/50 border border-navy-700 rounded-xl text-gray-50 focus:ring-2 focus:ring-accent-red focus:border-transparent outline-none transition text-base sm:text-lg"
          >
            <option value="">How many properties do you own?</option>
            <option value="1–3">1–3</option>
            <option value="4–10">4–10</option>
            <option value="10+">10+</option>
            <option value="A single block / mixed-use building">A single block / mixed-use building</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-accent-red hover:bg-accent-red/90 active:scale-95 text-white py-4 px-6 min-h-[52px] rounded-xl font-semibold text-base sm:text-lg transition-all shadow-lg shadow-accent-red/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Submitting...' : 'Get My Offer'}
          {!isSubmitting && <ChevronRight className="w-5 h-5" />}
        </button>
      </form>

      {/* Submit error message */}
      {submitError && (
        <div className="mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-xl">
          <p className="text-sm text-red-400">{submitError}</p>
        </div>
      )}
    </div>
  )
}


