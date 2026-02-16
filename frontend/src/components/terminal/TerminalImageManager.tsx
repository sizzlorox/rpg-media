// Terminal image marker parsing and responsive sizing

let imageIdCounter = 0

export interface ImageMarker {
  id: string
  url: string
  alt: string
}

export interface ParseResult {
  text: string
  images: ImageMarker[]
}

export function parseImageMarkers(text: string): ParseResult {
  // Parse image markers like [IMG:url:alt] or ![alt](url)
  const images: ImageMarker[] = []
  let cleanText = text

  // Match custom [IMG:url:alt] syntax
  // Format: [IMG:url:alt] where url can contain colons (e.g., https://...)
  // Strategy: Match [IMG:...], then split content to separate url and alt
  const customRegex = /\[IMG:([^\]]+)\]/g
  let match: RegExpExecArray | null

  while ((match = customRegex.exec(text)) !== null) {
    const content = match[1]
    // Split by last colon to handle URLs with colons
    const lastColonIndex = content.lastIndexOf(':')

    if (lastColonIndex === -1) {
      // No alt text provided, malformed marker - skip it
      continue
    }

    const url = content.substring(0, lastColonIndex)
    const alt = content.substring(lastColonIndex + 1)

    images.push({
      id: `img-${++imageIdCounter}`,
      url,
      alt
    })
  }

  // Remove custom image markers from text
  cleanText = cleanText.replace(customRegex, '')

  // Match markdown image syntax: ![alt](url)
  const markdownRegex = /!\[([^\]]*)\]\(([^\)]+)\)/g
  while ((match = markdownRegex.exec(text)) !== null) {
    images.push({
      id: `img-${++imageIdCounter}`,
      url: match[2],
      alt: match[1] || 'Image'
    })
  }

  // Remove markdown image markers from text
  cleanText = cleanText.replace(markdownRegex, '')

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
