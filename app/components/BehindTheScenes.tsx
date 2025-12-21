'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

export default function BehindTheScenes() {
  const [images, setImages] = useState<string[]>([])

  useEffect(() => {
    async function fetchImages() {
      try {
        const response = await fetch('/api/images')
        const data = await response.json()
        if (data.images) {
          setImages(data.images)
        }
      } catch (error) {
        console.error('Error fetching images:', error)
      }
    }
    fetchImages()
  }, [])
  return (
    <section className="w-full py-8 sm:py-12 md:py-16 lg:py-20">
      <div className="container mx-auto px-4 sm:px-6 md:px-6 lg:px-8 max-w-7xl">
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-50 mb-6 sm:mb-8 md:mb-12 text-center px-2">
          Behind the{' '}
          <span className="text-accent-red">Scenes</span>
        </h2>
        {images.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">Loading images...</p>
          </div>
        ) : (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-3 md:gap-4">
            {images.map((image, index) => (
              <div
                key={image}
                className="break-inside-avoid mb-3 md:mb-4 group cursor-pointer"
              >
                <div className="relative overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                  <Image
                    src={`/${image}`}
                    alt={`Behind the scenes ${index + 1}`}
                    width={400}
                    height={600}
                    className="w-full h-auto object-cover rounded-lg"
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-950/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg pointer-events-none"></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

