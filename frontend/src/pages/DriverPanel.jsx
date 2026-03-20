import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
})

function MapClickHandler({ onPick }){
  useMapEvents({ click(e){ onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) } })
  return null
}

function MapResizer(){
  const map = useMap()
  useEffect(()=>{ const t = setTimeout(()=>map.invalidateSize(), 150); return ()=>clearTimeout(t) }, [map])
  return null
}

function RemoveLeafletPrefix(){
  const map = useMap()
  useEffect(()=>{
    if(map && map.attributionControl) map.attributionControl.setPrefix(false)
  }, [map])
  return null
}

export default function DriverPanel(){
  const [message,setMessage] = useState('')
  const driverId = localStorage.getItem('driverId')
  const token = localStorage.getItem('token')
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000'
  const [events,setEvents] = useState([])
  const [activeEvent, setActiveEvent] = useState(localStorage.getItem('eventId') || '')
  const [showPicker, setShowPicker] = useState(false)
  const [pickerCenter, setPickerCenter] = useState({ lat: -34.6037, lng: -58.3816 })
  const [pickedLatLng, setPickedLatLng] = useState(null)
  const [confirmingPoint, setConfirmingPoint] = useState(false)

  useEffect(()=>{ loadAssigned() }, [])

  async function loadAssigned(){
    try{
      const res = await axios.get(apiBase+`/api/driver/${driverId}/events`, { headers: { Authorization: `Bearer ${token}` } })
      const data = res.data || {}
      const arr = Object.keys(data).map(k=>({ id:k, ...data[k] }))
      setEvents(arr)
    }catch(err){console.error(err)}
  }

  function selectEvent(e){
    setActiveEvent(e)
    localStorage.setItem('eventId', e)
  }

  function copyLink(){
    if(!activeEvent) { setMessage('Seleccioná un evento primero'); return }
    const link = `${window.location.origin}/evento/${activeEvent}`
    navigator.clipboard.writeText(link).then(()=>setMessage('Link copiado al portapapeles'))
  }

  function openMeetingPointPicker(){
    if(!activeEvent){ setMessage('Seleccioná un evento primero'); return }
    setMessage('Obteniendo posición GPS...')
    function openWithCenter(center){
      setPickerCenter(center)
      setPickedLatLng(center)
      setShowPicker(true)
      setMessage('')
    }
    if(!navigator.geolocation){ openWithCenter({ lat: -34.6037, lng: -58.3816 }); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => openWithCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => openWithCenter({ lat: -34.6037, lng: -58.3816 }),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  async function confirmMeetingPoint(){
    if(!pickedLatLng) return
    setConfirmingPoint(true)
    try{
      await axios.post(apiBase+`/api/driver/${driverId}/arrived`, { eventId: activeEvent, lat: pickedLatLng.lat, lng: pickedLatLng.lng }, { headers: { Authorization: `Bearer ${token}` } })
      setShowPicker(false)
      setMessage('Punto de encuentro fijado. Los pasajeros pueden verlo en el mapa.')
    }catch(err){
      console.error(err)
      setMessage('Error al guardar el punto de encuentro')
    }finally{
      setConfirmingPoint(false)
    }
  }

  async function updateLocation(){
    if(!navigator.geolocation){ alert('Geolocalización no soportada'); return }
    if(!activeEvent){ setMessage('Seleccioná un evento primero'); return }
    setMessage('Actualizando ubicación...')
    navigator.geolocation.getCurrentPosition(async (pos)=>{
      try{
        await axios.post(apiBase+`/api/driver/${driverId}/update`, { eventId: activeEvent, lat: pos.coords.latitude, lng: pos.coords.longitude }, { headers: { Authorization: `Bearer ${token}` } })
        setMessage('Ubicación actualizada')
      }catch(err){ console.error(err); setMessage('Error actualizando ubicación') }
    }, ()=>setMessage('Error obteniendo ubicación'))
  }

  const active = events.find(ev=>ev.id===activeEvent) || null

  return (
    <div className="container driver-panel">
      <div className="driver-header">
        <div className="driver-title">Panel del Chofer</div>
        <div className="driver-meta">ID: <strong>{driverId}</strong></div>
      </div>

      <div className="driver-grid">
        <aside className="driver-controls card">
          <div className="card-title">Controles</div>
          <div className="card-body">
            <label className="label">Eventos asignados</label>
            <select className="input" value={activeEvent} onChange={(e)=>selectEvent(e.target.value)}>
              <option value="">Seleccionar evento</option>
              {events.map(ev=> <option key={ev.id} value={ev.id}>{ev.name} {ev.date ? '- '+new Date(ev.date).toLocaleString() : ''}</option>)}
            </select>

            <div style={{marginTop:12}}>
              <button className="btn positive full" onClick={openMeetingPointPicker}>Fijar punto de encuentro</button>
            </div>

            <div style={{marginTop:8,display:'flex',gap:8}}>
              <button className="btn ghost" onClick={updateLocation}>Actualizar ubicación</button>
              <button className="btn ghost" onClick={copyLink}>Copiar link</button>
            </div>

            {message && <p className="helper" style={{marginTop:12}}>{message}</p>}
          </div>
        </aside>

        <section className="driver-status card">
          <div className="card-title">Estado del evento</div>
          <div className="card-body">
            {active ? (
              <>
                <h3 style={{margin:'6px 0'}}>{active.name}</h3>
                <p className="muted">{active.date ? new Date(active.date).toLocaleString() : 'Fecha no definida'}</p>
                <div style={{marginTop:12}}>
                  <strong>Salida:</strong>
                  <p className="helper">{active.departureInfo || 'Información no disponible'}</p>
                </div>
                <div style={{marginTop:12}}>
                  <strong>Estado:</strong>
                  <p className="helper">{active.status || 'en_curso'}</p>
                </div>
              </>
            ) : (
              <div className="helper">Seleccioná un evento para ver más detalles</div>
            )}
          </div>
        </section>
      </div>

      {showPicker && (
        <div className="map-picker-overlay" role="dialog" aria-modal="true" onClick={e=>{ if(e.target===e.currentTarget) setShowPicker(false) }}>
          <div className="map-picker-modal">
            <div className="map-picker-header">
              <div>
                <div className="map-picker-title">Punto de encuentro</div>
                <div className="map-picker-hint">Tocá el mapa para fijar el lugar exacto donde los pasajeros deben subir</div>
              </div>
              <button className="map-picker-close" type="button" onClick={()=>setShowPicker(false)}>&#x2715;</button>
            </div>
            <div className="map-picker-map">
              <MapContainer center={[pickerCenter.lat, pickerCenter.lng]} zoom={15} style={{width:'100%',height:'100%'}}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
                <RemoveLeafletPrefix />
                <MapClickHandler onPick={setPickedLatLng} />
                <MapResizer />
                {pickedLatLng && (
                  <Marker position={[pickedLatLng.lat, pickedLatLng.lng]}>
                    <Popup>Punto de encuentro<br/>{pickedLatLng.lat.toFixed(5)}, {pickedLatLng.lng.toFixed(5)}</Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>
            <div className="map-picker-footer">
              {pickedLatLng && (
                <div className="map-picker-coords">
                  {pickedLatLng.lat.toFixed(5)}, {pickedLatLng.lng.toFixed(5)}
                </div>
              )}
              <div className="map-picker-actions">
                <button className="btn ghost" type="button" onClick={()=>setShowPicker(false)}>Cancelar</button>
                <button className="btn positive" type="button" onClick={confirmMeetingPoint} disabled={!pickedLatLng || confirmingPoint}>
                  {confirmingPoint ? 'Guardando...' : 'Confirmar punto'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}