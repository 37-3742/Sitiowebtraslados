import React from 'react'
import EventForm from '../components/EventForm'

export default function Admin(){
  return (
    <div className="container">
      <div className="form-panel card">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <h1 className="card-title">Crear nuevo evento</h1>
        </div>

        {/* Prueba visible: selector de provincia */}
        <div style={{marginBottom:12}}>
          <label className="muted" style={{marginRight:8}}>Provincia (prueba)</label>
          <select id="province-test" className="input" defaultValue="">
            <option value="" disabled>Seleccione provincia</option>
            <option>Buenos Aires</option>
            <option>Catamarca</option>
            <option>Chaco</option>
            <option>Chubut</option>
            <option>Córdoba</option>
            <option>Corrientes</option>
            <option>Entre Ríos</option>
            <option>Formosa</option>
            <option>Jujuy</option>
            <option>La Pampa</option>
            <option>La Rioja</option>
            <option>Mendoza</option>
            <option>Misiones</option>
            <option>Neuquén</option>
            <option>Río Negro</option>
            <option>Salta</option>
            <option>San Juan</option>
            <option>San Luis</option>
            <option>Santa Cruz</option>
            <option>Santa Fe</option>
            <option>Santiago del Estero</option>
            <option>Tierra del Fuego</option>
            <option>Ciudad Autónoma de Buenos Aires</option>
          </select>
        </div>

        <EventForm />
      </div>
    </div>
  )
}
