#!/usr/bin/env node
/**
 * Generate macOS .icns icon from SVG
 * 
 * This script converts the SVG favicon to a PNG, then creates an .icns file
 * using macOS iconutil.
 * 
 * Requirements:
 * - macOS with iconutil (built-in)
 * - Node.js with sharp: pnpm add -D sharp
 */

import { execSync } from 'child_process'
import { existsSync, mkdirSync, rmSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')
const publicDir = join(rootDir, 'public')
const iconsetDir = join(publicDir, 'icon.iconset')

// Icon sizes required for macOS .icns
const sizes = [16, 32, 64, 128, 256, 512, 1024]

try {
  // Check if sharp is available
  let sharp
  try {
    sharp = (await import('sharp')).default
  } catch (e) {
    console.error('Error: sharp is required. Install it with: pnpm add -D sharp')
    process.exit(1)
  }

  console.log('Generating icon from SVG...')

  // Create iconset directory
  if (existsSync(iconsetDir)) {
    rmSync(iconsetDir, { recursive: true })
  }
  mkdirSync(iconsetDir, { recursive: true })

  // Read SVG
  const svgPath = join(publicDir, 'favicon.svg')
  if (!existsSync(svgPath)) {
    console.error(`Error: ${svgPath} not found`)
    process.exit(1)
  }

  // Generate PNG files at different sizes
  for (const size of sizes) {
    const outputPath = join(iconsetDir, `icon_${size}x${size}.png`)
    const outputPath2x = join(iconsetDir, `icon_${size}x${size}@2x.png`)

    await sharp(svgPath)
      .resize(size, size)
      .png()
      .toFile(outputPath)

    await sharp(svgPath)
      .resize(size * 2, size * 2)
      .png()
      .toFile(outputPath2x)

    console.log(`Generated ${size}x${size} and ${size * 2}x${size * 2} icons`)
  }

  // Use iconutil to create .icns
  const icnsPath = join(publicDir, 'favicon.icns')
  if (existsSync(icnsPath)) {
    rmSync(icnsPath)
  }

  console.log('Creating .icns file...')
  execSync(`iconutil -c icns "${iconsetDir}" -o "${icnsPath}"`, {
    stdio: 'inherit',
    cwd: rootDir
  })

  // Clean up iconset directory
  rmSync(iconsetDir, { recursive: true })

  console.log(`✅ Icon generated: ${icnsPath}`)
  console.log('Now uncomment the icon line in electron-builder.yml')
} catch (error) {
  console.error('Error generating icon:', error.message)
  process.exit(1)
}

