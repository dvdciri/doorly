import { projects } from '@/app/data/projects'
import ProjectCard from './ProjectCard'

export default function ProjectsSection() {
  return (
    <section className="w-full bg-navy-gradient pt-4 sm:pt-6 md:pt-8 pb-8 sm:pb-12 md:pb-16 lg:pb-20">
      <div className="container mx-auto px-4 sm:px-6 md:px-6 lg:px-8 max-w-7xl">
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-50 mb-6 sm:mb-8 md:mb-12 text-center px-2">
          Our{' '}
          <span className="text-accent-red">Projects</span>
        </h2>
        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
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

