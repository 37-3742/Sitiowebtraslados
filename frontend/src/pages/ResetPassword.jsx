import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function ResetPassword(){
  const [searchParams] = useSearchParams();
  const [identifier, setIdentifier] = useState('');
  const [debugResetUrl, setDebugResetUrl] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const navigate = useNavigate();
  const api = import.meta.env.VITE_API_URL || 'http://localhost:4000';

  useEffect(()=>{
    const t = searchParams.get('token') || '';
    if(t) setToken(t);
  },[searchParams]);

  async function requestReset(e){
    e.preventDefault();
    setError('');
    setDebugResetUrl('');
    setLoading(true);
    try{
      const res = await axios.post(`${api}/api/admin/reset-password`, { identifier });
      if(res?.data?.debugResetUrl) setDebugResetUrl(res.data.debugResetUrl);
      setSent(true);
    }catch(err){
      setError(err?.response?.data?.message || err.message || 'Error al solicitar cambio');
    }finally{ setLoading(false); }
  }

  async function confirmReset(e){
    e.preventDefault();
    setError('');
    if(!token){ setError('Token inválido'); return; }
    if(!password || password.length < 6){ setError('La contraseña debe tener al menos 6 caracteres'); return; }
    setLoading(true);
    try{
      await axios.post(`${api}/api/admin/reset-password/confirm`, { token, password });
      setConfirmed(true);
      // opcional: redirigir al login
      setTimeout(()=> navigate('/admin/login'), 1800);
    }catch(err){
      setError(err?.response?.data?.message || err.message || 'Error al confirmar cambio');
    }finally{ setLoading(false); }
  }

  return (
    <div className="container">
      <div className="form-panel card" style={{maxWidth:520,margin:'24px auto'}}>
        <div className="panel-header">
          <h3 className="card-title">Cambiar contraseña</h3>
        </div>
        <div className="card-body">
          {!token ? (
            !sent ? (
              <form onSubmit={requestReset}>
                <label className="muted">Usuario o email</label>
                <input className="input" value={identifier} onChange={e=>setIdentifier(e.target.value)} placeholder="admin o admin@email.com" required />
                {error && <div style={{color:'#ef4444',marginTop:8}}>{error}</div>}
                <div style={{display:'flex',gap:8,marginTop:12}}>
                  <button className="btn" type="submit" disabled={loading}>{loading ? 'Enviando...' : 'Solicitar cambio'}</button>
                  <Link to="/admin/login" className="btn ghost">Volver</Link>
                </div>
              </form>
            ) : (
              <div>
                <p>Si la cuenta existe, se generó un enlace de recuperación.</p>
                {debugResetUrl && (
                  <p style={{marginTop:10}}>
                    Entorno local: <a href={debugResetUrl}>abrir enlace de recuperación</a>
                  </p>
                )}
                <Link to="/admin/login" className="btn">Volver al login</Link>
              </div>
            )
          ) : (
            !confirmed ? (
              <form onSubmit={confirmReset}>
                <label className="muted">Nueva contraseña</label>
                <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Nueva contraseña" required />
                {error && <div style={{color:'#ef4444',marginTop:8}}>{error}</div>}
                <div style={{display:'flex',gap:8,marginTop:12}}>
                  <button className="btn" type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Establecer contraseña'}</button>
                  <Link to="/admin/login" className="btn ghost">Volver</Link>
                </div>
              </form>
            ) : (
              <div>
                <p>Contraseña cambiada correctamente. Serás redirigido al login...</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
