# Prompt-D - Nano Banana

AI-powered product photography generator with multiple AI models support

## Features

- 🎨 Multiple AI Models (OpenAI, Gemini, Replicate)
- 📸 Image upload and camera capture
- 🎭 Three preset prompt styles + custom prompt option
- 📱 Fully responsive design
- 📊 History tracking with localStorage
- 🚀 Next.js with Tailwind CSS

## Setup

1. Install dependencies:
```bash
npm install
```

2. Add your API keys to `.env.local`:
```env
OPENAI_API_KEY=your_openai_api_key
GOOGLE_API_KEY=your_google_api_key
REPLICATE_API_TOKEN=your_replicate_token
```

3. Run development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Technologies Used

- Next.js 13
- React
- Tailwind CSS
- Zustand (State Management)
- OpenAI API
- Google Gemini API
- Replicate API

## License

MIT