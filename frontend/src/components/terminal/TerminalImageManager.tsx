// Terminal image marker parsing and responsive sizing

export interface ImageMarker {
  url: string
  alt?: string
}

export interface ParseResult {
  text: string
  images: ImageMarker[]
}

export function parseImageMarkers(text: string): ParseResult {
  // Parse image markers like ![alt](url) or [IMG:url]
  const images: ImageMarker[] = []
  let cleanText = text

  // Match markdown image syntax: ![alt](url)
  const markdownRegex = /!\[([^\]]*)\]\(([^\)]+)\)/g
  let match: RegExpExecArray | null

  while ((match = markdownRegex.exec(text)) !== null) {
    images.push({
      url: match[2],
      alt: match[1] || 'Image'
    })
  }

  // Remove image markers from text
  cleanText = cleanText.replace(markdownRegex, '[Image]')

  // Match custom [IMG:url] syntax
  const customRegex = /\[IMG:([^\]]+)\]/g
  while ((match = customRegex.exec(text)) !== null) {
    images.push({
      url: match[1],
      alt: 'Image'
    })
  }

  cleanText = cleanText.replace(customRegex, '[Image]')

  return { text: cleanText, images }
}

export interface ImageDimensions {
  maxWidth: number
  maxHeight: number
}

export function getResponsiveImageDimensions(
  breakpoint: 'mobile' | 'tablet' | 'desktop'
): ImageDimensions {
  // IMPORTANT: These values MUST match the CSS max-height in terminal.css
  // to prevent gaps between container minHeight and actual image height
  const sizes: Record<string, ImageDimensions> = {
    mobile: { maxWidth: 280, maxHeight: 150 },   // Matches CSS: max-height: 150px
    tablet: { maxWidth: 400, maxHeight: 240 },   // Matches CSS: max-height: 240px
    desktop: { maxWidth: 600, maxHeight: 350 }   // Matches CSS: max-height: 350px
  }

  return sizes[breakpoint] || sizes.mobile
}
