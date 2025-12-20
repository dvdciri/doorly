import { ReactNode } from 'react'

interface BenefitCardProps {
  icon: ReactNode
  title: string
  description: string
}

export default function BenefitCard({ icon, title, description }: BenefitCardProps) {
  return (
    <div className="flex items-start gap-4 w-full bg-navy-900/50 border border-navy-800/50 rounded-xl p-5 sm:p-6 hover:border-navy-700/50 transition-colors">
      <div className="flex items-center justify-center flex-shrink-0 text-accent-blue">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-50 mb-2 break-words">{title}</h3>
        <p className="text-gray-300 leading-relaxed text-sm sm:text-base md:text-lg break-words">{description}</p>
      </div>
    </div>
  )
}

