import React, { useState } from 'react'
import axios from 'axios'

export default function DriverPanel(){
  const [message,setMessage] = useState('')
  const driverId = localStorage.getItem('driverId')
  const eventId = localStorage.getItem('eventId')
  const token = localStorage.getItem('token')
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000'

  async function markArrived(){
    if(!navigator.geolocation){
      alert('Geolocalización no soportada')
      return
    }
    setMessage('Obteniendo ubicación...')
    navigator.geolocation.getCurrentPosition(async (pos)=>{
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      try{
        await axios.post(apiBase+`/api/driver/${driverId}/arrived`, { eventId, lat, lng }, { headers: { Authorization: `Bearer ${token}` } })
        setMessage('Ubicación guardada. Confirmado: llegaste al punto de encuentro.')
      }catch(err){
        console.error(err)
        setMessage('Error al guardar la ubicación')
      }
    }, (err)=>{
      console.error(err)
      setMessage('Error obteniendo ubicación')
    }, { enableHighAccuracy: true })
  }

  return (
    <div className="container">
      <div className="card">
        <div className="header">
          <h2>Panel Chofer</h2>
        </div>
        <p>Evento ID: {eventId}</p>
        <div style={{marginTop:12}}>
          <button className="btn large" onClick={markArrived}>Llegué al punto de encuentro</button>
        </div>
        {message && <p style={{marginTop:12}}>{message}</p>}
        <p style={{marginTop:8,fontSize:12,color:'#6b7280'}}>Comparte este link con clientes: {window.location.origin}/evento/{eventId}</p>
      </div>
    </div>
  )
}