import { ReactNode } from 'react'

interface StepCardProps {
  stepNumber: number
  title: string
  description: string
  icon?: ReactNode
}

export default function StepCard({ stepNumber, title, description, icon }: StepCardProps) {
  return (
    <div className="flex items-start gap-4 w-full bg-navy-900/50 border border-navy-800/50 rounded-xl p-5 sm:p-6 hover:border-navy-700/50 transition-colors">
      <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 rounded-full bg-accent-blue/20 text-accent-blue font-semibold text-lg sm:text-xl border border-accent-blue/30">
        {stepNumber}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-50 mb-2 break-words">{title}</h3>
        <p className="text-gray-300 leading-relaxed text-sm sm:text-base md:text-lg break-words">{description}</p>
      </div>
    </div>
  )
}

