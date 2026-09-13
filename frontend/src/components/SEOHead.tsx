import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

interface SEOHeadProps {
  title?: string
  description?: string
  ogImage?: string
  canonicalPath?: string
}

const DEFAULT_TITLE = 'Visualize — Business KPI Tracking Made Simple'
const DEFAULT_DESCRIPTION =
  'Track every KPI that matters, connect your data sources, and share dashboards with your team in minutes.'
const BASE_URL = 'https://visualize.io'

export function SEOHead({
  title,
  description = DEFAULT_DESCRIPTION,
  ogImage = `${BASE_URL}/og-image.png`,
  canonicalPath,
}: SEOHeadProps) {
  const location = useLocation()
  const pageTitle = title ? `${title} | Visualize` : DEFAULT_TITLE
  const pageUrl = `${BASE_URL}${canonicalPath || location.pathname}`

  useEffect(() => {
    // 1. Update Title
    document.title = pageTitle

    // 2. Helper to set or update meta tag by name or property
    const updateMeta = (attribute: 'name' | 'property', attrValue: string, content: string) => {
      let element = document.querySelector(`meta[${attribute}="${attrValue}"]`)
      if (!element) {
        element = document.createElement('meta')
        element.setAttribute(attribute, attrValue)
        document.head.appendChild(element)
      }
      element.setAttribute('content', content)
    }

    // 3. Update Standard Meta
    updateMeta('name', 'description', description)

    // 4. Update OpenGraph
    updateMeta('property', 'og:title', pageTitle)
    updateMeta('property', 'og:description', description)
    updateMeta('property', 'og:url', pageUrl)
    updateMeta('property', 'og:image', ogImage)

    // 5. Update Twitter
    updateMeta('name', 'twitter:title', pageTitle)
    updateMeta('name', 'twitter:description', description)
    updateMeta('name', 'twitter:image', ogImage)

    // 6. Update Canonical Link
    let canonical = document.querySelector('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.setAttribute('rel', 'canonical')
      document.head.appendChild(canonical)
    }
    canonical.setAttribute('href', pageUrl)
  }, [pageTitle, description, pageUrl, ogImage])

  return null
}
