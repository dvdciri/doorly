import Image from 'next/image'

export default function Hero() {
  return (
    <section className="w-full bg-navy-gradient py-6 sm:py-8 md:py-12 lg:py-16">
      <div className="container mx-auto px-4 sm:px-6 md:px-6 lg:px-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-center">
          {/* Text Content */}
          <div className="order-2 lg:order-1">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-50 mb-3 sm:mb-4 md:mb-6 leading-tight">
              We are <span className="text-accent-red">Doorly</span> Properties!
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-gray-300 mb-4 sm:mb-6 md:mb-8 leading-relaxed">
              A property investment company from Davide Cirillo that focuses on providing affordable housing for tenants across the UK.
            </p>
            <div className="h-1 w-16 sm:w-20 bg-accent-red mb-4 sm:mb-6 md:mb-8"></div>
            
            {/* Mission Section */}
            <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-50 mb-2 sm:mb-3 md:mb-4 leading-tight">
              Our{' '}
              <span className="text-accent-red">Mission</span>
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-gray-300 leading-relaxed">
              We are a family property business that transforms tired homes into well-cared-for places to live, with a long-term commitment to quality, fairness, and responsibility.
            </p>
          </div>

          {/* Team Image */}
          <div className="order-1 lg:order-2 relative h-64 sm:h-80 md:h-96 lg:h-[450px] w-full rounded-lg overflow-hidden shadow-2xl">
            <Image
              src="/hero.jpeg"
              alt="Doorly Properties team"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-navy-950/60 to-transparent"></div>
          </div>
        </div>
      </div>
    </section>
  )
}

