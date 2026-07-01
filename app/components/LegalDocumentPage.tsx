import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface LegalDocumentPageProps {
  title: string
  content: React.ReactNode
  backHref?: string
}

export default function LegalDocumentPage({
  title,
  content,
  backHref = '/',
}: LegalDocumentPageProps) {
  return (
    <div className="min-h-screen bg-navy-gradient">
      <header className="px-4 sm:px-6 lg:px-8 pt-8 pb-6 border-b border-navy-800/50">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-6">
          <Link href={backHref}>
            <Image
              src="/logo-red.png"
              alt="Doorly Properties"
              width={180}
              height={72}
              className="h-auto w-auto max-w-[180px]"
            />
          </Link>
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-accent-red transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        <article className="max-w-4xl mx-auto">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-50 mb-8">
            {title}
          </h1>
          <div className="text-gray-300 text-sm sm:text-base leading-relaxed space-y-6">
            {content}
          </div>
        </article>
      </main>

      <footer className="px-4 sm:px-6 lg:px-8 py-8 border-t border-navy-800/50">
        <p className="text-gray-500 text-sm text-center">
          © {new Date().getFullYear()} Doorly Properties Limited. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
