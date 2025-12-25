'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import ConfirmationDialog from './ConfirmationDialog'

export default function HeroForm() {
  const [step, setStep] = useState(1)
  const [animationDirection, setAnimationDirection] = useState<'forward' | 'backward'>('forward')
  const [formData, setFormData] = useState({
    address: '',
    phone: '',
    propertyState: '',
    name: '',
  })

  const [errors, setErrors] = useState({
    address: '',
    phone: '',
    propertyState: '',
    name: '',
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


  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors = { ...errors }
    
    if (!formData.address.trim()) {
      newErrors.address = 'Please enter the full address'
    } else {
      newErrors.address = ''
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    } else if (!validateUKPhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid UK phone number (e.g., 07123 456789 or +44 7123 456789)'
    } else {
      newErrors.phone = ''
    }

    setErrors(newErrors)

    if (formData.address.trim() && formData.phone.trim() && validateUKPhone(formData.phone)) {
      // Save step 1 data to database (partial submission)
      fetch('/api/submit-step1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: formData.address.trim(),
          phone: formData.phone.trim(),
        }),
      }).catch((error) => {
        // Fail silently - don't break user experience
        console.error('Step 1 database save failed:', error)
      })

      // Track step 1 completion (Facebook event)
      fetch('/api/facebook/form-step1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: formData.address.trim(),
          phone: formData.phone.trim(),
          userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
          url: typeof window !== 'undefined' ? window.location.href : undefined,
        }),
      }).catch((error) => {
        // Fail silently - don't break user experience
        console.error('FormStep1 tracking failed:', error)
      })

      setAnimationDirection('forward')
      setStep(2)
    }
  }

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')
    
    const newErrors = {
      propertyState: '',
      name: '',
    }

    // Validate propertyState
    if (!formData.propertyState.trim()) {
      newErrors.propertyState = 'Please select the property state'
    } else {
      newErrors.propertyState = ''
    }

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    } else {
      newErrors.name = ''
    }

    setErrors({ ...errors, ...newErrors })

    // Only submit if there are no errors
    if (!newErrors.propertyState && !newErrors.name) {
      setIsSubmitting(true)
      
      try {
        const response = await fetch('/api/submit-form', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            address: formData.address.trim(),
            phone: formData.phone.trim(),
            propertyState: formData.propertyState.trim(),
            name: formData.name.trim(),
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
          address: '',
          phone: '',
          propertyState: '',
          name: '',
        })
        setAnimationDirection('forward')
        setStep(1)
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

  const handleBackClick = () => {
    setAnimationDirection('backward')
    setStep(1)
  }

  return (
    <>
      <div className="bg-navy-900/50 backdrop-blur-sm border border-navy-800/50 rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl relative">
        <div className="relative overflow-x-clip md:overflow-visible -mx-1 px-1">
          {/* Step 1 */}
          <div
            className={`w-full transition-all duration-300 ease-in-out md:duration-200 ${
              step === 1
                ? 'translate-x-0 relative z-10 md:z-auto'
                : animationDirection === 'forward'
                  ? '-translate-x-full absolute inset-0 z-0 md:translate-x-0 md:opacity-0 md:pointer-events-none'
                  : 'translate-x-full absolute inset-0 z-0 md:translate-x-0 md:opacity-0 md:pointer-events-none'
            }`}
          >
            <form onSubmit={handleStep1Submit} className="space-y-4">
          <div>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              required
              className={`w-full px-4 py-3.5 min-h-[48px] bg-navy-800/50 border rounded-xl text-gray-50 placeholder-gray-400 focus:ring-2 focus:ring-accent-red focus:border-transparent outline-none transition text-base sm:text-lg ${
                errors.address ? 'border-red-500' : 'border-navy-700'
              }`}
              placeholder="Full address of the property"
            />
            {errors.address && (
              <p className="mt-1 text-sm text-red-400">{errors.address}</p>
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

          <button
            type="submit"
            className="w-full bg-accent-red hover:bg-accent-red/90 active:scale-95 text-white py-4 px-6 min-h-[52px] rounded-xl font-semibold text-base sm:text-lg transition-all shadow-lg shadow-accent-red/20 flex items-center justify-center gap-2"
          >
            Get My Offer
            <ChevronRight className="w-5 h-5" />
          </button>
        </form>
          </div>

          {/* Step 2 */}
          <div
            className={`w-full transition-all duration-300 ease-in-out md:duration-200 ${
              step === 2
                ? 'translate-x-0 relative z-10 md:z-auto md:opacity-100'
                : 'absolute left-0 top-0 w-full translate-x-full z-0 opacity-0 pointer-events-none md:translate-x-0 md:opacity-0'
            }`}
            style={step !== 2 ? { willChange: 'transform' } : {}}
          >
            <form onSubmit={handleStep2Submit} className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <button
                  type="button"
                  onClick={handleBackClick}
                  className="text-gray-400 hover:text-gray-200 transition-colors min-h-[44px] flex items-center px-2 -ml-2"
                >
                  ← Back
                </button>
            <span className="text-sm text-gray-400">Step 2 of 2</span>
          </div>

          <div>
            <select
              id="propertyState"
              name="propertyState"
              value={formData.propertyState}
              onChange={handleChange}
              required
              className={`w-full pl-4 pr-12 py-3.5 min-h-[48px] bg-navy-800/50 border rounded-xl text-gray-50 focus:ring-2 focus:ring-accent-red focus:border-transparent outline-none transition text-base sm:text-lg ${
                errors.propertyState ? 'border-red-500' : 'border-navy-700'
              }`}
            >
              <option value="">What is the state of the property?</option>
              <option value="recently-refurbished">Recently refurbished</option>
              <option value="good-condition">Good condition</option>
              <option value="needs-renovation">Needs renovation</option>
              <option value="lightly-dated">Lightly dated</option>
              <option value="needs-major-work">Needs major work</option>
            </select>
            {errors.propertyState && (
              <p className="mt-1 text-sm text-red-400">{errors.propertyState}</p>
            )}
          </div>

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

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-accent-red hover:bg-accent-red/90 text-white py-4 px-6 rounded-xl font-semibold text-lg transition-colors shadow-lg shadow-accent-red/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
            {!isSubmitting && <ChevronRight className="w-5 h-5" />}
          </button>
        </form>
          </div>
        </div>

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

