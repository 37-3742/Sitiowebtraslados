import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'

const DEFAULT_REFUND_POLICY_NOTICE = 'La empresa no sera responsable por arrepentimiento de compra ni por inasistencia por motivos personales. El pasajero acepta que no se realizaran devoluciones ni reembolsos ante cancelaciones efectuadas por el propio pasajero o por cancelacion del evento.'

export default function Home(){
  const [events,setEvents] = useState([])
  const [logo, setLogo] = useState(null)
  const [socialLinks, setSocialLinks] = useState([])
  const [query, setQuery] = useState('')
  const [onlyToday, setOnlyToday] = useState(false)
  const [expandedInfoEventId, setExpandedInfoEventId] = useState('')
  const [openCommentEventId, setOpenCommentEventId] = useState('')
  const [activeReserveEventId, setActiveReserveEventId] = useState('')
  const [activeTransferEventId, setActiveTransferEventId] = useState('')
  const [commentDrafts, setCommentDrafts] = useState({})
  const [commentStatusByEvent, setCommentStatusByEvent] = useState({})
  const [submittingCommentEventId, setSubmittingCommentEventId] = useState('')
  const [transferCopyStatusByEvent, setTransferCopyStatusByEvent] = useState({})
  const [transferOrderCountByEvent, setTransferOrderCountByEvent] = useState({})
  const api = import.meta.env.VITE_API_URL || 'http://localhost:4000'
  const creatorLinkedinUrl = 'https://www.linkedin.com/in/jazm%C3%ADn-coral-barrera-b50463213?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app'

  function normalizeExternalLink(rawLink){
    const trimmed = typeof rawLink === 'string' ? rawLink.trim() : ''
    if(!trimmed) return ''
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  }

  function isValidExternalLink(rawLink){
    const normalized = normalizeExternalLink(rawLink)
    if(!normalized) return false
    try{
      const parsed = new URL(normalized)
      return Boolean(parsed.hostname)
    }catch(err){
      return false
    }
  }

  function buildSocialLinksFromSettings(settings){
    const source = Array.isArray(settings?.socialLinks) ? settings.socialLinks : []
    const normalized = source
      .map((item, idx)=>({
        id: item?.id || `social-${idx}-${Date.now()}`,
        name: typeof item?.name === 'string' ? item.name.trim() : '',
        icon: typeof item?.icon === 'string' ? item.icon.trim() : '',
        link: normalizeExternalLink(item?.link)
      }))
      .filter(item => item.name && item.link && isValidExternalLink(item.link))

    if(normalized.length) return normalized

    const legacyInstagram = typeof settings?.instagramLink === 'string' ? settings.instagramLink.trim() : ''
    if(!legacyInstagram || !isValidExternalLink(legacyInstagram)) return []

    return [{
      id: `social-legacy-${Date.now()}`,
      name: 'Instagram',
      icon: '📸',
      link: normalizeExternalLink(legacyInstagram)
    }]
  }

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
        const settings = res.data || {}
        if(settings.logo){
          setLogo(settings.logo.startsWith('http') ? settings.logo : `${api}${settings.logo}`)
        }
        setSocialLinks(buildSocialLinksFromSettings(settings))
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
      const match = dateValue.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
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

  function collectEventDateKeys(ev){
    const source = [
      ...(Array.isArray(ev?.dates) ? ev.dates : []),
      ev?.date || ''
    ]
    const unique = []
    const seen = new Set()

    for(const rawValue of source){
      if(typeof rawValue !== 'string') continue
      const dayMs = getCalendarDayTime(rawValue)
      if(!Number.isFinite(dayMs)) continue
      const parsed = new Date(dayMs)
      const key = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`
      if(seen.has(key)) continue
      seen.add(key)
      unique.push(key)
    }

    unique.sort((a,b)=>a.localeCompare(b))
    return unique
  }

  function formatSingleEventDate(dateValue){
    const dayMs = getCalendarDayTime(dateValue)
    if(!Number.isFinite(dayMs)) return 'Fecha inválida'
    return new Date(dayMs).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  function formatEventDatesSummary(ev){
    const eventDateKeys = collectEventDateKeys(ev)
    if(!eventDateKeys.length) return 'Fecha no definida'
    if(eventDateKeys.length === 1) return formatSingleEventDate(eventDateKeys[0])
    return eventDateKeys.map(value => formatSingleEventDate(value)).join(' • ')
  }

  function isTodayEvent(ev){
    return collectEventDateKeys(ev).some(value => isToday(value))
  }

  function isPastEvent(ev){
    const eventDateKeys = collectEventDateKeys(ev)
    if(!eventDateKeys.length) return false
    return isPast(eventDateKeys[eventDateKeys.length - 1])
  }

  function getSocialHandle(link){
    if(!link) return 'Perfil oficial'
    try{
      const parsed = new URL(link)
      const segment = parsed.pathname.split('/').filter(Boolean)[0]
      if(segment) return `@${segment}`
      return parsed.hostname.replace(/^www\./, '')
    }catch(err){
      return 'Perfil oficial'
    }
  }

  function getSocialIcon(item){
    const customIcon = (item?.icon || '').trim()
    if(customIcon) return customIcon

    const lowerName = (item?.name || '').toLowerCase()
    if(lowerName.includes('instagram')) return '📸'
    if(lowerName.includes('facebook')) return 'f'
    if(lowerName.includes('tiktok')) return '♪'
    if(lowerName.includes('youtube')) return '▶'
    if(lowerName.includes('twitter') || lowerName === 'x') return '𝕏'
    return '🔗'
  }

  function isIconUrl(rawIcon){
    return /^https?:\/\//i.test((rawIcon || '').trim())
  }

  function parseFocusPercent(rawValue, fallback = 50){
    const parsed = Number(rawValue)
    if(!Number.isFinite(parsed)) return fallback
    return Math.min(100, Math.max(0, Math.round(parsed)))
  }

  function parseScalePercent(rawValue, fallback = 100){
    const parsed = Number(rawValue)
    if(!Number.isFinite(parsed)) return fallback
    return Math.min(130, Math.max(20, Math.round(parsed)))
  }

  function parseTransferAmount(rawValue, fallback = 0){
    const normalized = typeof rawValue === 'string'
      ? rawValue.replace(',', '.').trim()
      : String(rawValue ?? '').trim()
    if(!normalized) return fallback
    const parsed = Number(normalized)
    if(!Number.isFinite(parsed)) return fallback
    return Math.max(0, Math.round(parsed * 100) / 100)
  }

  function formatCurrencyArs(rawAmount){
    const parsed = parseTransferAmount(rawAmount, 0)
    return parsed.toLocaleString('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  function resolveRefundPolicyNotice(rawValue){
    if(typeof rawValue !== 'string') return DEFAULT_REFUND_POLICY_NOTICE
    return rawValue.trim() ? rawValue : DEFAULT_REFUND_POLICY_NOTICE
  }

  function getTransferOrderCount(eventId){
    const raw = Number(transferOrderCountByEvent[eventId])
    if(!Number.isFinite(raw) || raw < 1) return 1
    return Math.round(raw)
  }

  function updateTransferOrderCount(eventId, nextCount){
    const normalized = Math.max(1, Math.round(Number(nextCount) || 1))
    setTransferOrderCountByEvent(prev => ({ ...prev, [eventId]: normalized }))
  }

  function incrementTransferOrderCount(eventId, delta){
    updateTransferOrderCount(eventId, getTransferOrderCount(eventId) + delta)
  }

  function buildTransferReportWhatsappUrl(ev, orderCount, totalAmount){
    const phone = typeof ev.transferReportWhatsapp === 'string' ? ev.transferReportWhatsapp.replace(/\D/g, '') : ''
    if(!phone) return ''

    const safeCount = Math.max(1, Math.round(Number(orderCount) || 1))
    const eventName = typeof ev?.name === 'string' && ev.name.trim() ? ev.name.trim() : 'Sin nombre'
    const lines = [
      `Hola! Ya realicé la transferencia por la compra de ${safeCount} órdenes.`,
      `Total: ${formatCurrencyArs(totalAmount)}.`,
      `Evento: ${eventName}. Te mando comprobante de pago!`,
      'Quedo atento/a a la confirmación.'
    ]

    return `https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`
  }

  function transferCopyStatusKey(eventId, fieldKey){
    return `${eventId}:${fieldKey}`
  }

  function readTransferCopyStatus(eventId, fieldKey){
    return transferCopyStatusByEvent[transferCopyStatusKey(eventId, fieldKey)] || ''
  }

  function setTransferCopyStatusMessage(eventId, fieldKey, message){
    const key = transferCopyStatusKey(eventId, fieldKey)
    setTransferCopyStatusByEvent(prev => ({ ...prev, [key]: message }))
    window.setTimeout(()=>{
      setTransferCopyStatusByEvent(prev => {
        if(!(key in prev)) return prev
        const next = { ...prev }
        delete next[key]
        return next
      })
    }, 1800)
  }

  async function copyPlainText(rawText){
    const text = typeof rawText === 'string' ? rawText.trim() : ''
    if(!text) return false

    if(typeof navigator !== 'undefined' && navigator.clipboard?.writeText){
      try{
        await navigator.clipboard.writeText(text)
        return true
      }catch(err){
        // Fallback below for browsers that block Clipboard API
      }
    }

    try{
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.setAttribute('readonly', '')
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      textArea.style.pointerEvents = 'none'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      textArea.setSelectionRange(0, textArea.value.length)
      const copied = document.execCommand('copy')
      document.body.removeChild(textArea)
      return copied
    }catch(err){
      return false
    }
  }

  async function copyTransferField(eventId, fieldKey, rawText){
    const text = typeof rawText === 'string' ? rawText.trim() : ''
    if(!text){
      setTransferCopyStatusMessage(eventId, fieldKey, 'Sin datos')
      return
    }
    const copied = await copyPlainText(text)
    setTransferCopyStatusMessage(eventId, fieldKey, copied ? 'Copiado' : 'No se pudo copiar')
  }

  async function copyAllTransferDetails(ev){
    const alias = typeof ev.transferAlias === 'string' && ev.transferAlias.trim()
      ? ev.transferAlias.trim()
      : (typeof ev.transferAccountInfo === 'string' ? ev.transferAccountInfo.trim() : '')
    const cbu = typeof ev.transferCBU === 'string' ? ev.transferCBU.trim() : ''
    const banco = typeof ev.transferBanco === 'string' ? ev.transferBanco.trim() : ''
    const proofDestination = typeof ev.paymentProofDestination === 'string' ? ev.paymentProofDestination.trim() : ''
    const instructions = typeof ev.postPaymentInstructions === 'string' ? ev.postPaymentInstructions.trim() : ''
    const transferAmount = parseTransferAmount(ev.transferAmount, 0)

    const lines = []
    if(alias) lines.push(`Alias: ${alias}`)
    if(cbu) lines.push(`CBU: ${cbu}`)
    if(banco) lines.push(`Banco: ${banco}`)
    if(transferAmount > 0) lines.push(`Valor orden de compra: ${formatCurrencyArs(transferAmount)}`)
    if(proofDestination) lines.push(`Enviar comprobante a: ${proofDestination}`)
    if(instructions) lines.push(`Indicaciones: ${instructions}`)

    if(!lines.length){
      setTransferCopyStatusMessage(ev.id, 'all', 'Sin datos')
      return
    }

    const copied = await copyPlainText(lines.join('\n'))
    setTransferCopyStatusMessage(ev.id, 'all', copied ? 'Copiado' : 'No se pudo copiar')
  }

  function socialCardAriaLabel(name){
    const trimmed = (name || '').trim()
    return trimmed ? `Abrir ${trimmed}` : 'Abrir red social'
  }

  function socialNameLabel(name){
    const trimmed = (name || '').trim()
    return trimmed || 'Red social'
  }

  function socialKey(item, idx){
    const byId = (item?.id || '').trim()
    if(byId) return byId
    const byLink = normalizeExternalLink(item?.link)
    if(byLink) return byLink
    return `social-item-${idx}`
  }

  function socialHref(link){
    return normalizeExternalLink(link)
  }

  function isInstagramSocial(item){
    const name = typeof item?.name === 'string' ? item.name.toLowerCase() : ''
    const href = socialHref(item?.link).toLowerCase()
    return name.includes('instagram') || href.includes('instagram.com')
  }

  function socialEntries(){
    return socialLinks
      .map((item, idx)=>{
        const href = socialHref(item?.link)
        if(!isValidExternalLink(href)) return null
        return {
          key: socialKey(item, idx),
          name: socialNameLabel(item?.name),
          icon: getSocialIcon(item),
          href,
          handle: getSocialHandle(href),
          isInstagram: isInstagramSocial(item)
        }
      })
      .filter(Boolean)
  }

  function renderSidebarSocial(){
    const entries = socialEntries()
    if(!entries.length) return <div className="helper">No hay redes configuradas todavía.</div>

    return (
      <>
        <div className="sidebar-social-copy">Seguinos para novedades, horarios y avisos de último momento.</div>
        <div className="social-links-list">
          {entries.map(item=>{
            const iconAsUrl = isIconUrl(item.icon)
            return (
              <a
                key={item.key}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="social-link-item"
                aria-label={socialCardAriaLabel(item.name)}
              >
                <span className={`social-link-icon${item.isInstagram ? ' social-link-icon--instagram' : ''}`} aria-hidden="true">
                  {item.isInstagram ? (
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor"/>
                    </svg>
                  ) : iconAsUrl ? (
                    <img src={item.icon} alt="" />
                  ) : (
                    <span className="social-link-icon-glyph">{item.icon}</span>
                  )}
                </span>
                <span className="social-link-meta">
                  <span className="social-link-name">{item.name}</span>
                  <span className="social-link-handle">{item.handle}</span>
                </span>
                <span className="social-link-arrow" aria-hidden="true">↗</span>
              </a>
            )
          })}
        </div>
      </>
    )
  }

  function compareEventsByDatePriority(a, b){
    const aDateKeys = collectEventDateKeys(a)
    const bDateKeys = collectEventDateKeys(b)
    const todayMs = getTodayTime()
    const aDayMs = aDateKeys.length ? getCalendarDayTime(aDateKeys[0]) : Number.NaN
    const bDayMs = bDateKeys.length ? getCalendarDayTime(bDateKeys[0]) : Number.NaN
    const aHasValidDate = Number.isFinite(aDayMs)
    const bHasValidDate = Number.isFinite(bDayMs)

    if(aHasValidDate !== bHasValidDate) return aHasValidDate ? -1 : 1
    if(!aHasValidDate && !bHasValidDate) return (a.name || '').localeCompare(b.name || '')

    const aLastDayMs = getCalendarDayTime(aDateKeys[aDateKeys.length - 1])
    const bLastDayMs = getCalendarDayTime(bDateKeys[bDateKeys.length - 1])
    const aIsPast = Number.isFinite(aLastDayMs) ? aLastDayMs < todayMs : false
    const bIsPast = Number.isFinite(bLastDayMs) ? bLastDayMs < todayMs : false

    if(aIsPast !== bIsPast) return aIsPast ? 1 : -1

    if(!aIsPast){
      const aUpcomingMs = aDateKeys
        .map(value => getCalendarDayTime(value))
        .find(value => Number.isFinite(value) && value >= todayMs)
      const bUpcomingMs = bDateKeys
        .map(value => getCalendarDayTime(value))
        .find(value => Number.isFinite(value) && value >= todayMs)

      if(Number.isFinite(aUpcomingMs) && Number.isFinite(bUpcomingMs)) return aUpcomingMs - bUpcomingMs
      if(Number.isFinite(aUpcomingMs)) return -1
      if(Number.isFinite(bUpcomingMs)) return 1
      return aDayMs - bDayMs
    }

    return bLastDayMs - aLastDayMs
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

  function toggleEventInfo(eventId){
    setExpandedInfoEventId(current => current === eventId ? '' : eventId)
  }

  function toggleReserveOptions(eventId){
    setActiveReserveEventId(current=>{
      if(current === eventId){
        setActiveTransferEventId(prev => prev === eventId ? '' : prev)
        return ''
      }
      setActiveTransferEventId('')
      return eventId
    })
  }

  function toggleTransferDetails(eventId){
    setActiveTransferEventId(current => current === eventId ? '' : eventId)
  }

  function closeReserveFlow(eventId){
    setActiveReserveEventId(current => current === eventId ? '' : current)
    setActiveTransferEventId(current => current === eventId ? '' : current)
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
    if(onlyToday && !isTodayEvent(ev)) return false
    if(query && !ev.name.toLowerCase().includes(query.toLowerCase())) return false
    return true
  }).sort(compareEventsByDatePriority)

  return (
    <div className="container home">
      <div className="content">
        <div className="hero-large card">
          <div className="hero-large-left">
            <h1>Tu traslado asegurado al evento</h1>
            <p>Contactate con nosotros y reservá tu lugar.</p>
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
          <div className="sidebar-column">
            <aside className="sidebar card">
              <div className="card-title">Buscar eventos</div>
              <div className="card-body">
                <input className="input" placeholder="Buscar por nombre..." value={query} onChange={e=>setQuery(e.target.value)} />
                <div className="home-today-filter-wrap">
                  <label className={`home-today-chip ${onlyToday ? 'is-checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={onlyToday}
                      onChange={e=>setOnlyToday(e.target.checked)}
                      className="home-today-chip-input"
                    />
                    <span className="home-today-chip-text">Solo eventos de hoy</span>
                  </label>
                </div>
              </div>
            </aside>

            <aside className="sidebar-social card">
              <div className="card-title">Redes de la organización</div>
              <div className="card-body">
                {renderSidebarSocial()}
              </div>
            </aside>
          </div>

          <main className="events-panel card">
            {filtered.length===0 && <div className="helper">No hay eventos</div>}
            <div className="events-grid">
              {filtered.map(ev=>{
                const srcKey = ev.thumbnail ? ev.thumbnail : ev.image
                const imageSrc = srcKey ? (srcKey.startsWith('http') ? srcKey : `${api}${srcKey}`) : null
                const imageObjectPosition = `${parseFocusPercent(ev.imageFocusX, 50)}% ${parseFocusPercent(ev.imageFocusY, 50)}%`
                const imageScaleFactor = (parseScalePercent(ev.imageScale, 100) / 100).toFixed(2)
                const pastEvent = isPastEvent(ev)
                const todayEvent = isTodayEvent(ev)
                const hasMultipleDates = collectEventDateKeys(ev).length > 1
                const normalizedReservationLink = typeof ev.reservationLink === 'string' ? ev.reservationLink.trim() : ''
                const whatsappSource = ev.whatsappNumber || import.meta.env.VITE_COMPANY_WHATSAPP || '5491123456789'
                const whatsappPhone = String(whatsappSource).replace(/\D/g, '') || '5491123456789'
                const contactWhatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent('Quiero coordinar un traslado para ' + (ev.name || ''))}`
                const reserveWhatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent('Quiero reservar un traslado para ' + (ev.name || ''))}`
                const reserveExternalUrl = normalizedReservationLink || reserveWhatsappUrl
                const reserveExternalLabel = normalizedReservationLink ? 'Otro medio' : 'WhatsApp'
                const showTracking = todayEvent && !pastEvent
                const showReserve = !pastEvent && !todayEvent
                const singleActionFeedback = pastEvent && !showTracking && !showReserve
                const reserveFlowOpen = showReserve && activeReserveEventId === ev.id
                const transferDetailsOpen = reserveFlowOpen && activeTransferEventId === ev.id
                const transferAliasRaw = typeof ev.transferAlias === 'string' && ev.transferAlias.trim()
                  ? ev.transferAlias.trim()
                  : (typeof ev.transferAccountInfo === 'string' ? ev.transferAccountInfo.trim() : '')
                const transferAliasDisplay = transferAliasRaw || 'No informado por administración.'
                const transferCBURaw = typeof ev.transferCBU === 'string' ? ev.transferCBU.trim() : ''
                const transferBancoRaw = typeof ev.transferBanco === 'string' ? ev.transferBanco.trim() : ''
                const transferAmountValue = parseTransferAmount(ev.transferAmount, 0)
                const transferOrderCount = getTransferOrderCount(ev.id)
                const transferTotalAmount = Math.round(transferAmountValue * transferOrderCount * 100) / 100
                const transferReportUrl = buildTransferReportWhatsappUrl(ev, transferOrderCount, transferTotalAmount)
                const transferProofRaw = typeof ev.paymentProofDestination === 'string' ? ev.paymentProofDestination.trim() : ''
                const transferProofDisplay = transferProofRaw || 'No informado por administración.'
                const transferInstructionsRaw = typeof ev.postPaymentInstructions === 'string' ? ev.postPaymentInstructions.trim() : ''
                const transferInstructionsDisplay = transferInstructionsRaw || 'No informado por administración.'
                const commentDraft = getCommentDraft(ev.id)
                const commentStatus = commentStatusByEvent[ev.id]
                const isSendingComment = submittingCommentEventId === ev.id
                const isInfoExpanded = expandedInfoEventId === ev.id
                return (
                  <article key={ev.id} className="event-card">
                    <div className="thumb" style={{position: 'relative'}}>
                      <img
                        src={imageSrc || '/placeholder.png'}
                        alt={ev.name}
                        onLoad={handleImgLoad}
                        style={{
                          objectPosition: imageObjectPosition,
                          '--image-scale': imageScaleFactor
                        }}
                      />
                      <div className="province-badge">{ev.province || 'N/D'}</div>
                    </div>
                    <div className="info">
                      <div className="event-info-head">
                        <h4>{ev.name}</h4>
                        <button
                          className="event-more-info-btn"
                          type="button"
                          onClick={()=>toggleEventInfo(ev.id)}
                        >
                          {isInfoExpanded ? 'Ocultar info' : 'Ver más info'}
                        </button>
                      </div>
                      <p className="muted">{formatEventDatesSummary(ev)}</p>

                      {isInfoExpanded && (
                        <div className="event-extra-info-panel">
                          {hasMultipleDates && (
                            <div className="event-extra-info-row">
                              <span className="event-extra-info-label">Fechas</span>
                              <span className="event-extra-info-value">{formatEventDatesSummary(ev)}</span>
                            </div>
                          )}
                          <div className="event-extra-info-row">
                            <span className="event-extra-info-label">Lugar salida</span>
                            <span className="event-extra-info-value">{ev.departurePlaces && ev.departurePlaces.length > 0 ? ev.departurePlaces.join(' • ') : ev.departurePlace || 'No informado'}</span>
                          </div>
                          <div className="event-extra-info-row">
                            <span className="event-extra-info-label">Hora salida</span>
                            <span className="event-extra-info-value">
                              {ev.departureTimes && ev.departureTimes.length > 0 ? ev.departureTimes.join(', ') : ev.departureTime || 'No informada'}
                            </span>
                          </div>
                          <div className="event-extra-info-row">
                            <span className="event-extra-info-label">Hora regreso</span>
                            <span className="event-extra-info-value">{ev.returnTime || 'No informada'}</span>
                          </div>
                          <div className="event-extra-info-row">
                            <span className="event-extra-info-label">Formas de pago</span>
                            <span className="event-extra-info-value">{ev.paymentMethods || 'No informadas'}</span>
                          </div>
                          {ev.departureInfo && (
                            <div className="event-extra-info-row event-extra-info-row--full">
                              <span className="event-extra-info-label">Detalle salida</span>
                              <span className="event-extra-info-value">{ev.departureInfo}</span>
                            </div>
                          )}
                          <div className="event-extra-info-row event-extra-info-row--full event-extra-info-row--policy">
                            <span className="event-extra-info-label">Politica de cancelacion</span>
                            <span className="event-extra-info-value event-extra-info-value--policy">{resolveRefundPolicyNotice(ev.refundPolicyNotice)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className={`card-footer${singleActionFeedback ? ' card-footer--single-action' : ''}${reserveFlowOpen ? ' card-footer--reserve-focus' : ''}`}>
                      {!reserveFlowOpen && (pastEvent ? (
                        <button className={`event-action event-action--feedback${singleActionFeedback ? ' event-action--single' : ''}`} type="button" onClick={()=>toggleCommentForm(ev.id)}>
                          <span className="event-action-label">{openCommentEventId === ev.id ? 'Cerrar calificación' : 'Calificar servicio'}</span>
                        </button>
                      ) : (
                        <button className="event-action event-action--contact" type="button" onClick={()=>window.open(contactWhatsappUrl,'_blank')}>
                          <span className="event-action-label">Contactar</span>
                        </button>
                      ))}

                      {showReserve ? (
                        <button
                          type="button"
                          className={`event-action event-action--reserve${reserveFlowOpen ? ' event-action--reserve-main' : ' align-right'}`}
                          onClick={()=>toggleReserveOptions(ev.id)}
                        >
                          <span className="event-action-label">{reserveFlowOpen ? 'Ocultar opciones' : 'Reservar'}</span>
                        </button>
                      ) : showTracking ? (
                        <Link to={`/evento/${ev.id}`} className="event-action event-action--track align-right">
                          <span className="event-action-label">Ver seguimiento</span>
                        </Link>
                      ) : null}
                    </div>

                    {reserveFlowOpen && (
                      <div className="home-reserve-flow-wrap">
                        <div className="home-reserve-methods">
                          <button
                            type="button"
                            className={`event-action event-action--transfer${transferDetailsOpen ? ' is-active' : ''}`}
                            onClick={()=>toggleTransferDetails(ev.id)}
                          >
                            <span className="event-action-label">Transferencia</span>
                          </button>
                          <a
                            href={reserveExternalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="event-action event-action--other-method"
                            onClick={()=>closeReserveFlow(ev.id)}
                          >
                            <span className="event-action-label">{reserveExternalLabel}</span>
                          </a>
                        </div>

                        {transferDetailsOpen && (
                          <div className="home-transfer-panel">
                            <div className="home-transfer-copy-actions">
                              <button
                                type="button"
                                className={`home-transfer-copy-btn home-transfer-copy-btn--all${readTransferCopyStatus(ev.id, 'all') === 'Copiado' ? ' is-copied' : ''}`}
                                onClick={()=>copyAllTransferDetails(ev)}
                              >
                                {readTransferCopyStatus(ev.id, 'all') || 'Copiar todo'}
                              </button>
                            </div>
                            <div className="home-transfer-row">
                              <span className="home-transfer-label">Alias</span>
                              <span className="home-transfer-value-wrap">
                                <span className="home-transfer-value">{transferAliasDisplay}</span>
                                <button
                                  type="button"
                                  className={`home-transfer-copy-btn${readTransferCopyStatus(ev.id, 'alias') === 'Copiado' ? ' is-copied' : ''}`}
                                  onClick={()=>copyTransferField(ev.id, 'alias', transferAliasRaw)}
                                  disabled={!transferAliasRaw}
                                >
                                  {readTransferCopyStatus(ev.id, 'alias') || 'Copiar'}
                                </button>
                              </span>
                            </div>
                            {(ev.transferAlias || transferCBURaw || transferBancoRaw) && (
                              <>
                                <div className="home-transfer-row">
                                  <span className="home-transfer-label">CBU</span>
                                  <span className="home-transfer-value-wrap">
                                    <span className="home-transfer-value">{transferCBURaw || 'No informado por administración.'}</span>
                                    <button
                                      type="button"
                                      className={`home-transfer-copy-btn${readTransferCopyStatus(ev.id, 'cbu') === 'Copiado' ? ' is-copied' : ''}`}
                                      onClick={()=>copyTransferField(ev.id, 'cbu', transferCBURaw)}
                                      disabled={!transferCBURaw}
                                    >
                                      {readTransferCopyStatus(ev.id, 'cbu') || 'Copiar'}
                                    </button>
                                  </span>
                                </div>
                                <div className="home-transfer-row">
                                  <span className="home-transfer-label">Banco</span>
                                  <span className="home-transfer-value">{transferBancoRaw || 'No informado por administración.'}</span>
                                </div>
                              </>
                            )}
                            <div className="home-transfer-row">
                              <span className="home-transfer-label">Enviar comprobante a</span>
                              <span className="home-transfer-value-wrap">
                                <span className="home-transfer-value">{transferProofDisplay}</span>
                                <button
                                  type="button"
                                  className={`home-transfer-copy-btn${readTransferCopyStatus(ev.id, 'proof') === 'Copiado' ? ' is-copied' : ''}`}
                                  onClick={()=>copyTransferField(ev.id, 'proof', transferProofRaw)}
                                  disabled={!transferProofRaw}
                                >
                                  {readTransferCopyStatus(ev.id, 'proof') || 'Copiar'}
                                </button>
                              </span>
                            </div>
                            <div className="home-transfer-row">
                              <span className="home-transfer-label">Indicaciones</span>
                              <span className="home-transfer-value">{transferInstructionsDisplay}</span>
                            </div>
                            <div className="home-transfer-row">
                              <span className="home-transfer-label">Valor orden de compra</span>
                              <span className="home-transfer-value">
                                {transferAmountValue > 0 ? formatCurrencyArs(transferAmountValue) : 'No informado por administración.'}
                              </span>
                            </div>
                            <div className="home-transfer-row">
                              <span className="home-transfer-label">Cantidad de ordenes</span>
                              <span className="home-transfer-qty-wrap">
                                <button
                                  type="button"
                                  className="home-transfer-qty-btn"
                                  onClick={()=>incrementTransferOrderCount(ev.id, -1)}
                                  disabled={transferOrderCount <= 1}
                                >
                                  -
                                </button>
                                <span className="home-transfer-qty-value">{transferOrderCount}</span>
                                <button
                                  type="button"
                                  className="home-transfer-qty-btn"
                                  onClick={()=>incrementTransferOrderCount(ev.id, 1)}
                                >
                                  +
                                </button>
                              </span>
                            </div>
                            <div className="home-transfer-row">
                              <span className="home-transfer-label">Total a transferir</span>
                              <span className="home-transfer-value">
                                {transferAmountValue > 0 ? formatCurrencyArs(transferTotalAmount) : 'No informado por administración.'}
                              </span>
                            </div>
                            {ev.transferReportWhatsapp && (
                              <div className="home-transfer-report-row">
                                <a
                                  href={transferReportUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="home-transfer-report-btn"
                                >
                                  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                  Dar aviso de transferencia
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

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

        <div className="home-footer-stack">
          <div className="home-footer-actions-row">
            <aside className="sidebar-social card sidebar-social-actions">
              <div className="card-title">Accesos rápidos</div>
              <div className="card-body sidebar-social-actions-body">
                <Link to="/admin/login" className="btn positive sidebar-quick-btn">Publicar evento</Link>
                <Link to="/driver/login" className="btn secondary sidebar-quick-btn">Entrar como chofer</Link>
              </div>
            </aside>
          </div>

          <footer className="home-footer card" aria-label="Créditos del sitio">
            <div className="home-footer-left">
              © {new Date().getFullYear()} Eventos Traslados. Todos los derechos reservados.
            </div>
            <div className="home-footer-right">
              <span className="home-footer-credit-label">Diseño y desarrollo:</span>
              <span className="home-footer-credit-name">Jazmín Coral Barrera</span>
              <a
                href={creatorLinkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="home-footer-linkedin"
                aria-label="LinkedIn de la creadora"
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2.5" y="2.5" width="19" height="19" rx="4" fill="currentColor"/>
                  <path d="M8 10.1V17H5.8V10.1H8ZM6.9 6.8C7.6 6.8 8.1 7.3 8.1 7.9C8.1 8.6 7.6 9.1 6.9 9.1C6.2 9.1 5.7 8.6 5.7 7.9C5.7 7.3 6.2 6.8 6.9 6.8Z" fill="white"/>
                  <path d="M10 10.1H12.1V11.1H12.1C12.4 10.5 13.2 9.9 14.3 9.9C16.7 9.9 17.1 11.4 17.1 13.4V17H14.9V13.8C14.9 13 14.9 12 13.8 12C12.7 12 12.5 12.8 12.5 13.7V17H10.3V10.1H10Z" fill="white"/>
                </svg>
              </a>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}