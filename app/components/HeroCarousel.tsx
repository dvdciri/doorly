'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const AUTO_ADVANCE_MS = 3000

type HeroCarouselProps = {
  images: string[]
}

export default function HeroCarousel({ images }: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    if (currentIndex >= images.length) {
      setCurrentIndex(0)
    }
  }, [currentIndex, images.length])

  const clearAutoAdvance = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const goToSlide = useCallback(
    (index: number) => {
      if (images.length === 0) return
      setCurrentIndex((index + images.length) % images.length)
    },
    [images.length]
  )

  const goToNext = useCallback(() => {
    goToSlide(currentIndex + 1)
  }, [currentIndex, goToSlide])

  const goToPrevious = useCallback(() => {
    goToSlide(currentIndex - 1)
  }, [currentIndex, goToSlide])

  useEffect(() => {
    clearAutoAdvance()

    if (images.length <= 1 || prefersReducedMotion || isPaused) {
      return
    }

    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length)
    }, AUTO_ADVANCE_MS)

    return clearAutoAdvance
  }, [currentIndex, images.length, isPaused, prefersReducedMotion, clearAutoAdvance])

  if (images.length === 0) {
    return (
      <div className="relative h-64 sm:h-80 md:h-96 lg:h-[450px] w-full rounded-lg overflow-hidden shadow-2xl bg-navy-900" />
    )
  }

  return (
    <div
      className="group relative h-64 sm:h-80 md:h-96 lg:h-[450px] w-full rounded-lg overflow-hidden shadow-2xl"
      aria-roledescription="carousel"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {images.map((src, index) => (
        <div
          key={src}
          className={`absolute inset-0 transition-opacity duration-700 ${
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden={index !== currentIndex}
        >
          <Image
            src={src}
            alt={`Doorly Properties hero image ${index + 1}`}
            fill
            className="object-cover"
            priority={index === 0}
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>
      ))}

      <div className="absolute inset-0 bg-gradient-to-t from-navy-950/60 to-transparent pointer-events-none" />

      <p className="sr-only" aria-live="polite">
        Slide {currentIndex + 1} of {images.length}
      </p>

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={goToPrevious}
            aria-label="Previous slide"
            className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-navy-950/60 text-gray-50 opacity-0 transition-opacity duration-200 hover:bg-navy-950/80 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-accent-red group-hover:opacity-100"
          >
            <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>

          <button
            type="button"
            onClick={goToNext}
            aria-label="Next slide"
            className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-navy-950/60 text-gray-50 opacity-0 transition-opacity duration-200 hover:bg-navy-950/80 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-accent-red group-hover:opacity-100"
          >
            <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>

          <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-10 flex max-w-[90%] flex-wrap justify-center gap-2">
            {images.map((src, index) => (
              <button
                key={src}
                type="button"
                onClick={() => goToSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
                aria-current={index === currentIndex ? 'true' : undefined}
                className={`h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full transition-colors duration-200 ${
                  index === currentIndex
                    ? 'bg-accent-red'
                    : 'bg-gray-300/60 hover:bg-gray-200/80'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
