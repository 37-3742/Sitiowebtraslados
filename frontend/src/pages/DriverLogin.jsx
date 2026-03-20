import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

export default function DriverLogin(){
  const [username,setUsername] = useState('')
  const [password,setPassword] = useState('')
  const [eventCode,setEventCode] = useState('')
  const [loading,setLoading] = useState(false)
  const [error,setError] = useState('')
  const [brandLogo,setBrandLogo] = useState(null)
  const navigate = useNavigate()

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000'

  useEffect(()=>{
    axios.get(apiBase+'/api/settings')
      .then(r=>{ if(r.data?.driverLoginLogo) setBrandLogo(apiBase + r.data.driverLoginLogo) })
      .catch(()=>{})
  }, [apiBase])

  async function handleLogin(e){
    e.preventDefault()
    setError('')
    setLoading(true)
    try{
      const res = await axios.post(apiBase+"/api/driver/login", { username, password })
      const token = res.data.token
      const driverId = res.data.driverId
      const eventRes = await axios.post(apiBase+"/api/events", { name: 'Evento '+eventCode, code: eventCode }, { headers: { Authorization: `Bearer ${token}` } })
      const eventId = eventRes.data._id
      localStorage.setItem('token', token)
      localStorage.setItem('driverId', driverId)
      localStorage.setItem('eventId', eventId)
      navigate('/driver')
    }catch(err){
      setError('Credenciales incorrectas o código de evento inválido.')
    }finally{setLoading(false)}
  }

  return (
    <div className="dl-page">
      <div className="dl-card">
        <div className="dl-brand">
          <div className="dl-brand-icon">
            {brandLogo
              ? <img src={brandLogo} alt="Logo" className="dl-brand-logo" />
              : <span>🚌</span>
            }
          </div>
          <div className="dl-brand-name">Eventos Traslados</div>
          <div className="dl-brand-sub">Portal de Choferes</div>
        </div>

        <form onSubmit={handleLogin} className="dl-form">
          <div className="dl-field">
            <label className="dl-label">Usuario</label>
            <input
              className="dl-input"
              value={username}
              onChange={(e)=>setUsername(e.target.value)}
              placeholder="Ingresá tu usuario"
              autoComplete="username"
              required
            />
          </div>

          <div className="dl-field">
            <label className="dl-label">Contraseña</label>
            <input
              className="dl-input"
              type="password"
              value={password}
              onChange={(e)=>setPassword(e.target.value)}
              placeholder="Ingresá tu contraseña"
              autoComplete="current-password"
              required
            />
          </div>

          <div className="dl-field">
            <label className="dl-label">Código de evento</label>
            <input
              className="dl-input"
              value={eventCode}
              onChange={(e)=>setEventCode(e.target.value.toUpperCase())}
              placeholder="ej: ABC123"
              required
            />
          </div>

          {error && <div className="dl-error">{error}</div>}

          <button className="dl-submit" type="submit" disabled={loading}>
            {loading ? <span className="dl-spinner" /> : null}
            {loading ? 'Conectando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}