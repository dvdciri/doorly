'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import ConfirmationDialog from './ConfirmationDialog'

export default function PortfolioForm() {
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
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Validate UK phone number
  const validateUKPhone = (phone: string): boolean => {
    // Remove all spaces, dashes, parentheses, and plus signs for validation
    const cleaned = phone.replace(/[\s\-\(\)\+]/g, '')
    
    // Check if it starts with 0 or 44
    if (cleaned.startsWith('44')) {
      // International format: +44 followed by 10 digits
      const digits = cleaned.substring(2)
      return /^\d{10}$/.test(digits)
    } else if (cleaned.startsWith('0')) {
      // UK format: 0 followed by 10 digits
      const digits = cleaned.substring(1)
      return /^\d{10}$/.test(digits)
    }
    
    // If it doesn't start with 0 or 44, check if it's exactly 10 digits
    return /^\d{10}$/.test(cleaned)
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
    } else if (!validateUKPhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid UK phone number (e.g., 07123 456789 or +44 7123 456789)'
    } else {
      newErrors.phone = ''
    }

    // Validate property count
    if (!formData.propertyCount.trim()) {
      newErrors.propertyCount = 'Please select how many properties you are considering selling'
    } else {
      newErrors.propertyCount = ''
    }

    setErrors(newErrors)

    // Only submit if there are no errors
    if (!newErrors.name && !newErrors.phone && !newErrors.propertyCount) {
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
            propertyCount: formData.propertyCount.trim(),
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to submit form')
        }

        // Success - show confirmation dialog
        setShowConfirmation(true)
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

  return (
    <>
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
              required
              className={`w-full pl-4 pr-12 py-3.5 min-h-[48px] bg-navy-800/50 border rounded-xl text-gray-50 focus:ring-2 focus:ring-accent-red focus:border-transparent outline-none transition text-base sm:text-lg ${
                errors.propertyCount ? 'border-red-500' : 'border-navy-700'
              }`}
            >
              <option value="">How many properties are you considering selling?</option>
              <option value="1–3">1–3</option>
              <option value="4–10">4–10</option>
              <option value="10+">10+</option>
              <option value="A single block / mixed-use building">A single block / mixed-use building</option>
            </select>
            {errors.propertyCount && (
              <p className="mt-1 text-sm text-red-400">{errors.propertyCount}</p>
            )}
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

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
      />
    </>
  )
}


