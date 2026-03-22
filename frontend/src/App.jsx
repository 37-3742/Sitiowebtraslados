import React from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import EventsPage from './pages/EventsPage';
import AdminLogin from './pages/AdminLogin';
import ResetPassword from './pages/ResetPassword';
import AdminDashboard from './pages/AdminDashboard';

function Home(){
  return (
    <div className="container">
      <div className="card">
        <h2>Inicio</h2>
        <p>Bienvenido. Navegá a la lista de eventos.</p>
        <Link to="/events" className="btn">Ver eventos</Link>
      </div>
    </div>
  );
}

function RequireAuth({ children }){
  const token = localStorage.getItem('adminToken');
  if(!token) return <Navigate to="/admin/login" replace />;
  return children;
}

export default function App(){
  return (
    <BrowserRouter>
      <header style={{padding:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{fontWeight:800}}>Eventos Traslados</div>
        <nav style={{display:'flex',gap:8}}>
          <Link to="/" className="btn ghost">Inicio</Link>
          <Link to="/events" className="btn">Eventos</Link>
          <Link to="/admin/login" className="btn outline">Admin</Link>
        </nav>
      </header>
      <main style={{padding:12}}>
        <Routes>
          <Route path="/" element={<Home/>} />
          <Route path="/events" element={<EventsPage/>} />
          <Route path="/admin/login" element={<AdminLogin/>} />
          <Route path="/admin/reset-password" element={<ResetPassword/>} />
          <Route path="/admin" element={<RequireAuth><AdminDashboard/></RequireAuth>} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
