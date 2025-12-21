import Image from 'next/image'

export default function TeamSection() {
  const teamMembers = [
    {
      name: 'Davide Cirillo',
      role: 'Founder and Director',
      image: '/WhatsApp Image 2025-12-20 at 21.30.34.jpeg',
    },
    {
      name: 'Maria Cirillo',
      role: 'Operations Director',
      image: '/WhatsApp Image 2025-12-20 at 21.30.55.jpeg',
    },
  ]

  return (
    <section className="w-full py-8 sm:py-12 md:py-16 lg:py-20">
      <div className="container mx-auto px-4 sm:px-6 md:px-6 lg:px-8 max-w-7xl">
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-50 mb-6 sm:mb-8 md:mb-12 text-center px-2">
          About{' '}
          <span className="text-accent-red">us</span>
        </h2>
        
        <div className="max-w-3xl mx-auto px-4 mb-8 sm:mb-10 md:mb-12">
          <p className="text-gray-300 text-sm sm:text-base md:text-lg leading-relaxed text-center">
            Originally from Italy and Bulgaria, we've called the UK home for more than a decade. Martial arts, travel, and adrenaline have always been central to who we are, teaching us focus, courage, and the confidence to explore new paths.
          </p>
          <p className="text-gray-300 text-sm sm:text-base md:text-lg leading-relaxed text-center mt-4 sm:mt-6">
            Professionally, we bring together software engineering and finance, blending creativity with analytical thinking. From investing to travel-driven experiences, we believe in smart decisions, continuous learning, and building a life shaped by curiosity and purpose.
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-3 sm:gap-5 md:gap-6 max-w-xs sm:max-w-md md:max-w-2xl mx-auto mb-8 sm:mb-10 md:mb-12">
          {teamMembers.map((member, index) => (
            <div
              key={index}
              className="bg-navy-900 rounded-lg shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-105 border border-navy-800"
            >
              <div className="aspect-square w-full bg-navy-800 relative overflow-hidden">
                <Image
                  src={member.image}
                  alt={member.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-3 sm:p-5 md:p-6">
                <h3 className="text-sm sm:text-lg md:text-xl font-bold text-gray-50 mb-1 sm:mb-2">
                  {member.name}
                </h3>
                <p className="text-accent-red font-semibold text-xs sm:text-base">
                  {member.role}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

