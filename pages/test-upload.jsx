import { useState } from 'react'

export default function TestUpload() {
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])

  const handleChange = (e) => {
    const selectedFiles = Array.from(e.target.files || [])
    console.log('Selected files:', selectedFiles.length)

    setFiles(prev => [...prev, ...selectedFiles])

    selectedFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreviews(prev => [...prev, e.target.result])
      }
      reader.readAsDataURL(file)
    })
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Test Multiple Upload in React</h1>

      <input
        type="file"
        multiple
        accept="image/*"
        onChange={handleChange}
      />

      <p>Files: {files.length}</p>
      <p>Previews: {previews.length}</p>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 20 }}>
        {previews.map((src, i) => (
          <img key={i} src={src} style={{ width: 100, height: 100, objectFit: 'cover' }} />
        ))}
      </div>
    </div>
  )
}
