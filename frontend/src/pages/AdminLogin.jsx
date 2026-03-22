import React, { useState } from 'react'
import axios from 'axios'
import { useNavigate, Link } from 'react-router-dom'

export default function AdminLogin(){
  const [username,setUsername] = useState('')
  const [password,setPassword] = useState('')
  const navigate = useNavigate()
  const api = import.meta.env.VITE_API_URL || 'http://localhost:4000'

  async function handleLogin(e){
    e.preventDefault()
    try{
      const res = await axios.post(api+"/api/admin/login", { username, password })
      const token = res.data.token
      const canManageAdmins = res?.data?.canManageAdmins === true
      localStorage.setItem('adminToken', token)
      localStorage.setItem('adminCanManageUsers', canManageAdmins ? '1' : '0')
      navigate('/admin')
    }catch(err){
      alert('Error login admin')
    }
  }

  return (
    <div className="dl-page">
      <div className="dl-card">
        <div className="dl-brand">
          <div className="dl-brand-name">Eventos Traslados</div>
          <div className="dl-brand-sub">Panel Administrador</div>
        </div>

        <form className="dl-form" onSubmit={handleLogin}>
          <div className="dl-field">
            <label className="dl-label">Usuario o email</label>
            <input className="dl-input" type="text" placeholder="admin o correo@dominio.com" value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username" required />
          </div>
          <div className="dl-field">
            <label className="dl-label">Contraseña</label>
            <input className="dl-input" type="password" placeholder="Contraseña" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required />
          </div>
          <button className="dl-submit" type="submit">Ingresar</button>
          <Link to="/" style={{textAlign:'center',fontSize:13,color:'var(--muted)'}}>← Volver al inicio</Link>
        </form>
      </div>
    </div>
  )
}