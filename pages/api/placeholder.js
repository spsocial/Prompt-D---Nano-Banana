export default function handler(req, res) {
  const { style = 'default', seed = '1' } = req.query

  // Map styles to colors for placeholder images
  const styleColors = {
    'Minimalist Premium': '#F5F5F5',
    'Lifestyle Context': '#FFF5E6',
    'Bold & Modern': '#FFE4B5',
    'Elegant Classic': '#2C2C2C',
    'error': '#FFE0E0',
    'default': '#FFF8DC'
  }

  const bgColor = styleColors[style] || styleColors.default
  const textColor = style === 'Elegant Classic' ? 'white' : '#333333'

  // Generate SVG placeholder image
  const svg = `
    <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="600" fill="${bgColor}"/>

      <!-- Decorative elements -->
      <circle cx="400" cy="300" r="150" fill="${bgColor === '#2C2C2C' ? '#444' : '#FFF'}" opacity="0.3"/>
      <circle cx="400" cy="300" r="100" fill="${bgColor === '#2C2C2C' ? '#555' : '#FFF'}" opacity="0.4"/>

      <!-- Product placeholder -->
      <rect x="300" y="200" width="200" height="200" rx="20" fill="${bgColor === '#2C2C2C' ? '#666' : '#FFC107'}" opacity="0.6"/>

      <!-- Text -->
      <text x="400" y="450" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="${textColor}" text-anchor="middle">
        ${style}
      </text>
      <text x="400" y="480" font-family="Arial, sans-serif" font-size="16" fill="${textColor}" opacity="0.7" text-anchor="middle">
        Premium Advertisement
      </text>

      <!-- Banana icon -->
      <text x="400" y="530" font-size="40" text-anchor="middle">🍌</text>
    </svg>
  `

  res.setHeader('Content-Type', 'image/svg+xml')
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  res.status(200).send(svg)
}