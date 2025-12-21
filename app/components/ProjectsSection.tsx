'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { projects } from '@/app/data/projects'
import ProjectCard from './ProjectCard'

export default function ProjectsSection() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768) // md breakpoint
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  // Show 4 projects on mobile, 6 on larger screens
  const initialProjects = isMobile ? 4 : 6
  
  const displayedProjects = isExpanded ? projects : projects.slice(0, initialProjects)
  const hasMoreProjects = projects.length > initialProjects

  return (
    <section className="w-full py-8 sm:py-12 md:py-16 lg:py-20">
      <div className="container mx-auto px-4 sm:px-6 md:px-6 lg:px-8 max-w-7xl">
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-50 mb-6 sm:mb-8 md:mb-12 text-center px-2">
        Recent {' '}
          <span className="text-accent-red">projects</span>
        </h2>
        
        {/* Made possible by our trusted partners */}
        <div className="max-w-5xl mx-auto mb-8 sm:mb-10 md:mb-12">
          <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-400 mb-4 sm:mb-6 text-center">
            Made possible by our trusted partners
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 md:gap-8 lg:gap-10">
            <div className="h-10 sm:h-12 md:h-16 w-auto relative">
              <Image
                src="/partners/inca-financial-logo.png"
                alt="Inca Financial"
                width={150}
                height={60}
                className="h-full w-auto object-contain"
              />
            </div>
            <div className="h-10 sm:h-12 md:h-16 w-auto relative">
              <Image
                src="/partners/glaisyers-logo.png"
                alt="Glaisyers"
                width={150}
                height={60}
                className="h-full w-auto object-contain"
              />
            </div>
            <div className="h-10 sm:h-12 md:h-16 w-auto relative">
              <Image
                src="/partners/partner3.png"
                alt="Partner"
                width={150}
                height={60}
                className="h-full w-auto object-contain"
              />
            </div>
            <div className="h-10 sm:h-12 md:h-16 w-auto relative">
              <Image
                src="/partners/wards-logo.png"
                alt="Wards Property"
                width={150}
                height={60}
                className="h-full w-auto object-contain"
              />
            </div>
            <div className="h-10 sm:h-12 md:h-16 w-auto relative">
              <Image
                src="/partners/oranges-logo.png"
                alt="Oranges Sales and Lettings"
                width={150}
                height={60}
                className="h-full w-auto object-contain"
              />
            </div>
            <div className="h-10 sm:h-12 md:h-16 w-auto relative">
              <Image
                src="/partners/bernards-logo.png"
                alt="Bernards Estates"
                width={150}
                height={60}
                className="h-full w-auto object-contain"
              />
            </div>
          </div>
        </div>

        {projects.length > 0 ? (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 md:gap-8">
              {displayedProjects.map((project, index) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
            
            {/* View all projects/Show Less Button */}
            {hasMoreProjects && (
              <div className="flex justify-center mt-6 sm:mt-8">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="bg-accent-red hover:bg-accent-red/90 text-white font-semibold px-6 sm:px-8 md:px-10 py-3 sm:py-4 md:py-5 rounded-lg text-base sm:text-lg md:text-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                >
                  {isExpanded ? 'Show Less' : 'View all projects'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">Projects coming soon...</p>
          </div>
        )}
      </div>
    </section>
  )
}

