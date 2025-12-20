export default function Footer() {
  return (
    <footer className="w-full bg-navy-950 border-t border-navy-800 py-8 md:py-12">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 md:gap-8">
          <div className="text-center md:text-left">
            <h3 className="text-xl md:text-2xl font-bold text-gray-50 mb-2">
              Doorly Properties
            </h3>
            <p className="text-gray-400 text-sm md:text-base">
              Property investment company
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-3 sm:gap-4 md:gap-8 items-center">
            <a
              href="mailto:doorly.properties@gmail.com"
              className="text-accent-red hover:text-accent-red/80 transition-colors text-sm sm:text-base md:text-lg font-semibold flex items-center gap-2 break-all text-center"
            >
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <span className="break-all">doorly.properties@gmail.com</span>
            </a>
            <a
              href="tel:+4407761108037"
              className="text-accent-red hover:text-accent-red/80 transition-colors text-sm sm:text-base md:text-lg font-semibold flex items-center gap-2 whitespace-nowrap"
            >
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              +44 07761108037
            </a>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-navy-800 text-center">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} Doorly Properties Limited. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

