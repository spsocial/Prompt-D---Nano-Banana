// Utility functions for image compression

export async function compressImage(base64String, maxWidth = 800, quality = 0.6) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      // Calculate new dimensions
      let width = img.width
      let height = img.height

      // Only resize if image is larger than maxWidth
      if (width > maxWidth) {
        height = (maxWidth / width) * height
        width = maxWidth
      }

      canvas.width = width
      canvas.height = height

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height)

      // Convert to compressed JPEG
      const compressedBase64 = canvas.toDataURL('image/jpeg', quality)

      // Log compression stats
      const originalSize = (base64String.length * 0.75) / 1024 // KB
      const compressedSize = (compressedBase64.length * 0.75) / 1024 // KB
      console.log(`Image compressed: ${originalSize.toFixed(0)}KB → ${compressedSize.toFixed(0)}KB (${((1 - compressedSize/originalSize) * 100).toFixed(0)}% reduction)`)

      resolve(compressedBase64)
    }
    img.src = base64String
  })
}

export function estimateSize(base64String) {
  if (!base64String) return 0
  // Estimate size in KB
  return (base64String.length * 0.75) / 1024
}