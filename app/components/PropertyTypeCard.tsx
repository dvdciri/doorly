interface PropertyTypeCardProps {
  label: string
}

export default function PropertyTypeCard({ label }: PropertyTypeCardProps) {
  return (
    <div className="px-4 sm:px-5 py-2.5 sm:py-3 bg-navy-900/50 border border-navy-800/50 rounded-full hover:border-accent-red/50 hover:bg-navy-800/50 transition-colors">
      <p className="text-gray-200 font-medium text-xs sm:text-sm md:text-base whitespace-nowrap">{label}</p>
    </div>
  )
}

