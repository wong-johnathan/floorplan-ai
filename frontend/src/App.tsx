import { BrowserRouter, Routes, Route } from 'react-router-dom'

function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
        Floorplan AI
      </h1>
      <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
        Design your dream HDB flat
      </p>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
