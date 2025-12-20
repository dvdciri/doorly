import Link from 'next/link'

export default function EmptyHouseCTA() {
  return (
    <section className="w-full bg-navy-950 py-6 sm:py-8 md:py-10 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 md:px-6 lg:px-8 max-w-4xl relative z-10">
        <div className="bg-navy-900/60 border border-navy-800 rounded-xl p-5 sm:p-6 md:p-8 shadow-lg">
          <div className="text-center">
            {/* Heading */}
            <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-50 mb-2 sm:mb-3 md:mb-4 leading-tight px-2">
              Second home or{' '}
              <span className="text-accent-red">empty house</span> to sell?
            </h2>
            
            {/* Subtitle */}
            <p className="text-xs sm:text-sm md:text-base text-gray-300 mb-4 sm:mb-5 md:mb-6 max-w-2xl mx-auto px-2">
              Get a fast, fair cash offer with no fees, no agents, and no obligation.
            </p>

            {/* CTA Button */}
            <Link
              href="/empty"
              className="inline-flex items-center gap-2 bg-accent-red hover:bg-accent-red/90 text-white font-semibold px-5 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-4 rounded-lg text-sm sm:text-base md:text-lg transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl group min-h-[44px]"
            >
              Get a cash offer
              <svg
                className="w-4 h-4 md:w-5 md:h-5 transition-transform group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

