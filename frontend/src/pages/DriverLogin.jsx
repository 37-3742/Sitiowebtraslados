import React, { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

export default function DriverLogin(){
  const [username,setUsername] = useState('')
  const [password,setPassword] = useState('')
  const [eventCode,setEventCode] = useState('')
  const navigate = useNavigate()

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000'

  async function handleLogin(e){
    e.preventDefault()
    try{
      const res = await axios.post(apiBase+"/api/driver/login", { username, password })
      const token = res.data.token
      const driverId = res.data.driverId
      // create event with token
      const eventRes = await axios.post(apiBase+"/api/events", { name: 'Evento '+eventCode, code: eventCode }, { headers: { Authorization: `Bearer ${token}` } })
      const eventId = eventRes.data._id
      localStorage.setItem('token', token)
      localStorage.setItem('driverId', driverId)
      localStorage.setItem('eventId', eventId)
      navigate('/driver')
    }catch(err){
      alert('Error de login')
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h2>Ingreso Chofer</h2>
        <form onSubmit={handleLogin}>
          <div>
            <label>Usuario</label>
            <input value={username} onChange={(e)=>setUsername(e.target.value)} />
          </div>
          <div>
            <label>Contraseña</label>
            <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
          </div>
          <div>
            <label>Código de evento</label>
            <input value={eventCode} onChange={(e)=>setEventCode(e.target.value)} placeholder="ej: ABC123" />
          </div>
          <div style={{marginTop:12}}>
            <button className="btn large" type="submit">Entrar y conectar evento</button>
          </div>
        </form>
      </div>
    </div>
  )
}