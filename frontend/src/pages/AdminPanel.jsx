import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'

export default function AdminPanel(){
  const [name,setName] = useState('')
  const [date,setDate] = useState('')
  const [province,setProvince] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [reservationLink, setReservationLink] = useState('')
  const [image,setImage] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [driverLogoFile, setDriverLogoFile] = useState(null)
  const [driverLogoPreview, setDriverLogoPreview] = useState(null)
  const [driverLogoSaved, setDriverLogoSaved] = useState(null)
  const [imagePreview,setImagePreview] = useState(null)
  const [correctedFile,setCorrectedFile] = useState(null)
  const [events,setEvents] = useState([])
  const [drivers,setDrivers] = useState([])
  const [loading,setLoading] = useState(false)
  const [creatingDriver,setCreatingDriver] = useState(false)
  const [driverName,setDriverName] = useState('')
  const [driverUsername,setDriverUsername] = useState('')
  const [driverPassword,setDriverPassword] = useState('')
  const [createdDriver,setCreatedDriver] = useState(null)
  const [msg,setMsg] = useState('')
  const [query,setQuery] = useState('')
  const [modalEvent,setModalEvent] = useState(null)
  const [comments, setComments] = useState([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [commentsError, setCommentsError] = useState('')
  const [resetResults, setResetResults] = useState({})
  const [resettingId, setResettingId] = useState(null)
  const api = import.meta.env.VITE_API_URL || 'http://localhost:4000'

  // Provinces list for select
  const PROVINCES = [
    'Buenos Aires','Catamarca','Chaco','Chubut','Córdoba','Corrientes','Entre Ríos','Formosa','Jujuy','La Pampa','La Rioja','Mendoza','Misiones','Neuquén','Río Negro','Salta','San Juan','San Luis','Santa Cruz','Santa Fe','Santiago del Estero','Tierra del Fuego','Ciudad Autónoma de Buenos Aires'
  ]

  useEffect(()=>{
    load()
    loadDrivers(false)
    loadComments()
    axios.get(api+'/api/settings').then(r=>{ if(r.data?.driverLoginLogo) setDriverLogoSaved(r.data.driverLoginLogo) }).catch(()=>{})
  }, [])

  async function load(){
    try{
      const res = await axios.get(api+"/api/events")
      const data = res.data || {}
      const arr = Object.keys(data).map(k=>({ id:k, ...data[k] }))
      arr.sort((a,b)=> new Date(a.date||0) - new Date(b.date||0))
      console.debug('Loaded events from API:', arr)
      console.debug('Provinces present in events:', arr.map(ev=>ev.province))
      setEvents(arr)
    }catch(err){console.error(err)}
  }

  async function loadDrivers(showFeedback = true){
    const token = localStorage.getItem('adminToken')
    if(!token){
      if(showFeedback) setMsg('Error cargando choferes: iniciá sesión como admin')
      return
    }

    try{
      const res = await axios.get(api+"/api/drivers", { headers: { Authorization: `Bearer ${token}` } })
      const data = res.data
      let arr = []

      if(Array.isArray(data)){
        arr = data.map((driver, idx)=>({ id: driver?.id || String(idx), ...driver }))
      }else if(data && Array.isArray(data.drivers)){
        arr = data.drivers.map((driver, idx)=>({ id: driver?.id || String(idx), ...driver }))
      }else if(data && typeof data === 'object'){
        arr = Object.entries(data).map(([id, value])=>({ id, ...(value || {}) }))
      }

      setDrivers(arr)
      if(showFeedback) setMsg(arr.length ? `Choferes cargados: ${arr.length}` : 'No hay choferes cargados')
    }catch(err){
      console.error(err)
      if(showFeedback){
        const status = err?.response?.status
        if(status===401 || status===403) setMsg('Error cargando choferes: sesión de admin inválida')
        else setMsg('Error cargando choferes')
      }
    }
  }

  async function loadComments(){
    const token = localStorage.getItem('adminToken')
    if(!token){
      setComments([])
      setCommentsError('')
      return
    }

    try{
      setLoadingComments(true)
      setCommentsError('')
      const res = await axios.get(api+"/api/admin/comments", {
        headers: { Authorization: `Bearer ${token}` }
      })
      setComments(Array.isArray(res.data) ? res.data : [])
    }catch(err){
      console.error(err)
      setCommentsError('No se pudieron cargar los comentarios')
    }finally{
      setLoadingComments(false)
    }
  }

  function formatDateTime(dateValue){
    if(!dateValue) return 'Sin fecha'
    const parsed = new Date(dateValue)
    if(Number.isNaN(parsed.getTime())) return 'Fecha inválida'
    return parsed.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  function buildRatingStars(rawRating){
    const numeric = Number(rawRating)
    if(!Number.isFinite(numeric) || numeric < 1) return ''
    return '★'.repeat(Math.max(1, Math.min(5, Math.round(numeric))))
  }

  function filteredEvents(){
    if(!query) return events
    return events.filter(e => e.name.toLowerCase().includes(query.toLowerCase()))
  }

  function onFile(e){
    const file = e.target.files[0]
    if(!file) return
    setImage(file)
    const url = URL.createObjectURL(file)
    setImagePreview(url)
    setCorrectedFile(file)
  }

  function onLogoFile(e){
    const f = e.target.files[0]
    if(!f) return
    setLogoFile(f)
    setLogoPreview(URL.createObjectURL(f))
  }

  function buildUsernameFromName(rawName){
    const base = (rawName || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.+|\.+$/g, '')
      .slice(0, 16)
    const suffix = Math.floor(100 + Math.random() * 900)
    return `${base || 'chofer'}${suffix}`
  }

  function buildPassword(length = 10){
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*'
    let result = ''
    for(let i = 0; i < length; i += 1){
      result += chars[Math.floor(Math.random() * chars.length)]
    }
    return result
  }

  function handleGenerateDriverUsername(){
    setDriverUsername(buildUsernameFromName(driverName))
  }

  function handleGenerateDriverPassword(){
    setDriverPassword(buildPassword())
  }

  async function handleCreateDriver(e){
    e.preventDefault()
    setMsg('')

    const normalizedName = driverName.trim()
    if(!normalizedName){
      setMsg('Error creando chofer: nombre requerido')
      return
    }

    const finalUsername = (driverUsername || buildUsernameFromName(normalizedName)).trim()
    const finalPassword = (driverPassword || buildPassword()).trim()

    setCreatingDriver(true)
    try{
      const res = await axios.post(api+"/api/driver/register", {
        name: normalizedName,
        username: finalUsername,
        password: finalPassword
      })

      const expiresAt = Number(res?.data?.expiresAt || (Date.now() + (48 * 60 * 60 * 1000)))

      setCreatedDriver({ name: normalizedName, username: finalUsername, password: finalPassword, expiresAt })
      setDriverName('')
      setDriverUsername('')
      setDriverPassword('')
      setMsg('Chofer creado correctamente (vence en 48 horas)')
      loadDrivers(false)
    }catch(err){
      console.error(err)
      const status = err?.response?.status
      if(status === 400) setMsg('Error creando chofer: usuario ya existe')
      else setMsg('Error creando chofer')
    }finally{
      setCreatingDriver(false)
    }
  }

  async function handleCreate(e){
    e.preventDefault()
    setMsg('')
    if(!name){ setMsg('El nombre es requerido'); return }
    
    setLoading(true)
    try{
      const token = localStorage.getItem('adminToken')
      if(correctedFile){
        const fd = new FormData()
        fd.append('image', correctedFile)
        fd.append('name', name)
        fd.append('code', name)
        fd.append('date', date)
        fd.append('province', province)
        fd.append('reservationLink', reservationLink)
        fd.append('whatsappNumber', whatsappNumber)

        // Debug: log FormData entries (for development only)
        console.debug('Creating event (FormData). Selected province:', province)
        for(const entry of fd.entries()){
          console.debug('FormData entry:', entry[0], entry[1])
        }

        const res = await axios.post(api+"/api/events/upload", fd, { headers: { Authorization: `Bearer ${token}` } })
        console.debug('Server response:', res && res.data)
      }else{
        const payload = { name, code: name, date, reservationLink, whatsappNumber, province }
        console.debug('Creating event (JSON). Payload:', payload)
        const res = await axios.post(api+"/api/events", payload, { headers: { Authorization: `Bearer ${token}` } })
        console.debug('Server response:', res && res.data)
      }
      setName(''); setDate(''); setImage(null); setImagePreview(null); setCorrectedFile(null)
      setWhatsappNumber('')
      setReservationLink('')
      setProvince('')
      setMsg('Evento creado correctamente')
      load()
    }catch(err){console.error(err); setMsg('Error creando evento')}
    finally{setLoading(false)}
  }

  async function uploadLogo(){
    if(!logoFile) { setMsg('Seleccioná un archivo de logo'); return }
    try{
      const token = localStorage.getItem('adminToken')
      const fd = new FormData()
      fd.append('logo', logoFile)
      await axios.post(api+"/api/settings/logo", fd, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } })
      setMsg('Logo subido')
    }catch(err){console.error(err); setMsg('Error subiendo logo')}
  }

  async function uploadDriverLoginLogo(){
    if(!driverLogoFile) { setMsg('Seleccioná una imagen'); return }
    try{
      const token = localStorage.getItem('adminToken')
      const fd = new FormData()
      fd.append('logo', driverLogoFile)
      const res = await axios.post(api+"/api/settings/driver-login-logo", fd, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } })
      setDriverLogoSaved(res.data.driverLoginLogo)
      setMsg('Imagen del login de choferes actualizada')
    }catch(err){console.error(err); setMsg('Error subiendo imagen')}
  }

  async function assignDriver(evId, driverId){
    try{
      const token = localStorage.getItem('adminToken')
      await axios.post(api+`/api/events/${evId}/assign-driver`, { driverId }, { headers: { Authorization: `Bearer ${token}` } })
      setMsg('Chofer asignado')
      load()
    }catch(err){console.error(err); setMsg('Error asignando chofer')}
  }

  async function deleteEvent(evId){
    if(!confirm('¿Estás seguro de eliminar este evento?')) return
    try{
      const token = localStorage.getItem('adminToken')
      await axios.delete(api+`/api/events/${evId}`, { headers: { Authorization: `Bearer ${token}` } })
      setMsg('Evento eliminado')
      load()
      loadComments()
    }catch(err){console.error(err); setMsg('Error eliminando evento')}
  }

  async function handleResetPassword(driverId){
    if(!confirm('¿Resetear contraseña de este chofer? Se generará una nueva.')) return
    setResettingId(driverId)
    try{
      const token = localStorage.getItem('adminToken')
      const res = await axios.patch(api+`/api/drivers/${driverId}/reset-password`, {}, { headers: { Authorization: `Bearer ${token}` } })
      setResetResults(prev => ({ ...prev, [driverId]: res.data.newPassword }))
    }catch(err){
      console.error(err)
      setMsg('Error reseteando contraseña')
    }finally{
      setResettingId(null)
    }
  }

  async function editDepartureInfo(ev){
    const info = prompt('Ingrese la información de salida (lugar, hora, detalles):', ev.departureInfo || '')
    if(info===null) return
    try{
      const token = localStorage.getItem('adminToken')
      await axios.patch(api+`/api/events/${ev.id}`, { departureInfo: info }, { headers: { Authorization: `Bearer ${token}` } })
      setMsg('Información actualizada')
      load()
    }catch(err){console.error(err); setMsg('Error actualizando info')}
  }

  async function editReservationLink(ev){
    const link = prompt('Ingrese el enlace de reserva (URL):', ev.reservationLink || '')
    if(link===null) return
    try{
      const token = localStorage.getItem('adminToken')
      await axios.patch(api+`/api/events/${ev.id}`, { reservationLink: link }, { headers: { Authorization: `Bearer ${token}` } })
      setMsg('Enlace de reserva actualizado')
      load()
    }catch(err){ console.error(err); setMsg('Error actualizando enlace') }
  }

  const visibleEvents = filteredEvents()

  return (
    <div className="container">
      <div className="admin-header">
        <div className="admin-header-left">
          <div className="admin-header-title">Panel Administrador</div>
          <div className="admin-header-subtitle">Gestioná eventos, asigná choferes y consultá el estado en tiempo real</div>
        </div>
        <div className="admin-stats">
          <div className="stat-card">
            <div className="stat-value">{events.length}</div>
            <div className="stat-label">Eventos</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{events.filter(e=>e.province).length}</div>
            <div className="stat-label">Con provincia</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{drivers.length}</div>
            <div className="stat-label">Choferes</div>
          </div>
        </div>
        <div className="admin-header-actions">
          <Link to="/"><button className="btn ghost">Ver Home</button></Link>
        </div>
      </div>

      <div className="admin-grid">
        <div className="form-panel card admin-form-panel">
          <section className="admin-form-block event-form-block">
            <div className="panel-header">
              <div>
                <span className="form-kind-chip">Formulario 1</span>
                <h3 className="admin-section-title">Crear nuevo evento</h3>
                <p>Completá los datos clave y cargá la imagen en una sola pasada.</p>
              </div>
            </div>
            {msg && <div className={`admin-message ${msg.toLowerCase().includes('error') ? 'error' : 'success'}`}>{msg}</div>}
            <form className="event-create-form" onSubmit={handleCreate}>
            <div className="admin-field">
              <label className="label">Nombre</label>
              <input className="input" value={name} onChange={e=>setName(e.target.value)} />
            </div>

            <div className="admin-field-row">
              <div className="admin-field">
                <label className="label">Provincia</label>
                <select className="input" value={province} onChange={e=>setProvince(e.target.value)}>
                  <option value="">Seleccione provincia</option>
                  {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="admin-field">
                <label className="label">Fecha</label>
                <input className="input" type="date" value={date} onChange={e=>setDate(e.target.value)} />
              </div>
            </div>

            <div className="admin-field">
              <label className="label">Imagen</label>
              <input className="input" type="file" accept=".jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.heic,.heif,.svg,.img,image/*" onChange={onFile} />
              {imagePreview && <img className="preview-img" src={imagePreview} alt="preview" style={{marginTop:8}}/>}
            </div>

            <div className="admin-field">
              <label className="label">Número de WhatsApp para reservas</label>
              <input className="input" placeholder="Ej: 542215551234 o +5491234567890" value={whatsappNumber} onChange={e=>setWhatsappNumber(e.target.value)} type="tel" />
              {whatsappNumber && (
                <div className="helper-text">
                  URL generada: <code className="code-preview">https://wa.me/{whatsappNumber}</code>
                </div>
              )}
              <div className="field-note">O dejá vacío si preferís agregar otra URL después</div>
            </div>

            <div className="admin-field">
              <label className="label">URL de reserva (alternativa)</label>
              <input className="input" placeholder="Ej: https://www.ejemplo.com/reservar" value={reservationLink} onChange={e=>setReservationLink(e.target.value)} />
              <div className="field-note">Usá esta URL si no querés usar WhatsApp. Si completás ambas, se usa el link de WhatsApp.</div>
            </div>

            <div className="admin-form-actions">
              <button className="btn positive" type="submit" disabled={loading}>{loading? 'Creando...':'Crear evento'}</button>
            </div>
            </form>
          </section>

          <div className="admin-forms-divider" role="separator" aria-label="Separador entre formularios">
            <span>Cambio de formulario</span>
          </div>

          <div className="form-panel driver-form-panel admin-form-block driver-form-block">
            <div className="panel-header">
              <div>
                <span className="form-kind-chip">Formulario 2</span>
                <h3 className="admin-section-title">Alta de chofer</h3>
                <p>Generá credenciales automáticamente o personalizadas. La cuenta expirará en 48 horas.</p>
              </div>
            </div>

            <form className="driver-create-form" onSubmit={handleCreateDriver}>
              <div className="admin-field">
                <label className="label">Nombre completo</label>
                <input className="input" value={driverName} onChange={e=>setDriverName(e.target.value)} placeholder="Ej: Juan Pérez García" />
              </div>

              <div className="admin-field-row">
                <div className="admin-field">
                  <label className="label">Usuario</label>
                  <div className="driver-inline-row">
                    <input className="input" value={driverUsername} onChange={e=>setDriverUsername(e.target.value)} placeholder="chofer.123" style={{flex:1}} />
                    <button type="button" className="btn secondary driver-gen-btn" onClick={handleGenerateDriverUsername}>Generar</button>
                  </div>
                </div>

                <div className="admin-field">
                  <label className="label">Contraseña</label>
                  <div className="driver-inline-row">
                    <input className="input" value={driverPassword} onChange={e=>setDriverPassword(e.target.value)} placeholder="Min. 8 caracteres" type="text" style={{flex:1}} />
                    <button type="button" className="btn secondary driver-gen-btn" onClick={handleGenerateDriverPassword}>Generar</button>
                  </div>
                </div>
              </div>

              <div className="admin-form-actions driver-form-actions">
                <button className="btn positive" type="submit" disabled={creatingDriver}>{creatingDriver ? 'Creando chofer...' : 'Crear chofer'}</button>
              </div>
            </form>

            {createdDriver && (
              <div className="driver-credentials-display">
                <div className="driver-credentials-header">
                  <div className="driver-credentials-icon">✓</div>
                  <div>
                    <div className="driver-credentials-text">Credenciales generadas correctamente</div>
                    <div className="driver-credentials-subtext">Comparte estos datos con el chofer</div>
                  </div>
                </div>
                
                <div className="driver-cred-item">
                  <div className="driver-cred-label">Nombre</div>
                  <div className="driver-cred-value">{createdDriver.name}</div>
                </div>

                <div className="driver-cred-item">
                  <div className="driver-cred-label">Usuario</div>
                  <div className="driver-cred-value driver-cred-code">{createdDriver.username}</div>
                </div>

                <div className="driver-cred-item">
                  <div className="driver-cred-label">Contraseña</div>
                  <div className="driver-cred-value driver-cred-code">{createdDriver.password}</div>
                </div>

                <div className="driver-cred-item driver-cred-expiry">
                  <div className="driver-cred-label">Vence</div>
                  <div className="driver-cred-value">{new Date(createdDriver.expiresAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                </div>
              </div>
            )}
          </div>

        </div>

        <div className="events-panel card admin-events-panel">
          <div className="events-panel-header">
            <div>
              <h3 className="admin-section-title">Eventos</h3>
              <input className="input search-input" placeholder="Buscar eventos..." value={query} onChange={e=>setQuery(e.target.value)} />
            </div>
            <div className="events-panel-summary">{visibleEvents.length} visibles</div>
          </div>
          <div className="events-grid" style={{marginTop:12}}>
            {visibleEvents.map(ev=> {
              const srcKey = ev.thumbnail ? ev.thumbnail : ev.image
              const imageSrc = srcKey ? (srcKey.startsWith('http') ? srcKey : `${api}${srcKey}`) : null
              return (
                <div key={ev.id} className="event-card">
                  <div className="thumb uploaded-thumb landscape" style={{position:'relative'}}>
                    <img src={imageSrc || '/placeholder.png'} alt="" />
                    <div className="province-badge">{ev.province || 'N/D'}</div>
                  </div>
                  <div className="info">
                    <div className="event-card-heading">
                      <h4>{ev.name}</h4>
                      <span className={`event-status ${ev.assignedDriver ? 'assigned' : 'unassigned'}`}>
                        {ev.assignedDriver ? 'Chofer asignado' : 'Sin chofer'}
                      </span>
                    </div>
                    <p className="event-date">{ev.date ? new Date(ev.date).toLocaleString() : 'Fecha no definida'}</p>
                    <div className="meta">
                      <div className="meta-row">
                        <span className="meta-label">Provincia</span>
                        <span className="meta-value">{ev.province || 'No definida'}</span>
                      </div>
                      <div className="meta-row">
                        <span className="meta-label">Chofer</span>
                        <span className="meta-value">{ev.assignedDriver || 'Sin asignar'}</span>
                      </div>
                      {ev.departureInfo && (
                        <div className="meta-row meta-row-full">
                          <span className="meta-label">Salida</span>
                          <span className="meta-value">{ev.departureInfo}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="actions admin-card-actions">
                    <select className="event-driver-select" onChange={(e)=>assignDriver(ev.id,e.target.value)} defaultValue="">
                      <option value="">Asignar chofer</option>
                      {drivers.map(d=> <option key={d.id} value={d.id}>{d.username || d.name}</option>)}
                    </select>
                    <div className="event-action-grid">
                      <button className="btn secondary" onClick={()=>editDepartureInfo(ev)}>Editar salida</button>
                      <button className="btn outline" onClick={()=>editReservationLink(ev)}>Editar reserva</button>
                    </div>
                    <button className="btn danger event-delete-btn" onClick={()=>deleteEvent(ev.id)}>Eliminar evento</button>
                  </div>
                </div>
              )
            })}
            {visibleEvents.length===0 && <div className="helper events-empty">No hay eventos para mostrar</div>}
          </div>

          <div className="admin-comments-section">
            <div className="admin-comments-header">
              <h3 className="admin-section-title">Comentarios de clientes</h3>
              <span className="comments-counter">{comments.length}</span>
            </div>

            {loadingComments && <div className="helper">Cargando comentarios...</div>}
            {!loadingComments && commentsError && <div className="admin-message error">{commentsError}</div>}

            {!loadingComments && !commentsError && comments.length === 0 && (
              <div className="helper comments-empty">Todavía no hay comentarios para mostrar.</div>
            )}

            {!loadingComments && !commentsError && comments.length > 0 && (
              <div className="comments-list">
                {comments.slice(0, 40).map(commentItem => (
                  <article key={commentItem.id} className="comment-card">
                    <div className="comment-card-head">
                      <div>
                        <div className="comment-event-name">{commentItem.eventName || 'Evento sin nombre'}</div>
                        <div className="comment-meta">
                          Fecha evento: {formatDateTime(commentItem.eventDate)}
                        </div>
                        <div className="comment-meta">
                          Cliente: {commentItem.customerName || 'Anónimo'}
                        </div>
                      </div>
                      {buildRatingStars(commentItem.rating) && (
                        <div className="comment-rating" aria-label="Calificación">
                          {buildRatingStars(commentItem.rating)}
                        </div>
                      )}
                    </div>
                    <p className="comment-text">{commentItem.comment}</p>
                    <div className="comment-meta">Enviado: {formatDateTime(commentItem.createdAt)}</div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="drivers-credentials-panel card">
        <div className="panel-header">
          <div>
            <h3 className="admin-section-title">Credenciales de choferes</h3>
            <p>Consultá los accesos activos. Si un chofer olvidó su contraseña, generá una nueva.</p>
          </div>
          <button className="btn secondary" type="button" onClick={()=>loadDrivers(true)}>Actualizar lista</button>
        </div>
        {drivers.length === 0 ? (
          <div className="helper" style={{marginTop:12}}>No hay choferes activos.</div>
        ) : (
          <div className="drivers-creds-table">
            <div className="drivers-creds-row drivers-creds-head">
              <span>Nombre</span>
              <span>Usuario</span>
              <span>Vence</span>
              <span>Contraseña</span>
              <span></span>
            </div>
            {drivers.map(d => (
              <div key={d.id} className="drivers-creds-row">
                <span className="dcred-name">{d.name || '—'}</span>
                <span className="dcred-code">{d.username || '—'}</span>
                <span className="dcred-muted">{d.expiresAt ? new Date(Number(d.expiresAt)).toLocaleDateString('es-AR', { day:'2-digit', month:'short', year:'numeric' }) : '—'}</span>
                <span className="dcred-password">
                  {resetResults[d.id]
                    ? <span className="dcred-code dcred-new-pass">{resetResults[d.id]}</span>
                    : <span className="dcred-masked">••••••••••</span>
                  }
                </span>
                <span>
                  <button
                    className="btn outline dcred-reset-btn"
                    type="button"
                    disabled={resettingId === d.id}
                    onClick={()=>handleResetPassword(d.id)}
                  >
                    {resettingId === d.id ? 'Generando...' : 'Resetear'}
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="logo-upload-panel card">
        <div className="panel-header">
          <div>
            <h3 className="admin-section-title">Logo de la empresa</h3>
            <p>Subí una versión clara y horizontal para mantener consistencia visual.</p>
          </div>
        </div>
        <div className="logo-upload-row">
          <input className="input logo-file-input" type="file" accept="image/*" onChange={onLogoFile} />
          <button className="btn" type="button" onClick={uploadLogo}>Subir logo</button>
          {logoPreview && <img src={logoPreview} style={{width:84,height:56,objectFit:'contain',borderRadius:6,marginLeft:12}} alt="preview"/>}
        </div>
      </div>

      <div className="logo-upload-panel card">
        <div className="panel-header">
          <div>
            <h3 className="admin-section-title">Imagen — Login de choferes</h3>
            <p>Esta imagen se muestra en la pantalla de ingreso de los choferes. Recomendado: logo o imagen cuadrada de la empresa.</p>
          </div>
        </div>
        <div className="driver-login-logo-row">
          <div className="driver-login-logo-preview-wrap">
            {(driverLogoPreview || driverLogoSaved) ? (
              <img
                src={driverLogoPreview || (api + driverLogoSaved)}
                alt="Vista previa"
                className="driver-login-logo-preview"
              />
            ) : (
              <div className="driver-login-logo-empty">Sin imagen cargada</div>
            )}
          </div>
          <div className="driver-login-logo-controls">
            <input
              className="input logo-file-input"
              type="file"
              accept="image/*"
              onChange={e=>{ const f=e.target.files[0]; if(!f) return; setDriverLogoFile(f); setDriverLogoPreview(URL.createObjectURL(f)) }}
            />
            <button className="btn" type="button" onClick={uploadDriverLoginLogo}>Guardar imagen</button>
          </div>
        </div>
      </div>
    </div>
  )
}