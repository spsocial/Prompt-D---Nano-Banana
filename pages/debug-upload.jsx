import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

export default function DebugUpload() {
  const [files, setFiles] = useState([])
  const [logs, setLogs] = useState([])

  const addLog = (msg) => {
    console.log(msg)
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`])
  }

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    addLog(`onDrop called - accepted: ${acceptedFiles.length}, rejected: ${rejectedFiles.length}`)

    if (rejectedFiles.length > 0) {
      rejectedFiles.forEach(f => {
        addLog(`Rejected: ${f.file.name} - ${f.errors.map(e => e.message).join(', ')}`)
      })
    }

    acceptedFiles.forEach((file, i) => {
      addLog(`Processing file ${i + 1}: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`)

      const reader = new FileReader()
      reader.onload = (e) => {
        addLog(`File ${file.name} loaded as base64`)
        setFiles(prev => {
          const newFiles = [...prev, { name: file.name, preview: e.target.result }]
          addLog(`Total files now: ${newFiles.length}`)
          return newFiles
        })
      }
      reader.onerror = (e) => {
        addLog(`Error reading ${file.name}: ${e}`)
      }
      reader.readAsDataURL(file)
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'] },
    multiple: true,
    maxSize: 10 * 1024 * 1024
  })

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Debug Multiple File Upload</h1>

      <div
        {...getRootProps()}
        className={`border-4 border-dashed p-12 text-center cursor-pointer rounded-xl mb-4 ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}
      >
        <input {...getInputProps()} />
        <p className="text-xl font-bold">
          {isDragActive ? 'Drop files here!' : 'Drag & drop multiple images here'}
        </p>
        <p className="text-gray-500 mt-2">or click to select files (Ctrl+Click for multiple)</p>
      </div>

      <div className="mb-4">
        <h2 className="font-bold text-lg">Files loaded: {files.length}</h2>
        <div className="grid grid-cols-4 gap-2 mt-2">
          {files.map((file, i) => (
            <div key={i} className="relative">
              <img src={file.preview} alt={file.name} className="w-full h-24 object-cover rounded" />
              <p className="text-xs truncate">{file.name}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-black text-green-400 p-4 rounded font-mono text-sm max-h-64 overflow-auto">
        <h3 className="text-white font-bold mb-2">Console Log:</h3>
        {logs.map((log, i) => (
          <div key={i}>{log}</div>
        ))}
        {logs.length === 0 && <div className="text-gray-500">Waiting for file upload...</div>}
      </div>

      <button
        onClick={() => { setFiles([]); setLogs([]); }}
        className="mt-4 px-4 py-2 bg-red-500 text-white rounded"
      >
        Clear All
      </button>
    </div>
  )
}
