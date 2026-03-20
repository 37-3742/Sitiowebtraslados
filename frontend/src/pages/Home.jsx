import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'

export default function Home(){
  const [events,setEvents] = useState([])
  const [logo, setLogo] = useState(null)
  const [query, setQuery] = useState('')
  const [onlyToday, setOnlyToday] = useState(false)
  const [openCommentEventId, setOpenCommentEventId] = useState('')
  const [commentDrafts, setCommentDrafts] = useState({})
  const [commentStatusByEvent, setCommentStatusByEvent] = useState({})
  const [submittingCommentEventId, setSubmittingCommentEventId] = useState('')
  const api = import.meta.env.VITE_API_URL || 'http://localhost:4000'

  useEffect(()=>{
    async function load(){
      try{
        const res = await axios.get(api+"/api/events")
        const data = res.data || {}
        const arr = Object.keys(data).map(k=>({ id:k, ...data[k] }))
        setEvents(arr)
      }catch(err){console.error(err)}
    }
    load()

    async function loadSettings(){
      try{
        const res = await axios.get(api+"/api/settings")
        if(res.data && res.data.logo){
          setLogo(res.data.logo.startsWith('http') ? res.data.logo : `${api}${res.data.logo}`)
        }
      }catch(err){console.error(err)}
    }
    loadSettings()
  },[])

  function handleImgLoad(e){
    const img = e.target
    const parent = img && img.parentElement
    if(!parent) return
    parent.classList.remove('portrait','landscape')
    if(img.naturalHeight > img.naturalWidth){
      parent.classList.add('portrait')
    }else{
      parent.classList.add('landscape')
    }
  }

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

  function isToday(dateStr){
    const eventDayMs = getCalendarDayTime(dateStr)
    if(!Number.isFinite(eventDayMs)) return false
    return eventDayMs === getTodayTime()
  }

  function isPast(dateStr){
    const eventDayMs = getCalendarDayTime(dateStr)
    if(!Number.isFinite(eventDayMs)) return false
    return eventDayMs < getTodayTime()
  }

  function compareEventsByDatePriority(a, b){
    const todayMs = getTodayTime()
    const aDayMs = getCalendarDayTime(a.date)
    const bDayMs = getCalendarDayTime(b.date)
    const aHasValidDate = Number.isFinite(aDayMs)
    const bHasValidDate = Number.isFinite(bDayMs)

    if(aHasValidDate !== bHasValidDate) return aHasValidDate ? -1 : 1
    if(!aHasValidDate && !bHasValidDate) return (a.name || '').localeCompare(b.name || '')

    const aIsPast = aDayMs < todayMs
    const bIsPast = bDayMs < todayMs

    if(aIsPast !== bIsPast) return aIsPast ? 1 : -1

    if(!aIsPast) return aDayMs - bDayMs

    return bDayMs - aDayMs
  }

  function getCommentDraft(eventId){
    return commentDrafts[eventId] || { customerName: '', rating: '5', comment: '' }
  }

  function updateCommentDraft(eventId, patch){
    setCommentDrafts(prev=>{
      const current = prev[eventId] || { customerName: '', rating: '5', comment: '' }
      return {
        ...prev,
        [eventId]: { ...current, ...patch }
      }
    })
  }

  function clearCommentStatus(eventId){
    setCommentStatusByEvent(prev=>{
      if(!prev[eventId]) return prev
      const next = { ...prev }
      delete next[eventId]
      return next
    })
  }

  function toggleCommentForm(eventId){
    clearCommentStatus(eventId)
    setOpenCommentEventId(current=> current===eventId ? '' : eventId)
  }

  async function submitComment(eventId){
    const draft = getCommentDraft(eventId)
    const finalComment = (draft.comment || '').trim()

    if(!finalComment){
      setCommentStatusByEvent(prev=>({
        ...prev,
        [eventId]: { type: 'error', text: 'Escribí tu comentario antes de enviar.' }
      }))
      return
    }

    try{
      setSubmittingCommentEventId(eventId)
      clearCommentStatus(eventId)

      await axios.post(api+`/api/events/${eventId}/comments`, {
        customerName: (draft.customerName || '').trim(),
        rating: Number(draft.rating || 5),
        comment: finalComment
      })

      setCommentStatusByEvent(prev=>({
        ...prev,
        [eventId]: { type: 'success', text: 'Gracias por tu experiencia.' }
      }))

      setCommentDrafts(prev=>({
        ...prev,
        [eventId]: { customerName: '', rating: '5', comment: '' }
      }))

      setOpenCommentEventId('')
    }catch(err){
      console.error(err)
      setCommentStatusByEvent(prev=>({
        ...prev,
        [eventId]: { type: 'error', text: err?.response?.data?.error || 'No se pudo enviar el comentario.' }
      }))
    }finally{
      setSubmittingCommentEventId('')
    }
  }

  const filtered = events.filter(ev=>{
    if(onlyToday && !isToday(ev.date)) return false
    if(query && !ev.name.toLowerCase().includes(query.toLowerCase())) return false
    return true
  }).sort(compareEventsByDatePriority)

  return (
    <div className="container home">
      <div className="content">
        <div className="hero-large card">
          <div className="hero-large-left">
            <h1>Seguimiento y coordinación de traslados</h1>
            <p>Visualizá el estado en tiempo real, contactá al responsable y reservá tu lugar para el evento.</p>
            <div className="hero-cta-row">
              <Link to="/admin/login"><button className="btn positive">Publicar evento</button></Link>
              <Link to="/driver/login"><button className="btn ghost hero-secondary-btn">Entrar como chofer</button></Link>
            </div>
          </div>
          <div className="hero-large-right">
            <div className="hero-brand-stage">
              {logo ? (
                <img src={logo} alt="logo" className="hero-logo"/>
              ) : (
                <img src="/hero-illustration.png" alt="hero" className="hero-illustration" />
              )}
            </div>
          </div>
        </div>

        <div className="main-layout">
          <aside className="sidebar card">
            <div className="card-title">Buscar eventos</div>
            <div className="card-body">
              <input className="input" placeholder="Buscar por nombre..." value={query} onChange={e=>setQuery(e.target.value)} />
              <div style={{marginTop:10}}>
                <label style={{display:'flex',alignItems:'center',gap:8}}>
                  <input type="checkbox" checked={onlyToday} onChange={e=>setOnlyToday(e.target.checked)} />
                  <span>Solo eventos de hoy</span>
                </label>
              </div>
            </div>
          </aside>

          <main className="events-panel card">
            {filtered.length===0 && <div className="helper">No hay eventos</div>}
            <div className="events-grid">
              {filtered.map(ev=>{
                const srcKey = ev.thumbnail ? ev.thumbnail : ev.image
                const imageSrc = srcKey ? (srcKey.startsWith('http') ? srcKey : `${api}${srcKey}`) : null
                const pastEvent = isPast(ev.date)
                const todayEvent = isToday(ev.date)
                const showReserve = !pastEvent && Boolean(ev.reservationLink)
                const showBusLocation = todayEvent
                const showTracking = !showBusLocation && !pastEvent && !ev.reservationLink
                const singleActionFeedback = pastEvent && !showTracking && !showReserve
                const commentDraft = getCommentDraft(ev.id)
                const commentStatus = commentStatusByEvent[ev.id]
                const isSendingComment = submittingCommentEventId === ev.id
                return (
                  <article key={ev.id} className="event-card">
                    <div className={`thumb ${imageSrc && (imageSrc.includes('/uploads/')|| imageSrc.includes('thumb-')) ? 'uploaded-thumb' : ''}`} style={{position: 'relative'}}>
                      <img src={imageSrc || '/placeholder.png'} alt={ev.name} onLoad={handleImgLoad} />
                      <div className="province-badge">{ev.province || 'N/D'}</div>
                    </div>
                    <div className="info">
                      <h4>{ev.name}</h4>
                      <p className="muted">{ev.date ? new Date(ev.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Fecha no definida'}</p>
                    </div>
                    <div className={`card-footer${singleActionFeedback ? ' card-footer--single-action' : ''}`}>
                      {pastEvent ? (
                        <button className={`event-action event-action--feedback${singleActionFeedback ? ' event-action--single' : ''}`} type="button" onClick={()=>toggleCommentForm(ev.id)}>
                          <span className="event-action-label">{openCommentEventId === ev.id ? 'Cerrar calificación' : 'Calificar servicio'}</span>
                        </button>
                      ) : !todayEvent ? (
                        <button className="event-action event-action--contact" type="button" onClick={()=>{ const phone = ev.whatsappNumber || import.meta.env.VITE_COMPANY_WHATSAPP || '5491123456789'; window.open(`https://wa.me/${phone}?text=${encodeURIComponent('Quiero coordinar un traslado para '+(ev.name||''))}`,'_blank') }}>
                          <span className="event-action-label">Contactar</span>
                        </button>
                      ) : (
                        <Link to={`/evento/${ev.id}`} className="event-action event-action--location">
                          <span className="event-action-label">Ubicación colectivo</span>
                        </Link>
                      )}
                      {showReserve ? (
                        <a href={ev.reservationLink} target="_blank" rel="noopener noreferrer" className="event-action event-action--reserve align-right">
                          <span className="event-action-label">Reservar</span>
                        </a>
                      ) : showTracking ? (
                        <Link to={`/evento/${ev.id}`} className="event-action event-action--track align-right">
                          <span className="event-action-label">Ver seguimiento</span>
                        </Link>
                      ) : null}
                    </div>

                    {pastEvent && openCommentEventId === ev.id && (
                      <div className="home-comment-wrap">
                        <form className="feedback-form" onSubmit={(e)=>{ e.preventDefault(); submitComment(ev.id) }}>
                          <div className="admin-field">
                            <label className="label">Nombre (opcional)</label>
                            <input
                              className="input"
                              value={commentDraft.customerName}
                              onChange={e=>updateCommentDraft(ev.id, { customerName: e.target.value })}
                              maxLength={80}
                              placeholder="Ej: María"
                            />
                          </div>

                          <div className="admin-field">
                            <label className="label">Calificación</label>
                            <select
                              className="input"
                              value={commentDraft.rating}
                              onChange={e=>updateCommentDraft(ev.id, { rating: e.target.value })}
                            >
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
                              value={commentDraft.comment}
                              onChange={e=>updateCommentDraft(ev.id, { comment: e.target.value })}
                              maxLength={1200}
                              placeholder="Contanos cómo fue el servicio"
                              required
                            />
                          </div>

                          <div className="feedback-actions">
                            <button className="btn positive" type="submit" disabled={isSendingComment}>
                              {isSendingComment ? 'Enviando...' : 'Enviar comentario'}
                            </button>
                            <button
                              className="btn ghost"
                              type="button"
                              onClick={()=>setOpenCommentEventId('')}
                              disabled={isSendingComment}
                            >
                              Cancelar
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {pastEvent && commentStatus && (
                      <div className="home-comment-wrap">
                        <div className={`comment-result ${commentStatus.type === 'success' ? 'success' : 'error'}`}>
                          {commentStatus.text}
                        </div>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}