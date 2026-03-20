import React, { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import DriverLogin from './pages/DriverLogin'
import DriverPanel from './pages/DriverPanel'
import EventView from './pages/EventView'
import Home from './pages/Home'
import AdminLogin from './pages/AdminLogin'
import AdminPanel from './pages/AdminPanel'
import './styles.css'

function applyTabLogo(iconUrl){
  if(!iconUrl) return

  let favicon = document.querySelector('link[rel="icon"]')
  if(!favicon){
    favicon = document.createElement('link')
    favicon.setAttribute('rel', 'icon')
    document.head.appendChild(favicon)
  }

  favicon.setAttribute('href', iconUrl)
}

function App(){
  useEffect(()=>{
    const api = import.meta.env.VITE_API_URL || 'http://localhost:4000'
    let cancelled = false

    async function loadTabLogo(){
      try{
        const res = await fetch(api + '/api/settings')
        if(!res.ok) return

        const settings = await res.json()
        const logoPath = settings && settings.logo ? settings.logo : ''
        if(!logoPath || cancelled) return

        const logoUrl = logoPath.startsWith('http') ? logoPath : `${api}${logoPath}`
        applyTabLogo(logoUrl)
      }catch(err){
        console.error('Error loading tab logo', err)
      }
    }

    loadTabLogo()
    return ()=>{ cancelled = true }
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home/>} />
        <Route path="/admin/login" element={<AdminLogin/>} />
        <Route path="/admin" element={<AdminPanel/>} />
        <Route path="/driver/login" element={<DriverLogin/>} />
        <Route path="/driver" element={<DriverPanel/>} />
        <Route path="/evento/:id" element={<EventView/>} />
      </Routes>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')).render(<App />)