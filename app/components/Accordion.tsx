'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface AccordionItemProps {
  question: string
  answer: string
  defaultOpen?: boolean
}

function AccordionItem({ question, answer, defaultOpen = false }: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-navy-800/50">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-4 sm:py-5 min-h-[56px] text-left flex items-center justify-between gap-4 focus:outline-none focus:ring-2 focus:ring-accent-blue rounded-lg px-2 -mx-2 active:bg-navy-800/30"
        aria-expanded={isOpen}
      >
        <h4 className="text-base sm:text-lg font-semibold text-gray-50 pr-4 break-words">{question}</h4>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="pb-4 sm:pb-5 text-gray-300 leading-relaxed text-sm sm:text-base break-words">{answer}</div>
      </div>
    </div>
  )
}

interface AccordionProps {
  items: Array<{ question: string; answer: string }>
}

export default function Accordion({ items }: AccordionProps) {
  return (
    <div className="space-y-0">
      {items.map((item, index) => (
        <AccordionItem key={index} question={item.question} answer={item.answer} />
      ))}
    </div>
  )
}

