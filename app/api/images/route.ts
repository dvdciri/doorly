import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    const publicPath = path.join(process.cwd(), 'public', 'behind')
    const files = fs.readdirSync(publicPath)
    
    // Filter for image files
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.JPG', '.JPEG', '.PNG', '.WEBP']
    const imageFiles = files
      .filter(file => imageExtensions.some(ext => file.endsWith(ext)))
      .map(file => `behind/${file}`)
      .sort() // Sort alphabetically for consistent ordering
    
    return NextResponse.json({ images: imageFiles })
  } catch (error) {
    console.error('Error reading images directory:', error)
    return NextResponse.json({ images: [] }, { status: 500 })
  }
}

