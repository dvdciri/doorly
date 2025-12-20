import Image from 'next/image'
import { Project } from '@/app/data/projects'

interface ProjectCardProps {
  project: Project
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="bg-navy-900 rounded-lg shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-105 border border-navy-800 h-full flex flex-col">
      <div className="aspect-video w-full bg-navy-800 relative overflow-hidden">
        <Image
          src={project.picture}
          alt={project.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </div>
      <div className="p-4 sm:p-6 md:p-8 flex flex-col flex-grow">
        <div className="mb-3 sm:mb-4">
          <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-50 mb-1 sm:mb-2">
            {project.name}
          </h3>
          <p className="text-accent-red font-semibold text-sm sm:text-base md:text-lg">
            {project.location}
          </p>
        </div>
        <p className="text-sm sm:text-base text-gray-300 mb-4 sm:mb-6 flex-grow leading-relaxed">
          {project.description}
        </p>
        <div className="space-y-2 sm:space-y-3 pt-3 sm:pt-4 border-t border-navy-800">
          <div className="flex justify-between items-center flex-wrap gap-1">
            <span className="text-gray-400 text-xs sm:text-sm md:text-base">Purchase Price:</span>
            <span className="text-gray-50 font-semibold text-xs sm:text-sm md:text-base">
              {formatCurrency(project.purchasePrice)}
            </span>
          </div>
          <div className="flex justify-between items-center flex-wrap gap-1">
            <span className="text-gray-400 text-xs sm:text-sm md:text-base">Refurbishments:</span>
            <span className="text-accent-red font-semibold text-xs sm:text-sm md:text-base">
              {formatCurrency(project.refurbishments)}
            </span>
          </div>
          <div className="flex justify-between items-center flex-wrap gap-1">
            <span className="text-gray-400 text-xs sm:text-sm md:text-base">Revaluation:</span>
            <span className="text-accent-red font-semibold text-xs sm:text-sm md:text-base">
              {formatCurrency(project.revaluation)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

