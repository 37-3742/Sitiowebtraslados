import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

export default function AdminDashboard(){
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newProvince, setNewProvince] = useState('');

  const api = import.meta.env.VITE_API_URL || 'http://localhost:4000';
  const token = localStorage.getItem('adminToken');
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(()=>{
    fetchEvents();
  },[]);

  async function fetchEvents(){
    setLoading(true);
    setError('');
    try{
      const res = await axios.get(`${api}/api/events`);
      const list = Array.isArray(res.data) ? res.data : (res.data.events || []);
      setEvents(list);
    }catch(err){
      setError('No se pudo cargar eventos');
    }finally{ setLoading(false); }
  }

  function handleLogout(){
    localStorage.removeItem('adminToken');
    navigate('/admin/login');
  }

  async function handleDelete(id){
    if(!confirm('Eliminar evento?')) return;
    try{
      await axios.delete(`${api}/api/events/${id}`, { headers: authHeaders });
      setEvents(prev => prev.filter(e => (e.id || e._id) !== id && e._id !== id && e.id !== id));
    }catch(err){
      alert('Error al eliminar');
    }
  }

  async function handleCreate(e){
    e.preventDefault();
    if(!newTitle) return alert('Título requerido');
    try{
      const payload = { title: newTitle, date: newDate || new Date().toISOString(), province: newProvince };
      const res = await axios.post(`${api}/api/events`, payload, { headers: authHeaders });
      const created = res.data;
      setEvents(prev => [created, ...prev]);
      setShowCreate(false); setNewTitle(''); setNewDate(''); setNewProvince('');
    }catch(err){
      alert('Error creando evento');
    }
  }

  return (
    <div className="container">
      <div className="card" style={{maxWidth:1100,margin:'24px auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h3 className="card-title">Panel de administración</h3>
          <div style={{display:'flex',gap:8}}>
            <button className="btn" onClick={handleLogout}>Cerrar sesión</button>
            <Link to="/" className="btn ghost">Inicio</Link>
          </div>
        </div>

        <div style={{marginTop:16}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div className="helper">Eventos totales: {events.length}</div>
            <div>
              <button className="btn outline" onClick={()=>fetchEvents()}>Refrescar</button>
              <button className="btn" style={{marginLeft:8}} onClick={()=>setShowCreate(s=>!s)}>{showCreate ? 'Cerrar' : 'Crear evento'}</button>
            </div>
          </div>

          {showCreate && (
            <form onSubmit={handleCreate} style={{marginTop:12,display:'grid',gridTemplateColumns:'1fr 220px 160px 120px',gap:8}}>
              <input className="input" placeholder="Título" value={newTitle} onChange={e=>setNewTitle(e.target.value)} />
              <input className="input" type="datetime-local" value={newDate} onChange={e=>setNewDate(e.target.value)} />
              <input className="input" placeholder="Provincia" value={newProvince} onChange={e=>setNewProvince(e.target.value)} />
              <button className="btn" type="submit">Crear</button>
            </form>
          )}

          {loading && <div style={{marginTop:12}}>Cargando...</div>}
          {error && <div style={{color:'#ef4444',marginTop:12}}>{error}</div>}

          <div style={{marginTop:12,display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:12}}>
            {events.map(ev => {
              const id = ev.id || ev._id || JSON.stringify(ev);
              return (
                <div key={id} className="event-card card" style={{padding:12}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'start'}}>
                    <div>
                      <div style={{fontWeight:800}}>{ev.title || ev.name || 'Sin título'}</div>
                      <div style={{fontSize:12,color:'#6b7280'}}>{ev.province || ev.location || ''}</div>
                      <div style={{fontSize:12,color:'#6b7280'}}>{ev.date ? new Date(ev.date).toLocaleString() : ''}</div>
                    </div>
                    <div style={{display:'flex',flexDirection:'column',gap:8}}>
                      <button className="btn small" onClick={()=>navigator.clipboard?.writeText(JSON.stringify(ev))}>Export</button>
                      <button className="btn small ghost" onClick={()=>handleDelete(id)}>Eliminar</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}
