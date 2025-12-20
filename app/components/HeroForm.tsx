'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'

export default function HeroForm() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    postcode: '',
    propertyType: '',
    name: '',
    email: '',
    phone: '',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.postcode && formData.propertyType) {
      setStep(2)
    }
  }

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    // TODO: Implement form submission logic
    console.log('Form submitted:', formData)
    setTimeout(() => {
      setIsSubmitting(false)
      alert('Thank you for your submission. We will be in touch within 48 hours.')
    }, 1000)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <div className="bg-navy-900/50 backdrop-blur-sm border border-navy-800/50 rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl">
      {step === 1 ? (
        <form onSubmit={handleStep1Submit} className="space-y-4">
          <div>
            <label htmlFor="postcode" className="block text-sm font-medium text-gray-300 mb-2">
              Postcode
            </label>
            <input
              type="text"
              id="postcode"
              name="postcode"
              value={formData.postcode}
              onChange={handleChange}
              required
              className="w-full px-4 py-3.5 min-h-[48px] bg-navy-800/50 border border-navy-700 rounded-xl text-gray-50 placeholder-gray-400 focus:ring-2 focus:ring-accent-blue focus:border-transparent outline-none transition text-base sm:text-lg"
              placeholder="e.g., SW1A 1AA"
            />
          </div>

          <div>
            <label htmlFor="propertyType" className="block text-sm font-medium text-gray-300 mb-2">
              Property Type
            </label>
            <div className="relative">
              <select
                id="propertyType"
                name="propertyType"
                value={formData.propertyType}
                onChange={handleChange}
                required
                className="w-full px-4 py-3.5 min-h-[48px] bg-navy-800/50 border border-navy-700 rounded-xl text-gray-50 focus:ring-2 focus:ring-accent-blue focus:border-transparent outline-none transition text-base sm:text-lg appearance-none pr-10"
              >
                <option value="" className="bg-navy-900">Select property type</option>
                <option value="house" className="bg-navy-900">House</option>
                <option value="flat" className="bg-navy-900">Flat</option>
                <option value="bungalow" className="bg-navy-900">Bungalow</option>
                <option value="other" className="bg-navy-900">Other</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronDown className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-accent-blue hover:bg-accent-blue-dark active:scale-95 text-white py-4 px-6 min-h-[52px] rounded-xl font-semibold text-base sm:text-lg transition-all shadow-lg shadow-accent-blue/20 flex items-center justify-center gap-2"
          >
            Get my offer
            <ChevronRight className="w-5 h-5" />
          </button>

          <p className="text-xs text-gray-400 text-center mt-3">
            No obligation • Off-market • Your details stay private
          </p>
        </form>
      ) : (
        <form onSubmit={handleStep2Submit} className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-gray-400 hover:text-gray-200 transition-colors min-h-[44px] flex items-center px-2 -ml-2"
            >
              ← Back
            </button>
            <span className="text-sm text-gray-400">Step 2 of 2</span>
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
              Full Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-3.5 min-h-[48px] bg-navy-800/50 border border-navy-700 rounded-xl text-gray-50 placeholder-gray-400 focus:ring-2 focus:ring-accent-blue focus:border-transparent outline-none transition text-base sm:text-lg"
              placeholder="Your name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3.5 min-h-[48px] bg-navy-800/50 border border-navy-700 rounded-xl text-gray-50 placeholder-gray-400 focus:ring-2 focus:ring-accent-blue focus:border-transparent outline-none transition text-base sm:text-lg"
              placeholder="your.email@example.com"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              className="w-full px-4 py-3.5 min-h-[48px] bg-navy-800/50 border border-navy-700 rounded-xl text-gray-50 placeholder-gray-400 focus:ring-2 focus:ring-accent-blue focus:border-transparent outline-none transition text-base sm:text-lg"
              placeholder="07123 456789"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-accent-blue hover:bg-accent-blue-dark text-white py-4 px-6 rounded-xl font-semibold text-lg transition-colors shadow-lg shadow-accent-blue/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? 'Submitting...' : 'Submit my details'}
            {!isSubmitting && <ChevronRight className="w-5 h-5" />}
          </button>

          <p className="text-xs text-gray-400 text-center mt-3">
            No obligation • Off-market • Your details stay private
          </p>
        </form>
      )}
    </div>
  )
}

