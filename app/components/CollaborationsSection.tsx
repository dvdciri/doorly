import Image from 'next/image'

export default function CollaborationsSection() {
  return (
    <section className="w-full bg-navy-gradient py-8 sm:py-12 md:py-16 lg:py-20">
      <div className="container mx-auto px-4 sm:px-6 md:px-6 lg:px-8 max-w-7xl">
        <div className="max-w-5xl mx-auto">
          <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-400 mb-6 sm:mb-8 text-center">
            Made possible by our trusted partners
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 md:gap-10 lg:gap-12">
            <div className="h-12 sm:h-16 md:h-20 w-auto relative opacity-70 hover:opacity-100 transition-opacity">
              <Image
                src="/partners/inca-financial-logo.png"
                alt="Inca Financial"
                width={150}
                height={60}
                className="h-full w-auto object-contain"
              />
            </div>
            <div className="h-12 sm:h-16 md:h-20 w-auto relative opacity-70 hover:opacity-100 transition-opacity">
              <Image
                src="/partners/glaisyers-logo.png"
                alt="Glaisyers"
                width={150}
                height={60}
                className="h-full w-auto object-contain"
              />
            </div>
            <div className="h-12 sm:h-16 md:h-20 w-auto relative opacity-70 hover:opacity-100 transition-opacity">
              <Image
                src="/partners/partner3.png"
                alt="Partner"
                width={150}
                height={60}
                className="h-full w-auto object-contain"
              />
            </div>
            <div className="h-12 sm:h-16 md:h-20 w-auto relative opacity-70 hover:opacity-100 transition-opacity">
              <Image
                src="/partners/wards-logo.png"
                alt="Wards Property"
                width={150}
                height={60}
                className="h-full w-auto object-contain"
              />
            </div>
            <div className="h-12 sm:h-16 md:h-20 w-auto relative opacity-70 hover:opacity-100 transition-opacity">
              <Image
                src="/partners/oranges-logo.png"
                alt="Oranges Sales and Lettings"
                width={150}
                height={60}
                className="h-full w-auto object-contain"
              />
            </div>
            <div className="h-12 sm:h-16 md:h-20 w-auto relative opacity-70 hover:opacity-100 transition-opacity">
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
      </div>
    </section>
  )
}

