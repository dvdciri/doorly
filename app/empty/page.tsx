import Image from 'next/image'
import { FileText, Clock, Eye, CheckCircle, Shield, Users, EyeOff, Lock, ShieldCheck } from 'lucide-react'
import StepCard from '../components/StepCard'
import PropertyTypeCard from '../components/PropertyTypeCard'
import HeroForm from '../components/HeroForm'
import BenefitCard from '../components/BenefitCard'
import Accordion from '../components/Accordion'
import StickyCTA from '../components/StickyCTA'
import PageViewTracker from '../components/PageViewTracker'
import ScrollTracker from '../components/ScrollTracker'

export default function EmptyPage() {
  const propertyTypes = [
    'Probate',
    'Empty',
    'Tenanted',
    'Inherited',
    'Dated',
    'Unmortgageable',
    'Second Home',
    'Short Lease',
  ]

  const faqItems = [
    {
      question: 'Am I committed after submitting my property details?',
      answer: "No. Submitting your details is completely non-binding. You're free to withdraw at any stage and there is no obligation to proceed if the offer isn't right for you.",
    },
    {
      question: 'How do you calculate the offer price?',
      answer: "We assess your property based on recent local sales, current market conditions, and the property's condition. The initial price is a range, and a final offer is only made after a viewing so there are no surprises later.",
    },
    {
      question: 'Will my property be listed or shared publicly?',
      answer: "No. Your property is never listed online or shared with estate agents. The process is completely private and off-market, and only used to assess whether we're a good fit to buy your property.",
    },
    {
      question: 'Do I have to carry out repairs or clean the property?',
      answer: "No. We buy properties as they are. There's no need to make repairs, redecorate, or prepare the property for viewings — we take it in its current condition.",
    },
    {
      question: 'How quickly can the sale complete if I accept the offer?',
      answer: "Completion times are flexible and agreed with you. If you need a fast sale, we can move quickly. If you need more time, we'll work around your preferred timeline.",
    },
    {
      question: 'Are there any fees or hidden costs?',
      answer: 'No. There are no estate agent fees, no listing costs, and no hidden charges at any stage.',
    },
  ]

  return (
    <div className="min-h-screen bg-navy-gradient px-4 md:px-0">
      <PageViewTracker />
      <ScrollTracker />
      {/* Hero Section */}
      <section id="hero-form" className="px-4 sm:px-6 lg:px-8 pt-12 pb-8 md:pt-20 md:pb-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <div className="flex justify-center mb-6 md:mb-8">
              <Image
                src="/logo-red.png"
                alt="Doorly Properties"
                width={200}
                height={80}
                className="h-auto w-auto max-w-[200px] md:max-w-[250px]"
                priority
              />
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-50 mb-4 md:mb-6 leading-tight px-2">
              A simpler way to sell your{' '}
              <span className="text-accent-red">house</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 max-w-2xl mx-auto leading-relaxed px-2">
              Sell directly to a cash buyer, in your property's current condition, with no agents, no fees, and no obligation.
            </p>
          </div>

          {/* Hero Form */}
          <div className="mb-8">
            <HeroForm />
          </div>

          {/* Trust Band */}
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-6 text-xs sm:text-sm md:text-base mb-8 md:mb-12">
            <div className="flex items-center gap-2 text-gray-300 min-h-[44px] px-2">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-accent-red flex-shrink-0" />
              <span>No fees</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300 min-h-[44px] px-2">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-accent-red flex-shrink-0" />
              <span>No agents</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300 min-h-[44px] px-2">
              <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-accent-red flex-shrink-0" />
              <span>Private sale</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300 min-h-[44px] px-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-accent-red flex-shrink-0" />
              <span>Cash offer in 48h</span>
            </div>
          </div>

          {/* How It Works Section */}
          <div className="mt-12 md:mt-20 mb-8 md:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-50 text-center mb-8 md:mb-12 px-2">
              How it{' '}
              <span className="text-accent-red">works</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <StepCard
                stepNumber={1}
                title="Submit property details"
                description="Tell us about your property using our simple form."
              />
              <StepCard
                stepNumber={2}
                title="Receive initial offer"
                description="Get a price offer range within 48 hours, with no obligation."
              />
              <StepCard
                stepNumber={3}
                title="Arrange a viewing"
                description="If you're happy with the offer, we'll arrange a convenient viewing."
              />
              <StepCard
                stepNumber={4}
                title="Receive official offer"
                description="After the viewing, receive your final cash offer with complete flexibility."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Property Types Section */}
      <section className="px-4 sm:px-6 lg:px-8 pt-12 md:pt-20 pb-12 md:pb-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-50 text-center mb-8 md:mb-12 px-2">
            What we're{' '}
            <span className="text-accent-red">looking to buy</span>
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {propertyTypes.map((type) => (
              <PropertyTypeCard key={type} label={type} />
            ))}
          </div>
          <p className="text-center text-gray-400 mt-6 text-sm md:text-base">
            If it's not listed, still submit — we'll take a look.
          </p>
          
          {/* House Images */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8 md:mt-12">
            <div className="relative aspect-video overflow-hidden rounded-xl">
              <Image
                src="/house.jpg"
                alt="Property example"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 33vw"
              />
            </div>
            <div className="relative aspect-video overflow-hidden rounded-xl">
              <Image
                src="/house1.webp"
                alt="Property example"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 33vw"
              />
            </div>
            <div className="relative aspect-video overflow-hidden rounded-xl">
              <Image
                src="/house3.jpg"
                alt="Property example"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 33vw"
              />
            </div>
            <div className="relative aspect-video overflow-hidden rounded-xl">
              <Image
                src="/house4.jpg"
                alt="Property example"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 33vw"
              />
            </div>
            <div className="relative aspect-video overflow-hidden rounded-xl">
              <Image
                src="/house5.jpg"
                alt="Property example"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 33vw"
              />
            </div>
            <div className="relative aspect-video overflow-hidden rounded-xl">
              <Image
                src="/house6.webp"
                alt="Property example"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 33vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="px-4 sm:px-6 lg:px-8 pt-12 md:pt-20 pb-12 md:pb-20 bg-navy-900/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-50 text-center mb-8 md:mb-12 px-2">
            Why choose{' '}
            <span className="text-accent-red">us</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <BenefitCard
              icon={<Shield className="w-8 h-8" />}
              title="No fees"
              description="No hidden fees, no agent commissions."
            />
            <BenefitCard
              icon={<Users className="w-8 h-8" />}
              title="No agents"
              description="Deal directly with us. No middlemen, no delays."
            />
            <BenefitCard
              icon={<EyeOff className="w-8 h-8" />}
              title="No viewings until agreed"
              description="We provide an offer range first. Viewings only happen if you're interested."
            />
            <BenefitCard
              icon={<Lock className="w-8 h-8" />}
              title="Sell as is"
              description="Private, off-market sale. No repairs needed, sell in any condition."
            />
          </div>
        </div>
      </section>

      {/* Peace of Mind Section */}
      <section className="px-4 sm:px-6 lg:px-8 pt-12 md:pt-20 pb-12 md:pb-20">
        <div className="max-w-4xl mx-auto">
          <div className="bg-navy-900/50 border border-accent-red/30 rounded-2xl p-8 md:p-12 shadow-xl">
            <div className="flex justify-center mb-6">
              <div className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-accent-red/20 border border-accent-red/30">
                <ShieldCheck className="w-8 h-8 sm:w-10 sm:h-10 text-accent-red" />
              </div>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-50 mb-6 text-center px-2">
              Complete{' '}
              <span className="text-accent-red">peace of mind</span>
            </h2>
            <div className="space-y-4 text-gray-300 text-base sm:text-lg leading-relaxed text-center px-2">
              <p>
                There is no obligation at any stage. You're in complete control of the process,
                and you can withdraw at any time.
              </p>
              <p>
                We understand that selling a property is a personal decision. That's why we
                ensure complete privacy and discretion throughout. Your property sale remains
                completely off-market, and we work around your timeline.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="px-4 sm:px-6 lg:px-8 pt-12 md:pt-20 pb-12 md:pb-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-50 text-center mb-8 md:mb-12 px-2">
            Frequently asked{' '}
            <span className="text-accent-red">questions</span>
          </h2>
          <Accordion items={faqItems} />
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 sm:px-6 lg:px-8 py-12 border-t border-navy-800/50 mt-20 md:mt-32 pb-20 md:pb-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-gray-400 text-sm">
              <p>© {new Date().getFullYear()} Doorly Properties Limited. All rights reserved.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs sm:text-sm">
              <a href="mailto:doorly.properties@gmail.com" className="text-accent-red hover:text-accent-red/80 transition-colors min-h-[44px] flex items-center px-2 break-all">
                doorly.properties@gmail.com
              </a>
              <a href="tel:+447761108037" className="text-accent-red hover:text-accent-red/80 transition-colors min-h-[44px] flex items-center px-2">
                +44 07761108037
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Sticky Mobile CTA */}
      <StickyCTA />
    </div>
  )
}

