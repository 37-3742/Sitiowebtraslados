import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import DriverLogin from './pages/DriverLogin'
import DriverPanel from './pages/DriverPanel'
import EventView from './pages/EventView'
import './styles.css'

function App(){
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DriverLogin/>} />
        <Route path="/driver" element={<DriverPanel/>} />
        <Route path="/evento/:id" element={<EventView/>} />
      </Routes>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')).render(<App />)