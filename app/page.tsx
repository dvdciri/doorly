import Navigation from './components/Navigation'
import Hero from './components/Hero'
import ProjectsSection from './components/ProjectsSection'
import TeamSection from './components/TeamSection'
import BehindTheScenes from './components/BehindTheScenes'
import EmptyHouseCTA from './components/EmptyHouseCTA'
import Footer from './components/Footer'

export default function Home() {
  return (
    <div className="min-h-screen bg-navy-gradient px-4 md:px-0">
      <Navigation />
      <Hero />
      <EmptyHouseCTA />
      <ProjectsSection />
      <TeamSection />
      <BehindTheScenes />
      <Footer />
    </div>
  )
}
