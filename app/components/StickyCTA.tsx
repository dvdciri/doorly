'use client'

export default function StickyCTA() {
  const scrollToForm = () => {
    const formElement = document.getElementById('hero-form')
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
      // Focus the first input after scrolling
      setTimeout(() => {
        const firstInput = formElement.querySelector('input, select') as HTMLElement
        if (firstInput) {
          firstInput.focus()
        }
      }, 500)
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="bg-navy-900/95 backdrop-blur-md border-t border-navy-800/50 shadow-2xl">
        <div className="px-4 py-3">
          <button
            onClick={scrollToForm}
            className="w-full bg-accent-blue hover:bg-accent-blue-dark text-white py-4 px-6 min-h-[56px] rounded-xl font-semibold text-base sm:text-lg transition-all shadow-lg shadow-accent-blue/20 active:scale-95"
          >
            Get my offer
          </button>
        </div>
      </div>
    </div>
  )
}

