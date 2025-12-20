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
    <section className="w-full bg-navy-950 py-8 sm:py-12 md:py-16 lg:py-20">
      <div className="container mx-auto px-4 sm:px-6 md:px-6 lg:px-8 max-w-7xl">
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-50 mb-6 sm:mb-8 md:mb-12 text-center px-2">
          Meet the{' '}
          <span className="text-accent-red">Team</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6 max-w-2xl mx-auto">
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
              <div className="p-4 sm:p-5 md:p-6">
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-50 mb-1 sm:mb-2">
                  {member.name}
                </h3>
                <p className="text-accent-red font-semibold text-sm sm:text-base">
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

