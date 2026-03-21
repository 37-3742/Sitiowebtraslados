import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// fix leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
})

const meetingPointIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const userLocationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

function MapUpdater({ center }){
  const map = useMap()
  useEffect(()=>{
    if(center) map.setView([center.lat, center.lng], map.getZoom(), { animate: true })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center && center.lat, center && center.lng, map])
  return null
}

function RemoveLeafletPrefix(){
  const map = useMap()
  useEffect(()=>{
    if(map && map.attributionControl) map.attributionControl.setPrefix(false)
  }, [map])
  return null
}

export default function EventView(){
  const { id } = useParams()
  const [location, setLocation] = useState(null)
  const [meetingPoint, setMeetingPoint] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [status, setStatus] = useState('en_curso')
  const [updatedAt, setUpdatedAt] = useState(null)
  const [eventInfo, setEventInfo] = useState(null)
  const [commentFormOpen, setCommentFormOpen] = useState(false)
  const [commentCustomerName, setCommentCustomerName] = useState('')
  const [commentText, setCommentText] = useState('')
  const [commentRating, setCommentRating] = useState('5')
  const [sendingComment, setSendingComment] = useState(false)
  const [commentResult, setCommentResult] = useState('')
  const [commentError, setCommentError] = useState('')
  const [locationNotice, setLocationNotice] = useState('')
  const [capturingSnapshot, setCapturingSnapshot] = useState(false)
  const [snapshotResult, setSnapshotResult] = useState('')

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000'
  const routeCaptureRef = useRef(null)

  const navigate = useNavigate()

  const loadEventData = useCallback(async ()=>{
    const res = await axios.get(apiUrl+`/api/events/${id}`)
    return res.data || {}
  }, [apiUrl, id])

  useEffect(()=>{
    let disposed = false

    async function syncEventData(){
      try{
        const payload = await loadEventData()
        if(disposed) return

        const nextLocation = payload.location ? { lat: payload.location.lat, lng: payload.location.lng } : null
        setLocation(nextLocation)
        setUpdatedAt(payload.location ? payload.location.timestamp : null)

        const nextMeeting = payload.meetingPoint ? { lat: payload.meetingPoint.lat, lng: payload.meetingPoint.lng, timestamp: payload.meetingPoint.timestamp } : null
        setMeetingPoint(nextMeeting)

        if(payload.event) {
          setStatus(payload.event.status)
          setEventInfo(payload.event)
        }
      }catch(err){
        if(!disposed) console.error(err)
      }
    }

    syncEventData()
    const intervalId = window.setInterval(syncEventData, 6000)

    return ()=>{
      disposed = true
      window.clearInterval(intervalId)
    }
  }, [loadEventData])

  const requestUserLocation = useCallback(()=>{
    if(!navigator.geolocation){
      setLocationNotice('Tu navegador no soporta geolocalizacion.')
      return
    }

    setLocationNotice('Solicitando permiso de ubicacion...')
    navigator.geolocation.getCurrentPosition(
      (pos)=>{
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocationNotice('Ubicacion detectada. Ya podes ver tu ruta al colectivo.')
      },
      ()=>{
        setLocationNotice('No se pudo obtener tu ubicacion. Permiti el acceso para ver la ruta.')
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    )
  }, [])

  useEffect(()=>{
    requestUserLocation()
  }, [requestUserLocation])

  function getCalendarDayTime(dateValue){
    if(!dateValue) return Number.NaN

    if(typeof dateValue === 'string'){
      const match = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})$/)
      if(match){
        const [, year, month, day] = match
        return new Date(Number(year), Number(month) - 1, Number(day)).getTime()
      }
    }

    const parsed = new Date(dateValue)
    if(!Number.isFinite(parsed.getTime())) return Number.NaN
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime()
  }

  function getTodayTime(){
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today.getTime()
  }

  function isPastEvent(dateStr){
    const eventDayMs = getCalendarDayTime(dateStr)
    if(!Number.isFinite(eventDayMs)) return false
    return eventDayMs < getTodayTime()
  }

  function calculateDistanceKm(fromPoint, toPoint){
    if(!fromPoint || !toPoint) return null
    const toRad = (value)=> (value * Math.PI) / 180
    const earthRadiusKm = 6371
    const dLat = toRad(toPoint.lat - fromPoint.lat)
    const dLng = toRad(toPoint.lng - fromPoint.lng)
    const lat1 = toRad(fromPoint.lat)
    const lat2 = toRad(toPoint.lat)
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return earthRadiusKm * c
  }

  const destinationPoint = meetingPoint || location
  const routeDistanceKm = calculateDistanceKm(userLocation, destinationPoint)

  const openGoogleMaps = useCallback(()=>{
    const target = meetingPoint || location
    if(!target) return
    const originParam = userLocation ? `&origin=${userLocation.lat},${userLocation.lng}` : ''
    const url = `https://www.google.com/maps/dir/?api=1${originParam}&destination=${target.lat},${target.lng}&travelmode=driving`
    window.open(url, '_blank')
  }, [meetingPoint, location, userLocation])

  async function saveRouteSnapshot(){
    if(!routeCaptureRef.current){
      setSnapshotResult('No se pudo generar la imagen de ruta.')
      return
    }

    try{
      setCapturingSnapshot(true)
      setSnapshotResult('')
      const html2canvasModule = await import('html2canvas')
      const html2canvas = html2canvasModule.default
      const canvas = await html2canvas(routeCaptureRef.current, {
        backgroundColor: '#f8fafc',
        useCORS: true,
        scale: 2
      })

      const link = document.createElement('a')
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      link.download = `ruta-colectivo-${stamp}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      setSnapshotResult('Ruta guardada como imagen. Podras verla aunque se caiga internet.')
    }catch(err){
      console.error(err)
      setSnapshotResult('No se pudo guardar la imagen. Intenta nuevamente.')
    }finally{
      setCapturingSnapshot(false)
    }
  }

  function formatEventDate(dateValue){
    if(!dateValue) return 'Fecha no definida'
    const parsed = new Date(dateValue)
    if(Number.isNaN(parsed.getTime())) return 'Fecha inválida'
    return parsed.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  function formatEventStatus(rawStatus){
    if(!rawStatus) return 'Sin estado'
    const normalized = String(rawStatus).toLowerCase()
    if(normalized === 'llego') return 'Llegó al punto'
    if(normalized === 'en_curso') return 'En camino'
    return rawStatus
  }

  async function handleSubmitComment(e){
    e.preventDefault()
    if(!eventInfo) return

    const trimmedComment = commentText.trim()
    if(!trimmedComment){
      setCommentError('Escribí tu comentario antes de enviarlo')
      return
    }

    try{
      setSendingComment(true)
      setCommentError('')
      setCommentResult('')

      await axios.post(apiUrl+`/api/events/${id}/comments`, {
        customerName: commentCustomerName.trim(),
        comment: trimmedComment,
        rating: Number(commentRating)
      })

      setCommentResult('Gracias por compartir tu experiencia.')
      setCommentText('')
      setCommentCustomerName('')
      setCommentRating('5')
      setCommentFormOpen(false)
    }catch(err){
      console.error(err)
      setCommentError(err?.response?.data?.error || 'No se pudo enviar el comentario')
    }finally{
      setSendingComment(false)
    }
  }

  const canComment = eventInfo ? isPastEvent(eventInfo.date) : false

  return (
    <div className="container">
      <div className="header-bar">
        <button className="btn ghost" style={{padding:'6px 10px',fontSize:13}} onClick={()=>navigate(-1)}>← Volver</button>
        <div className="app-title">Ubicación del colectivo</div>
      </div>
      <div className="card">
        <div className="row" style={{justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{marginBottom:6}} className="helper">Estado</div>
            <div className={"badge "+(status==='llego'? 'ok':'warn')}>{status==='llego'? 'El colectivo está en el punto de encuentro' : 'En camino'}</div>
          </div>
          <div className="helper">
            {updatedAt
              ? `Última actualización: ${new Date(updatedAt).toLocaleString()}`
              : meetingPoint
                ? `Punto fijado: ${new Date(meetingPoint.timestamp).toLocaleString()}`
                : 'Esperando ubicación del chofer'
            }
          </div>
        </div>

        <div ref={routeCaptureRef} className="event-route-capture" style={{marginTop:12}}>
          <div className="map">
            <MapContainer center={location||meetingPoint||userLocation||{lat:-34.6037,lng:-58.3816}} zoom={14} style={{width:'100%',height:'100%'}}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <RemoveLeafletPrefix />
              <MapUpdater center={location||meetingPoint||userLocation||null} />
              {userLocation && destinationPoint && (
                <Polyline
                  positions={[userLocation, destinationPoint]}
                  pathOptions={{ color: '#0b63ff', weight: 4, opacity: 0.72, dashArray: '8 8' }}
                />
              )}
              {userLocation && (
                <Marker position={userLocation} icon={userLocationIcon}>
                  <Popup>Tu ubicacion</Popup>
                </Marker>
              )}
              {meetingPoint && (
                <Marker position={meetingPoint} icon={meetingPointIcon}>
                  <Popup><strong>Punto de encuentro</strong><br/>{meetingPoint.timestamp ? new Date(meetingPoint.timestamp).toLocaleString() : ''}</Popup>
                </Marker>
              )}
              {location && <Marker position={location}><Popup>Colectivo (ubicación actual)<br/>{updatedAt ? new Date(updatedAt).toLocaleString() : ''}</Popup></Marker>}
            </MapContainer>
          </div>

          <div className="event-route-caption">
            <span>Origen: {userLocation ? `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}` : 'Sin ubicacion'}</span>
            <span>Destino: {destinationPoint ? `${destinationPoint.lat.toFixed(4)}, ${destinationPoint.lng.toFixed(4)}` : 'Pendiente del chofer'}</span>
          </div>
        </div>

        <div className="section row" style={{justifyContent:'flex-end'}}>
          <button className="btn ghost" onClick={requestUserLocation}>Detectar mi ubicacion</button>
          <button className="btn ghost" onClick={() => navigator.clipboard.writeText(window.location.href)}>Copiar link</button>
          <button className="btn secondary" onClick={openGoogleMaps} disabled={!meetingPoint && !location}>Como llegar</button>
          <button className="btn outline" onClick={saveRouteSnapshot} disabled={capturingSnapshot || (!meetingPoint && !location)}>
            {capturingSnapshot ? 'Generando imagen...' : 'Guardar ruta (foto)'}
          </button>
        </div>

        {(locationNotice || snapshotResult || routeDistanceKm) && (
          <div className="helper" style={{marginTop:6}}>
            {locationNotice}
            {routeDistanceKm ? ` Distancia aproximada en linea recta: ${routeDistanceKm.toFixed(2)} km.` : ''}
            {snapshotResult ? ` ${snapshotResult}` : ''}
          </div>
        )}

        <div className="section event-info-panel" style={{marginTop: 20}}>
          <div className="event-info-head">
            <div className="event-info-kicker">Detalle</div>
            <h4>Información del evento</h4>
          </div>
          {eventInfo ? (
            <div className="event-info-grid">
              <div className="event-info-item">
                <div className="event-info-label">Nombre</div>
                <div className="event-info-value">{eventInfo.name || 'Sin nombre'}</div>
              </div>

              <div className="event-info-item">
                <div className="event-info-label">Fecha</div>
                <div className="event-info-value">{formatEventDate(eventInfo.date)}</div>
              </div>

              <div className="event-info-item event-info-item--full">
                <div className="event-info-label">Estado</div>
                <div className="event-info-value">
                  <span className={`event-info-status ${String(eventInfo.status || '').toLowerCase() === 'llego' ? 'is-arrived' : 'is-running'}`}>
                    {formatEventStatus(eventInfo.status)}
                  </span>
                </div>
              </div>

              <div className="event-info-item event-info-item--full">
                <div className="event-info-label">Información de salida</div>
                <div className="event-info-value">{eventInfo.departureInfo || 'Todavía no hay detalles cargados.'}</div>
              </div>
            </div>
          ) : <div className="helper">Cargando información del evento...</div>}
        </div>

        <div className="section" style={{marginTop: 20}}>
          {meetingPoint && (
            <div style={{marginBottom: 14}}>
              <h4 style={{margin:'0 0 6px'}}>Punto de encuentro 🟢</h4>
              <div className="helper">
                Coordenadas: {meetingPoint.lat.toFixed(5)}, {meetingPoint.lng.toFixed(5)}
                {meetingPoint.timestamp ? ` · ${new Date(meetingPoint.timestamp).toLocaleString()}` : ''}
              </div>
            </div>
          )}
          {location && (
            <div>
              <h4 style={{margin:'0 0 6px'}}>Ubicación actual del colectivo</h4>
              <div className="helper">
                Coordenadas: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                {updatedAt ? ` · ${new Date(updatedAt).toLocaleString()}` : ''}
              </div>
            </div>
          )}
          {!meetingPoint && !location && (
            <div className="helper">El chofer todavía no actualizó la ubicación desde su panel.</div>
          )}
        </div>

        {eventInfo && canComment && (
          <div className="section customer-feedback-section" style={{marginTop: 20}}>
            <h4>Tu experiencia</h4>
            {!commentFormOpen && (
              <button
                className="btn outline"
                onClick={()=>{
                  setCommentError('')
                  setCommentResult('')
                  setCommentFormOpen(true)
                }}
              >
                Agregar comentario
              </button>
            )}

            {commentFormOpen && (
              <form className="feedback-form" onSubmit={handleSubmitComment}>
                <div className="admin-field">
                  <label className="label">Nombre (opcional)</label>
                  <input
                    className="input"
                    value={commentCustomerName}
                    onChange={e=>setCommentCustomerName(e.target.value)}
                    maxLength={80}
                    placeholder="Ej: María"
                  />
                </div>

                <div className="admin-field">
                  <label className="label">Calificación</label>
                  <select className="input" value={commentRating} onChange={e=>setCommentRating(e.target.value)}>
                    <option value="5">5 - Excelente</option>
                    <option value="4">4 - Muy buena</option>
                    <option value="3">3 - Buena</option>
                    <option value="2">2 - Regular</option>
                    <option value="1">1 - Mala</option>
                  </select>
                </div>

                <div className="admin-field">
                  <label className="label">¿Cómo fue tu experiencia?</label>
                  <textarea
                    className="input feedback-textarea"
                    value={commentText}
                    onChange={e=>setCommentText(e.target.value)}
                    maxLength={1200}
                    placeholder="Contanos cómo fue el servicio"
                    required
                  />
                </div>

                <div className="feedback-actions">
                  <button className="btn positive" type="submit" disabled={sendingComment}>
                    {sendingComment ? 'Enviando...' : 'Enviar comentario'}
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={()=>setCommentFormOpen(false)}
                    disabled={sendingComment}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {commentResult && <div className="comment-result success">{commentResult}</div>}
            {commentError && <div className="comment-result error">{commentError}</div>}
          </div>
        )}
      </div>
    </div>
  )
}