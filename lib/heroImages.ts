import fs from 'fs'
import path from 'path'

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.JPG', '.JPEG', '.PNG', '.WEBP']

export function getHeroImages(): string[] {
  const heroPath = path.join(process.cwd(), 'public', 'hero')

  try {
    const files = fs.readdirSync(heroPath)
    return files
      .filter((file) => IMAGE_EXTENSIONS.some((ext) => file.endsWith(ext)))
      .sort()
      .map((file) => `/hero/${encodeURIComponent(file)}`)
  } catch {
    return []
  }
}
