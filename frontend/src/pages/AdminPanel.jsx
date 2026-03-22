import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Link, useNavigate } from 'react-router-dom'

const DEFAULT_REFUND_POLICY_NOTICE = 'La empresa no sera responsable por arrepentimiento de compra ni por inasistencia por motivos personales. El pasajero acepta que no se realizaran devoluciones ni reembolsos ante cancelaciones efectuadas por el propio pasajero o por cancelacion del evento.'

export default function AdminPanel(){
  const [name,setName] = useState('')
  const [date,setDate] = useState('')
  const [dateInput,setDateInput] = useState('')
  const [eventDates,setEventDates] = useState([])
  const [province,setProvince] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [reservationLink, setReservationLink] = useState('')
  const [departurePlaces, setDeparturePlaces] = useState([])
  const [departurePlaceInput, setDeparturePlaceInput] = useState('')
  const [departureTimes, setDepartureTimes] = useState([])
  const [departureTimeInput, setDepartureTimeInput] = useState('')
  const [returnTime, setReturnTime] = useState('')
  const [returnTimeMode, setReturnTimeMode] = useState('time')
  const [paymentMethods, setPaymentMethods] = useState('')
  const [transferAlias, setTransferAlias] = useState('')
  const [transferCBU, setTransferCBU] = useState('')
  const [transferBanco, setTransferBanco] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [imageFocusX, setImageFocusX] = useState(50)
  const [imageFocusY, setImageFocusY] = useState(50)
  const [imageScale, setImageScale] = useState(100)
  const [paymentProofDestination, setPaymentProofDestination] = useState('')
  const [postPaymentInstructions, setPostPaymentInstructions] = useState('')
  const [refundPolicyNotice, setRefundPolicyNotice] = useState(DEFAULT_REFUND_POLICY_NOTICE)
  const [image,setImage] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [driverLogoFile, setDriverLogoFile] = useState(null)
  const [driverLogoPreview, setDriverLogoPreview] = useState(null)
  const [driverLogoSaved, setDriverLogoSaved] = useState(null)
  const [socialLinks, setSocialLinks] = useState([])
  const [socialDraft, setSocialDraft] = useState({ name: '', icon: '', link: '' })
  const [savingSocialLinks, setSavingSocialLinks] = useState(false)
  const [savedWhatsappNumbers, setSavedWhatsappNumbers] = useState([])
  const [savingWhatsappNumbers, setSavingWhatsappNumbers] = useState(false)
  const [savedTransferWhatsappNumbers, setSavedTransferWhatsappNumbers] = useState([])
  const [savingTransferWhatsappNumbers, setSavingTransferWhatsappNumbers] = useState(false)
  const [transferWhatsappInput, setTransferWhatsappInput] = useState('')
  const [savedPaymentMethods, setSavedPaymentMethods] = useState([])
  const [savingPaymentMethods, setSavingPaymentMethods] = useState(false)
  const [savedTransferAccounts, setSavedTransferAccounts] = useState([])
  const [savingTransferAccounts, setSavingTransferAccounts] = useState(false)
  const [savingEventDefaults, setSavingEventDefaults] = useState(false)
  const [imagePreview,setImagePreview] = useState(null)
  const [correctedFile,setCorrectedFile] = useState(null)
  const [events,setEvents] = useState([])
  const [drivers,setDrivers] = useState([])
  const [adminUsers,setAdminUsers] = useState([])
  const [canManageAdminUsers,setCanManageAdminUsers] = useState(localStorage.getItem('adminCanManageUsers') === '1')
  const [loadingAdminUsers,setLoadingAdminUsers] = useState(false)
  const [creatingAdminUser,setCreatingAdminUser] = useState(false)
  const [deletingAdminUserId,setDeletingAdminUserId] = useState('')
  const [updatingAdminUserPasswordId,setUpdatingAdminUserPasswordId] = useState('')
  const [adminUserPasswordDrafts,setAdminUserPasswordDrafts] = useState({})
  const [visibleAdminUserPasswords,setVisibleAdminUserPasswords] = useState({})
  const [changingAdminPassword,setChangingAdminPassword] = useState(false)
  const [adminUserEmail,setAdminUserEmail] = useState('')
  const [adminUserPassword,setAdminUserPassword] = useState('')
  const [adminUserName,setAdminUserName] = useState('')
  const [adminPasswordCurrent,setAdminPasswordCurrent] = useState('')
  const [adminPasswordNext,setAdminPasswordNext] = useState('')
  const [adminPasswordConfirm,setAdminPasswordConfirm] = useState('')
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
  const [deletingDriverId, setDeletingDriverId] = useState(null)
  const [expandedExtraInfoEventId, setExpandedExtraInfoEventId] = useState('')
  const [savingExtraInfoEventId, setSavingExtraInfoEventId] = useState('')
  const [extraInfoDeparturePlaceInput, setExtraInfoDeparturePlaceInput] = useState('')
  const [extraInfoDepartureTimeInput, setExtraInfoDepartureTimeInput] = useState('')
  const [extraInfoDraft, setExtraInfoDraft] = useState({
    departurePlaces: [],
    departureTimes: [],
    returnTime: '',
    returnTimeMode: 'time',
    paymentMethods: '',
    imageFocusX: 50,
    imageFocusY: 50,
    imageScale: 100,
    transferAlias: '',
    transferCBU: '',
    transferBanco: '',
    transferAmount: '',
    paymentProofDestination: '',
    postPaymentInstructions: '',
    refundPolicyNotice: DEFAULT_REFUND_POLICY_NOTICE
  })
  const api = import.meta.env.VITE_API_URL || 'http://localhost:4000'
  const navigate = useNavigate()

  function handleAuthError(){
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminCanManageUsers')
    alert('Tu sesión expiró. Por favor iniciá sesión nuevamente.')
    navigate('/admin/login')
  }

  // Provinces list for select
  const PROVINCES = [
    'Buenos Aires','Catamarca','Chaco','Chubut','Córdoba','Corrientes','Entre Ríos','Formosa','Jujuy','La Pampa','La Rioja','Mendoza','Misiones','Neuquén','Río Negro','Salta','San Juan','San Luis','Santa Cruz','Santa Fe','Santiago del Estero','Tierra del Fuego','Ciudad Autónoma de Buenos Aires'
  ]

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

  function normalizeRefundPolicyNotice(rawValue){
    if(typeof rawValue !== 'string') return DEFAULT_REFUND_POLICY_NOTICE
    return rawValue.trim() ? rawValue : DEFAULT_REFUND_POLICY_NOTICE
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

  function transferAmountToInput(rawValue){
    const parsed = parseTransferAmount(rawValue, 0)
    if(parsed <= 0) return ''
    return String(parsed)
  }

  function formatCurrencyArs(rawAmount){
    const parsed = parseTransferAmount(rawAmount, 0)
    if(parsed <= 0) return 'No definido'
    return parsed.toLocaleString('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  function normalizeExternalLink(rawLink){
    const trimmed = typeof rawLink === 'string' ? rawLink.trim() : ''
    if(!trimmed) return ''
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  }

  function normalizeWhatsappNumber(rawNumber){
    if(typeof rawNumber !== 'string') return ''
    return rawNumber.trim().replace(/[\s()-]/g, '')
  }

  function normalizePaymentMethod(rawValue){
    if(typeof rawValue !== 'string') return ''
    return rawValue.trim().replace(/\s+/g, ' ')
  }

  function parsePaymentMethodsInput(rawValue){
    if(typeof rawValue !== 'string') return []
    const unique = []
    const seen = new Set()
    for(const part of rawValue.split(',')){
      const normalized = normalizePaymentMethod(part)
      if(!normalized) continue
      const key = normalized.toLowerCase()
      if(seen.has(key)) continue
      seen.add(key)
      unique.push(normalized)
    }
    return unique
  }

  function paymentMethodsToText(rawValue){
    return parsePaymentMethodsInput(rawValue).join(', ')
  }

  function normalizeEventDate(rawValue){
    if(typeof rawValue !== 'string') return ''
    const trimmed = rawValue.trim()
    if(!trimmed) return ''
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if(!match) return ''
    const [, year, month, day] = match
    const parsed = new Date(Number(year), Number(month) - 1, Number(day))
    if(
      parsed.getFullYear() !== Number(year)
      || parsed.getMonth() !== Number(month) - 1
      || parsed.getDate() !== Number(day)
    ) return ''
    return `${year}-${month}-${day}`
  }

  function normalizeEventDates(rawDates){
    const source = Array.isArray(rawDates) ? rawDates : []
    const unique = []
    const seen = new Set()
    for(const value of source){
      const normalized = normalizeEventDate(typeof value === 'string' ? value : String(value ?? ''))
      if(!normalized || seen.has(normalized)) continue
      seen.add(normalized)
      unique.push(normalized)
    }
    unique.sort((a,b)=>a.localeCompare(b))
    return unique
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

  function formatPaymentMethodsFromSettings(settings){
    const source = Array.isArray(settings?.reservationPaymentMethods) ? settings.reservationPaymentMethods : []
    const unique = []
    const seen = new Set()
    for(const item of source){
      const normalized = normalizePaymentMethod(item)
      if(!normalized) continue
      const key = normalized.toLowerCase()
      if(seen.has(key)) continue
      seen.add(key)
      unique.push(normalized)
    }
    return unique
  }

  function normalizeTransferAlias(rawValue){
    if(typeof rawValue !== 'string') return ''
    return rawValue.trim()
  }

  function normalizeTransferCBU(rawValue){
    if(typeof rawValue !== 'string') return ''
    return rawValue.replace(/\s+/g, '').trim()
  }

  function normalizeTransferBanco(rawValue){
    if(typeof rawValue !== 'string') return ''
    return rawValue.trim().replace(/\s+/g, ' ')
  }

  function normalizeTransferAccountPreset(rawValue){
    if(!rawValue || typeof rawValue !== 'object') return null

    const alias = normalizeTransferAlias(rawValue.alias ?? rawValue.transferAlias ?? '')
    const cbu = normalizeTransferCBU(rawValue.cbu ?? rawValue.transferCBU ?? '')
    const banco = normalizeTransferBanco(rawValue.banco ?? rawValue.transferBanco ?? '')

    if(!alias && !cbu && !banco) return null

    return { alias, cbu, banco }
  }

  function transferAccountPresetKey(rawValue){
    const normalized = normalizeTransferAccountPreset(rawValue)
    if(!normalized) return ''
    return `${normalized.alias.toLowerCase()}|${normalized.cbu}|${normalized.banco.toLowerCase()}`
  }

  function formatTransferAccountLabel(rawValue){
    const normalized = normalizeTransferAccountPreset(rawValue)
    if(!normalized) return 'Cuenta guardada'
    const maskedCbu = normalized.cbu ? `••••${normalized.cbu.slice(-4)}` : ''
    const primary = normalized.alias || (maskedCbu ? `CBU ${maskedCbu}` : 'Cuenta guardada')
    const details = []
    if(normalized.banco) details.push(normalized.banco)
    if(maskedCbu && normalized.alias) details.push(maskedCbu)
    return details.length ? `${primary} · ${details.join(' · ')}` : primary
  }

  function formatTransferAccountsFromSettings(settings){
    const source = Array.isArray(settings?.transferAccountPresets) ? settings.transferAccountPresets : []
    const unique = []
    const seen = new Set()
    for(const item of source){
      const normalized = normalizeTransferAccountPreset(item)
      if(!normalized || (!normalized.alias && !normalized.cbu)) continue
      const key = transferAccountPresetKey(normalized)
      if(!key || seen.has(key)) continue
      seen.add(key)
      unique.push(normalized)
    }
    return unique
  }

  function formatEventDefaultsFromSettings(settings){
    const raw = settings?.eventDefaults && typeof settings.eventDefaults === 'object' ? settings.eventDefaults : {}
    return {
      whatsappNumber: normalizeWhatsappNumber(raw.whatsappNumber || ''),
      reservationLink: typeof raw.reservationLink === 'string' ? raw.reservationLink.trim() : '',
      paymentMethods: paymentMethodsToText(raw.paymentMethods || ''),
      transferAlias: normalizeTransferAlias(raw.transferAlias || ''),
      transferCBU: normalizeTransferCBU(raw.transferCBU || ''),
      transferBanco: normalizeTransferBanco(raw.transferBanco || ''),
      transferAmount: transferAmountToInput(raw.transferAmount),
      paymentProofDestination: typeof raw.paymentProofDestination === 'string' ? raw.paymentProofDestination.trim() : '',
      postPaymentInstructions: typeof raw.postPaymentInstructions === 'string' ? raw.postPaymentInstructions.trim() : '',
      refundPolicyNotice: normalizeRefundPolicyNotice(raw.refundPolicyNotice)
    }
  }

  function mergePaymentMethodIntoField(currentValue, methodValue){
    const method = normalizePaymentMethod(methodValue)
    if(!method) return paymentMethodsToText(currentValue)
    const currentList = parsePaymentMethodsInput(currentValue)
    if(currentList.some(item => item.toLowerCase() === method.toLowerCase())){
      return currentList.join(', ')
    }
    return [...currentList, method].join(', ')
  }

  function formatWhatsappNumbersFromSettings(settings){
    const source = Array.isArray(settings?.reservationWhatsappNumbers) ? settings.reservationWhatsappNumbers : []
    const unique = []
    for(const item of source){
      const normalized = normalizeWhatsappNumber(item)
      if(!normalized || unique.includes(normalized)) continue
      unique.push(normalized)
    }
    return unique
  }

  function formatTransferWhatsappNumbersFromSettings(settings){
    const source = Array.isArray(settings?.transferWhatsappNumbers) ? settings.transferWhatsappNumbers : []
    const unique = []
    for(const item of source){
      const normalized = normalizeWhatsappNumber(item)
      if(!normalized || unique.includes(normalized)) continue
      unique.push(normalized)
    }
    return unique
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

  function formatSocialLinksFromSettings(settings){
    const source = Array.isArray(settings?.socialLinks) ? settings.socialLinks : []

    const normalized = source
      .map(item=>({
        name: typeof item?.name === 'string' ? item.name.trim() : '',
        icon: typeof item?.icon === 'string' ? item.icon.trim() : '',
        link: normalizeExternalLink(item?.link)
      }))
      .filter(item=>item.name && item.icon && item.link && isValidExternalLink(item.link))

    if(normalized.length){
      return normalized.map((item, idx)=>({ id: `social-${Date.now()}-${idx}`, ...item }))
    }

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
    load()
    loadDrivers(false)
    loadAdminUsers(false)
    loadComments()
    axios.get(api+'/api/settings').then(r=>{
      const settings = r.data || {}
      const defaults = formatEventDefaultsFromSettings(settings)
      if(settings?.driverLoginLogo) setDriverLogoSaved(settings.driverLoginLogo)
      setSocialLinks(formatSocialLinksFromSettings(settings))
      setSavedWhatsappNumbers(formatWhatsappNumbersFromSettings(settings))
      setSavedTransferWhatsappNumbers(formatTransferWhatsappNumbersFromSettings(settings))
      setSavedPaymentMethods(formatPaymentMethodsFromSettings(settings))
      setSavedTransferAccounts(formatTransferAccountsFromSettings(settings))
      setWhatsappNumber(defaults.whatsappNumber)
      setReservationLink(defaults.reservationLink)
      setPaymentMethods(defaults.paymentMethods)
      setTransferAlias(defaults.transferAlias)
      setTransferCBU(defaults.transferCBU)
      setTransferBanco(defaults.transferBanco)
      setTransferAmount(defaults.transferAmount)
      setPaymentProofDestination(defaults.paymentProofDestination)
      setPostPaymentInstructions(defaults.postPaymentInstructions)
      setRefundPolicyNotice(defaults.refundPolicyNotice)
    }).catch(()=>{})
  }, [])

  async function saveWhatsappNumbers(nextNumbers, options = {}){
    const { showSuccessMessage = false, silentError = false } = options
    const token = localStorage.getItem('adminToken')
    if(!token){
      if(!silentError) setMsg('Error guardando números: iniciá sesión como admin')
      return null
    }

    const unique = []
    for(const value of nextNumbers){
      const normalized = normalizeWhatsappNumber(value)
      if(!normalized || unique.includes(normalized)) continue
      unique.push(normalized)
    }

    try{
      setSavingWhatsappNumbers(true)
      const res = await axios.post(
        api+"/api/settings/reservation-whatsapp-numbers",
        { numbers: unique },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const saved = Array.isArray(res?.data?.reservationWhatsappNumbers)
        ? res.data.reservationWhatsappNumbers.map(normalizeWhatsappNumber).filter(Boolean)
        : unique
      setSavedWhatsappNumbers(saved)
      if(showSuccessMessage) setMsg('Números de WhatsApp guardados')
      return saved
    }catch(err){
      console.error(err)
      const status = err?.response?.status
      if(status === 401 || status === 403){ handleAuthError(); return null }
      if(!silentError) setMsg('Error guardando números de WhatsApp')
      return null
    }finally{
      setSavingWhatsappNumbers(false)
    }
  }

  function addCurrentWhatsappNumberToSaved(){
    const normalized = normalizeWhatsappNumber(whatsappNumber)
    if(!normalized){
      setMsg('Ingresá un número de WhatsApp válido')
      return
    }
    setWhatsappNumber(normalized)
    if(savedWhatsappNumbers.includes(normalized)){
      setMsg('Ese número ya está guardado')
      return
    }
    saveWhatsappNumbers([...savedWhatsappNumbers, normalized], { showSuccessMessage: true })
  }

  function selectSavedWhatsappNumber(value){
    if(!value) return
    setWhatsappNumber(value)
  }

  async function removeSavedWhatsappNumber(value){
    if(!value) return
    const confirmed = window.confirm(`¿Eliminar ${value} de números guardados?`)
    if(!confirmed) return
    const filtered = savedWhatsappNumbers.filter(item => item !== value)
    setSavedWhatsappNumbers(filtered)
    const result = await saveWhatsappNumbers(filtered, { showSuccessMessage: true })
    if(result === null) setSavedWhatsappNumbers(savedWhatsappNumbers)
  }

  async function saveTransferWhatsappNumbers(nextNumbers, options = {}){
    const { showSuccessMessage = false, silentError = false } = options
    const token = localStorage.getItem('adminToken')
    if(!token){
      if(!silentError) setMsg('Error: iniciá sesión como admin')
      return null
    }
    const unique = []
    for(const value of nextNumbers){
      const normalized = normalizeWhatsappNumber(value)
      if(!normalized || unique.includes(normalized)) continue
      unique.push(normalized)
    }
    try{
      setSavingTransferWhatsappNumbers(true)
      const res = await axios.post(
        api+"/api/settings/transfer-whatsapp-numbers",
        { numbers: unique },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const saved = Array.isArray(res?.data?.transferWhatsappNumbers)
        ? res.data.transferWhatsappNumbers.map(normalizeWhatsappNumber).filter(Boolean)
        : unique
      setSavedTransferWhatsappNumbers(saved)
      if(showSuccessMessage) setMsg('Números de WhatsApp guardados')
      return saved
    }catch(err){
      console.error(err)
      const status = err?.response?.status
      if(status === 401 || status === 403){ handleAuthError(); return null }
      if(!silentError) setMsg('Error guardando números de WhatsApp')
      return null
    }finally{
      setSavingTransferWhatsappNumbers(false)
    }
  }

  async function removeTransferWhatsappNumber(value){
    if(!value) return
    const confirmed = window.confirm(`¿Eliminar ${value} de números guardados?`)
    if(!confirmed) return
    const filtered = savedTransferWhatsappNumbers.filter(item => item !== value)
    setSavedTransferWhatsappNumbers(filtered)
    const result = await saveTransferWhatsappNumbers(filtered, { showSuccessMessage: true })
    if(result === null) setSavedTransferWhatsappNumbers(savedTransferWhatsappNumbers)
  }

  async function assignTransferWhatsapp(evId, number){
    const token = localStorage.getItem('adminToken')
    try{
      await axios.patch(
        api+`/api/events/${evId}`,
        { transferReportWhatsapp: number },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setMsg(number ? 'WhatsApp de transferencia asignado' : 'WhatsApp de transferencia eliminado')
      if(number){
        const normalized = normalizeWhatsappNumber(number)
        if(normalized && !savedTransferWhatsappNumbers.includes(normalized)){
          saveTransferWhatsappNumbers([...savedTransferWhatsappNumbers, normalized], { silentError: true })
        }
      }
      load()
    }catch(err){ console.error(err); setMsg('Error asignando WhatsApp') }
  }

  async function savePaymentMethods(nextMethods, options = {}){
    const { showSuccessMessage = false, silentError = false } = options
    const token = localStorage.getItem('adminToken')
    if(!token){
      if(!silentError) setMsg('Error guardando formas de pago: iniciá sesión como admin')
      return null
    }

    const unique = []
    const seen = new Set()
    for(const value of nextMethods){
      const normalized = normalizePaymentMethod(value)
      if(!normalized) continue
      const key = normalized.toLowerCase()
      if(seen.has(key)) continue
      seen.add(key)
      unique.push(normalized)
    }

    try{
      setSavingPaymentMethods(true)
      const res = await axios.post(
        api+"/api/settings/reservation-payment-methods",
        { methods: unique },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const saved = Array.isArray(res?.data?.reservationPaymentMethods)
        ? res.data.reservationPaymentMethods.map(normalizePaymentMethod).filter(Boolean)
        : unique
      setSavedPaymentMethods(saved)
      if(showSuccessMessage) setMsg('Formas de pago guardadas')
      return saved
    }catch(err){
      console.error(err)
      const status = err?.response?.status
      if(status === 401 || status === 403){ handleAuthError(); return null }
      if(!silentError) setMsg('Error guardando formas de pago')
      return null
    }finally{
      setSavingPaymentMethods(false)
    }
  }

  function addCurrentPaymentMethodsToSaved(){
    const parsed = parsePaymentMethodsInput(paymentMethods)
    if(!parsed.length){
      setMsg('Ingresá al menos una forma de pago')
      return
    }

    let changed = false
    const next = [...savedPaymentMethods]
    const existingLower = new Set(savedPaymentMethods.map(item => item.toLowerCase()))
    for(const method of parsed){
      const key = method.toLowerCase()
      if(existingLower.has(key)) continue
      existingLower.add(key)
      next.push(method)
      changed = true
    }

    setPaymentMethods(parsed.join(', '))
    if(!changed){
      setMsg('Esas formas de pago ya están guardadas')
      return
    }
    savePaymentMethods(next, { showSuccessMessage: true })
  }

  function selectSavedPaymentMethod(value){
    if(!value) return
    setPaymentMethods(prev => mergePaymentMethodIntoField(prev, value))
  }

  function removeSavedPaymentMethod(value){
    if(!value) return
    const confirmed = window.confirm(`¿Eliminar \"${value}\" de formas de pago guardadas?`)
    if(!confirmed) return
    savePaymentMethods(savedPaymentMethods.filter(item => item.toLowerCase() !== value.toLowerCase()), { showSuccessMessage: true })
  }

  async function saveTransferAccounts(nextAccounts, options = {}){
    const { showSuccessMessage = false, silentError = false } = options
    const token = localStorage.getItem('adminToken')
    if(!token){
      if(!silentError) setMsg('Error guardando cuentas: iniciá sesión como admin')
      return null
    }

    const unique = []
    const seen = new Set()
    for(const value of nextAccounts){
      const normalized = normalizeTransferAccountPreset(value)
      if(!normalized || (!normalized.alias && !normalized.cbu)) continue
      const key = transferAccountPresetKey(normalized)
      if(!key || seen.has(key)) continue
      seen.add(key)
      unique.push(normalized)
    }

    try{
      setSavingTransferAccounts(true)
      const res = await axios.post(
        api+"/api/settings/transfer-account-presets",
        { accounts: unique },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const saved = formatTransferAccountsFromSettings(res?.data || { transferAccountPresets: unique })
      setSavedTransferAccounts(saved)
      if(showSuccessMessage) setMsg('Cuentas de transferencia guardadas')
      return saved
    }catch(err){
      console.error(err)
      const status = err?.response?.status
      if(status === 401 || status === 403){ handleAuthError(); return null }
      if(!silentError) setMsg('Error guardando cuentas de transferencia')
      return null
    }finally{
      setSavingTransferAccounts(false)
    }
  }

  function addCurrentTransferAccountToSaved(){
    const normalized = normalizeTransferAccountPreset({ alias: transferAlias, cbu: transferCBU, banco: transferBanco })
    if(!normalized || (!normalized.alias && !normalized.cbu)){
      setMsg('Completá alias o CBU para guardar la cuenta')
      return
    }

    setTransferAlias(normalized.alias)
    setTransferCBU(normalized.cbu)
    setTransferBanco(normalized.banco)

    const key = transferAccountPresetKey(normalized)
    if(savedTransferAccounts.some(item => transferAccountPresetKey(item) === key)){
      setMsg('Esa cuenta ya está guardada')
      return
    }

    saveTransferAccounts([...savedTransferAccounts, normalized], { showSuccessMessage: true })
  }

  function selectSavedTransferAccount(value){
    if(!value) return
    const selected = savedTransferAccounts.find(item => transferAccountPresetKey(item) === value)
    if(!selected) return
    setTransferAlias(selected.alias)
    setTransferCBU(selected.cbu)
    setTransferBanco(selected.banco)
  }

  async function removeSavedTransferAccount(rawValue){
    const targetKey = transferAccountPresetKey(rawValue)
    if(!targetKey) return
    const target = savedTransferAccounts.find(item => transferAccountPresetKey(item) === targetKey)
    if(!target) return
    const confirmed = window.confirm(`¿Eliminar \"${formatTransferAccountLabel(target)}\" de cuentas guardadas?`)
    if(!confirmed) return
    const filtered = savedTransferAccounts.filter(item => transferAccountPresetKey(item) !== targetKey)
    setSavedTransferAccounts(filtered)
    const result = await saveTransferAccounts(filtered, { showSuccessMessage: true })
    if(result === null) setSavedTransferAccounts(savedTransferAccounts)
  }

  async function saveEventDefaults(){
    const token = localStorage.getItem('adminToken')
    if(!token){
      setMsg('Error guardando plantilla: iniciá sesión como admin')
      return
    }

    const payload = {
      whatsappNumber: normalizeWhatsappNumber(whatsappNumber),
      reservationLink: typeof reservationLink === 'string' ? reservationLink.trim() : '',
      paymentMethods: paymentMethodsToText(paymentMethods),
      transferAlias: normalizeTransferAlias(transferAlias),
      transferCBU: normalizeTransferCBU(transferCBU),
      transferBanco: normalizeTransferBanco(transferBanco),
      transferAmount: parseTransferAmount(transferAmount, 0),
      paymentProofDestination: typeof paymentProofDestination === 'string' ? paymentProofDestination.trim() : '',
      postPaymentInstructions: typeof postPaymentInstructions === 'string' ? postPaymentInstructions.trim() : '',
      refundPolicyNotice: normalizeRefundPolicyNotice(refundPolicyNotice)
    }

    try{
      setSavingEventDefaults(true)
      const res = await axios.post(
        api+"/api/settings/event-defaults",
        { eventDefaults: payload },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const saved = formatEventDefaultsFromSettings(res?.data || { eventDefaults: payload })
      setWhatsappNumber(saved.whatsappNumber)
      setReservationLink(saved.reservationLink)
      setPaymentMethods(saved.paymentMethods)
      setTransferAlias(saved.transferAlias)
      setTransferCBU(saved.transferCBU)
      setTransferBanco(saved.transferBanco)
      setTransferAmount(saved.transferAmount)
      setPaymentProofDestination(saved.paymentProofDestination)
      setPostPaymentInstructions(saved.postPaymentInstructions)
      setRefundPolicyNotice(saved.refundPolicyNotice)
      setMsg('Plantilla guardada correctamente')
    }catch(err){
      console.error(err)
      const status = err?.response?.status
      if(status === 401 || status === 403){ handleAuthError(); return }
      setMsg('Error guardando plantilla')
    }finally{
      setSavingEventDefaults(false)
    }
  }

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
      setResetResults(prev=>{
        const next = {}
        for(const d of arr){
          if(prev[d.id]) next[d.id] = prev[d.id]
        }
        return next
      })
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

  async function loadAdminUsers(showFeedback = true){
    const token = localStorage.getItem('adminToken')
    if(!token){
      setAdminUsers([])
      setAdminUserPasswordDrafts({})
      setVisibleAdminUserPasswords({})
      setUpdatingAdminUserPasswordId('')
      setCanManageAdminUsers(false)
      localStorage.removeItem('adminCanManageUsers')
      if(showFeedback) setMsg('Error cargando admins: iniciá sesión como admin')
      return
    }

    try{
      setLoadingAdminUsers(true)
      const res = await axios.get(api+"/api/admin/users", { headers: { Authorization: `Bearer ${token}` } })
      const data = Array.isArray(res.data) ? res.data : []
      setAdminUsers(data)
      setAdminUserPasswordDrafts(prev=>{
        const next = {}
        for(const item of data){
          if(!item?.id) continue
          const previousValue = typeof prev[item.id] === 'string' ? prev[item.id] : ''
          const currentValue = typeof item.currentPassword === 'string' ? item.currentPassword : ''
          next[item.id] = previousValue || currentValue || ''
        }
        return next
      })
      setVisibleAdminUserPasswords(prev=>{
        const next = {}
        for(const item of data){
          if(item?.id && prev[item.id] === true) next[item.id] = true
        }
        return next
      })
      setUpdatingAdminUserPasswordId('')
      setCanManageAdminUsers(true)
      localStorage.setItem('adminCanManageUsers', '1')
      if(showFeedback) setMsg(data.length ? `Admins cargados: ${data.length}` : 'No hay usuarios admin cargados')
    }catch(err){
      console.error(err)
      const status = err?.response?.status
      if(status===401 || status===403){
        if(status===403){
          setAdminUsers([])
          setAdminUserPasswordDrafts({})
          setVisibleAdminUserPasswords({})
          setUpdatingAdminUserPasswordId('')
          setCanManageAdminUsers(false)
          localStorage.setItem('adminCanManageUsers', '0')
          if(showFeedback) setMsg('No tenés permisos para gestionar usuarios admin')
          return
        }
        if(showFeedback) setMsg('Error cargando admins: sesión inválida')
        return
      }
      if(showFeedback) setMsg('Error cargando usuarios admin')
    }finally{
      setLoadingAdminUsers(false)
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
    const dayMs = getCalendarDayTime(dateValue)
    if(!Number.isFinite(dayMs)) return 'Fecha inválida'
    return new Date(dayMs).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  function formatEventDatesSummary(rawDates, fallbackDate = ''){
    const normalized = normalizeEventDates([...(Array.isArray(rawDates) ? rawDates : []), fallbackDate])
    if(!normalized.length) return 'Fecha no definida'
    if(normalized.length === 1) return formatDateTime(normalized[0])
    return normalized.map(value => formatDateTime(value)).join(' • ')
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
      const normalizedRefundPolicyNotice = normalizeRefundPolicyNotice(refundPolicyNotice)
      const normalizedWhatsappNumber = normalizeWhatsappNumber(whatsappNumber)
      const normalizedPaymentMethods = paymentMethodsToText(paymentMethods)
      const normalizedTransferAmount = parseTransferAmount(transferAmount, 0)
      const normalizedEventDates = normalizeEventDates([...eventDates, date, dateInput])
      const primaryEventDate = normalizedEventDates[0] || ''
      const token = localStorage.getItem('adminToken')
      if(correctedFile){
        const fd = new FormData()
        fd.append('image', correctedFile)
        fd.append('name', name)
        fd.append('code', name)
        fd.append('date', primaryEventDate)
        fd.append('dates', JSON.stringify(normalizedEventDates))
        fd.append('province', province)
        fd.append('reservationLink', reservationLink)
        fd.append('whatsappNumber', normalizedWhatsappNumber)
        fd.append('departurePlace', departurePlaces[0] || '')
        fd.append('departurePlaces', JSON.stringify(departurePlaces))
        fd.append('departureTimes', JSON.stringify(departureTimes))
        fd.append('returnTime', returnTime)
        fd.append('paymentMethods', normalizedPaymentMethods)
        fd.append('transferAlias', transferAlias)
        fd.append('transferCBU', transferCBU)
        fd.append('transferBanco', transferBanco)
        fd.append('transferAmount', String(normalizedTransferAmount))
        fd.append('imageFocusX', String(imageFocusX))
        fd.append('imageFocusY', String(imageFocusY))
        fd.append('imageScale', String(imageScale))
        fd.append('paymentProofDestination', paymentProofDestination)
        fd.append('postPaymentInstructions', postPaymentInstructions)
        fd.append('refundPolicyNotice', normalizedRefundPolicyNotice)

        // Debug: log FormData entries (for development only)
        console.debug('Creating event (FormData). Selected province:', province)
        for(const entry of fd.entries()){
          console.debug('FormData entry:', entry[0], entry[1])
        }

        const res = await axios.post(api+"/api/events/upload", fd, { headers: { Authorization: `Bearer ${token}` } })
        console.debug('Server response:', res && res.data)
      }else{
        const payload = {
          name,
          code: name,
          date: primaryEventDate,
          dates: normalizedEventDates,
          reservationLink,
          whatsappNumber: normalizedWhatsappNumber,
          province,
          departurePlace: departurePlaces[0] || '',
          departurePlaces,
          departureTimes,
          returnTime,
          paymentMethods: normalizedPaymentMethods,
          transferAlias,
          transferCBU,
          transferBanco,
          transferAmount: normalizedTransferAmount,
          imageFocusX,
          imageFocusY,
          imageScale,
          paymentProofDestination,
          postPaymentInstructions,
          refundPolicyNotice: normalizedRefundPolicyNotice
        }
        console.debug('Creating event (JSON). Payload:', payload)
        const res = await axios.post(api+"/api/events", payload, { headers: { Authorization: `Bearer ${token}` } })
        console.debug('Server response:', res && res.data)
      }
      if(normalizedWhatsappNumber && !savedWhatsappNumbers.includes(normalizedWhatsappNumber)){
        await saveWhatsappNumbers([...savedWhatsappNumbers, normalizedWhatsappNumber], { silentError: true })
      }
      if(normalizedPaymentMethods){
        const parsedPaymentMethods = parsePaymentMethodsInput(normalizedPaymentMethods)
        let changed = false
        const next = [...savedPaymentMethods]
        const existingLower = new Set(savedPaymentMethods.map(item => item.toLowerCase()))
        for(const method of parsedPaymentMethods){
          const key = method.toLowerCase()
          if(existingLower.has(key)) continue
          existingLower.add(key)
          next.push(method)
          changed = true
        }
        if(changed) await savePaymentMethods(next, { silentError: true })
      }
      const normalizedTransferAccount = normalizeTransferAccountPreset({ alias: transferAlias, cbu: transferCBU, banco: transferBanco })
      if(normalizedTransferAccount && (normalizedTransferAccount.alias || normalizedTransferAccount.cbu)){
        const transferKey = transferAccountPresetKey(normalizedTransferAccount)
        const alreadySaved = savedTransferAccounts.some(item => transferAccountPresetKey(item) === transferKey)
        if(!alreadySaved) await saveTransferAccounts([...savedTransferAccounts, normalizedTransferAccount], { silentError: true })
      }
      setName(''); setDate(''); setDateInput(''); setEventDates([]); setImage(null); setImagePreview(null); setCorrectedFile(null)
      setProvince('')
      setDeparturePlaces([])
      setDeparturePlaceInput('')
      setDepartureTimes([])
      setDepartureTimeInput('')
      setReturnTime('')
      setReturnTimeMode('time')
      setImageFocusX(50)
      setImageFocusY(50)
      setImageScale(100)
      setMsg('Evento creado correctamente')
      load()
    }catch(err){const status = err?.response?.status; if(status===401||status===403){ handleAuthError(); return } console.error(err); setMsg('Error creando evento')}
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

  function updateSocialDraft(patch){
    setSocialDraft(prev=>({ ...prev, ...patch }))
  }

  function addSocialLinkDraft(){
    const name = socialDraft.name.trim()
    const icon = socialDraft.icon.trim()
    const link = normalizeExternalLink(socialDraft.link)

    if(!name || !icon || !link || !isValidExternalLink(link)){
      setMsg('Completá nombre, icono y link válido para agregar la red')
      return
    }

    setSocialLinks(prev=>([
      ...prev,
      {
        id: `social-${Date.now()}-${prev.length}`,
        name,
        icon,
        link
      }
    ]))
    setSocialDraft({ name: '', icon: '', link: '' })
    setMsg('')
  }

  async function removeSocialLinkDraft(socialId){
    const previousLinks = socialLinks
    const nextLinks = previousLinks.filter(item=>item.id !== socialId)
    if(nextLinks.length === previousLinks.length) return

    setSocialLinks(nextLinks)
    const saved = await saveSocialLinks(nextLinks, {
      successMessage: 'Red social eliminada',
      silentError: true
    })

    if(!saved){
      setSocialLinks(previousLinks)
      setMsg('No se pudo eliminar la red social')
    }
  }

  function isInstagramSocial(item){
    const name = typeof item?.name === 'string' ? item.name.toLowerCase() : ''
    const link = normalizeExternalLink(item?.link).toLowerCase()
    return name.includes('instagram') || link.includes('instagram.com')
  }

  function renderSocialAdminIcon(item){
    if(isInstagramSocial(item)){
      return (
        <span className="social-admin-icon social-admin-icon--instagram" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2"/>
            <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2"/>
            <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor"/>
          </svg>
        </span>
      )
    }

    return <span className="social-admin-icon" aria-hidden="true">{item.icon || '🔗'}</span>
  }

  async function saveSocialLinks(rawSocialLinks, options = {}){
    const { successMessage = 'Redes sociales actualizadas', silentError = false } = options
    try{
      setSavingSocialLinks(true)
      const token = localStorage.getItem('adminToken')
      if(!token){
        if(!silentError) setMsg('Sesión de admin inválida')
        return false
      }

      const source = Array.isArray(rawSocialLinks) ? rawSocialLinks : socialLinks
      const payload = []
      for(let i = 0; i < source.length; i += 1){
        const item = source[i]
        const name = typeof item?.name === 'string' ? item.name.trim() : ''
        const icon = typeof item?.icon === 'string' ? item.icon.trim() : ''
        const link = normalizeExternalLink(item?.link)

        if(!name || !icon || !link || !isValidExternalLink(link)){
          if(!silentError) setMsg(`Revisá la red #${i + 1}: falta nombre/icono o link válido`)
          return false
        }

        payload.push({ name, icon, link })
      }

      const res = await axios.post(
        api+"/api/settings/social-links",
        { socialLinks: payload },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      setSocialLinks(formatSocialLinksFromSettings({ socialLinks: res.data?.socialLinks || [] }))
      if(successMessage) setMsg(successMessage)
      return true
    }catch(err){
      console.error(err)
      if(!silentError) setMsg(err?.response?.data?.error || 'Error guardando redes sociales')
      return false
    }finally{
      setSavingSocialLinks(false)
    }
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

  async function handleDeleteDriver(driverId, driverName){
    const label = driverName || 'este chofer'
    if(!confirm(`¿Eliminar credenciales y acceso de ${label}? Esta acción no se puede deshacer.`)) return

    setDeletingDriverId(driverId)
    try{
      const token = localStorage.getItem('adminToken')
      await axios.delete(api+`/api/drivers/${driverId}`, { headers: { Authorization: `Bearer ${token}` } })

      setResetResults(prev=>{
        if(!prev[driverId]) return prev
        const next = { ...prev }
        delete next[driverId]
        return next
      })

      setMsg('Credenciales y acceso de chofer eliminados')
      loadDrivers(false)
      load()
    }catch(err){
      console.error(err)
      const status = err?.response?.status
      if(status === 404) setMsg('El chofer ya no existe o fue eliminado')
      else setMsg('Error eliminando acceso de chofer')
    }finally{
      setDeletingDriverId(null)
    }
  }

  function setAdminPasswordDraftForUser(adminId, value){
    setAdminUserPasswordDrafts(prev=>({ ...prev, [adminId]: value }))
  }

  function toggleAdminUserPasswordVisibility(adminId){
    setVisibleAdminUserPasswords(prev=>({ ...prev, [adminId]: !prev[adminId] }))
  }

  function generateAdminUserPassword(adminId){
    const generated = buildPassword(12)
    setAdminUserPasswordDrafts(prev=>({ ...prev, [adminId]: generated }))
    setVisibleAdminUserPasswords(prev=>({ ...prev, [adminId]: true }))
  }

  async function copyAdminUserPassword(adminId, label){
    const passwordValue = typeof adminUserPasswordDrafts[adminId] === 'string'
      ? adminUserPasswordDrafts[adminId].trim()
      : ''

    if(!passwordValue){
      setMsg('No hay contraseña para copiar en este usuario')
      return
    }

    try{
      await navigator.clipboard.writeText(passwordValue)
      setMsg(`Contraseña copiada de ${label || 'usuario administrador'}`)
    }catch(err){
      console.error(err)
      setMsg('No se pudo copiar la contraseña al portapapeles')
    }
  }

  async function handleCreateAdminUser(){
    if(!canManageAdminUsers){
      setMsg('No tenés permisos para crear usuarios admin')
      return
    }

    const email = typeof adminUserEmail === 'string' ? adminUserEmail.trim().toLowerCase() : ''
    const password = typeof adminUserPassword === 'string' ? adminUserPassword.trim() : ''
    const nameValue = typeof adminUserName === 'string' ? adminUserName.trim() : ''

    if(!email){
      setMsg('Ingresá un email para crear el usuario administrador')
      return
    }

    if(!/^\S+@\S+\.\S+$/.test(email)){
      setMsg('El email ingresado no es válido')
      return
    }

    if(password.length < 8){
      setMsg('La contraseña del admin debe tener al menos 8 caracteres')
      return
    }

    setCreatingAdminUser(true)
    try{
      const token = localStorage.getItem('adminToken')
      const res = await axios.post(
        api+"/api/admin/users",
        { email, password, name: nameValue },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      const createdId = typeof res?.data?.admin?.id === 'string' ? res.data.admin.id : ''
      if(createdId){
        setAdminUserPasswordDrafts(prev=>({ ...prev, [createdId]: password }))
        setVisibleAdminUserPasswords(prev=>({ ...prev, [createdId]: true }))
      }

      setAdminUserEmail('')
      setAdminUserPassword('')
      setAdminUserName('')
      setMsg('Usuario administrador creado')
      loadAdminUsers(false)
    }catch(err){
      console.error(err)
      const status = err?.response?.status
      if(status===401){ handleAuthError(); return }
      if(status===403){
        setCanManageAdminUsers(false)
        localStorage.setItem('adminCanManageUsers', '0')
        setMsg(err?.response?.data?.error || 'No tenés permisos para crear usuarios admin')
        return
      }
      setMsg(err?.response?.data?.error || 'Error creando usuario administrador')
    }finally{
      setCreatingAdminUser(false)
    }
  }

  async function handleDeleteAdminUser(adminId, label){
    if(!canManageAdminUsers){
      setMsg('No tenés permisos para eliminar usuarios admin')
      return
    }

    const targetLabel = label || 'este usuario administrador'
    if(!confirm(`¿Eliminar ${targetLabel}? Esta acción no se puede deshacer.`)) return

    setDeletingAdminUserId(adminId)
    try{
      const token = localStorage.getItem('adminToken')
      await axios.delete(api+`/api/admin/users/${adminId}`, { headers: { Authorization: `Bearer ${token}` } })
      setAdminUserPasswordDrafts(prev=>{
        if(!Object.prototype.hasOwnProperty.call(prev, adminId)) return prev
        const next = { ...prev }
        delete next[adminId]
        return next
      })
      setVisibleAdminUserPasswords(prev=>{
        if(!Object.prototype.hasOwnProperty.call(prev, adminId)) return prev
        const next = { ...prev }
        delete next[adminId]
        return next
      })
      setMsg('Usuario administrador eliminado')
      loadAdminUsers(false)
    }catch(err){
      console.error(err)
      const status = err?.response?.status
      if(status===401){ handleAuthError(); return }
      if(status===403){
        setCanManageAdminUsers(false)
        localStorage.setItem('adminCanManageUsers', '0')
        setMsg(err?.response?.data?.error || 'No tenés permisos para eliminar usuarios admin')
        return
      }
      setMsg(err?.response?.data?.error || 'Error eliminando usuario administrador')
    }finally{
      setDeletingAdminUserId('')
    }
  }

  async function handleUpdateAdminUserPassword(adminId, label){
    if(!canManageAdminUsers){
      setMsg('No tenés permisos para actualizar contraseñas de admins')
      return
    }

    const newPassword = typeof adminUserPasswordDrafts[adminId] === 'string'
      ? adminUserPasswordDrafts[adminId].trim()
      : ''

    if(newPassword.length < 8){
      setMsg('La nueva contraseña debe tener al menos 8 caracteres')
      return
    }

    setUpdatingAdminUserPasswordId(adminId)
    try{
      const token = localStorage.getItem('adminToken')
      await axios.patch(
        api+`/api/admin/users/${adminId}/password`,
        { newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      setAdminUsers(prev=>prev.map(item=>(
        item.id === adminId ? { ...item, currentPassword: newPassword } : item
      )))
      setAdminUserPasswordDrafts(prev=>({ ...prev, [adminId]: newPassword }))
      setVisibleAdminUserPasswords(prev=>({ ...prev, [adminId]: true }))

      const targetLabel = label || 'usuario administrador'
      setMsg(`Contraseña actualizada para ${targetLabel}`)
    }catch(err){
      console.error(err)
      const status = err?.response?.status
      if(status===401){ handleAuthError(); return }
      if(status===403){
        setCanManageAdminUsers(false)
        localStorage.setItem('adminCanManageUsers', '0')
        setMsg(err?.response?.data?.error || 'No tenés permisos para actualizar contraseñas de admins')
        return
      }
      setMsg(err?.response?.data?.error || 'Error actualizando contraseña de admin')
    }finally{
      setUpdatingAdminUserPasswordId('')
    }
  }

  async function handleChangeMyAdminPassword(e){
    e.preventDefault()

    const currentPassword = typeof adminPasswordCurrent === 'string' ? adminPasswordCurrent.trim() : ''
    const newPassword = typeof adminPasswordNext === 'string' ? adminPasswordNext.trim() : ''
    const confirmPassword = typeof adminPasswordConfirm === 'string' ? adminPasswordConfirm.trim() : ''

    if(!currentPassword){
      setMsg('Ingresá tu contraseña actual')
      return
    }

    if(newPassword.length < 8){
      setMsg('La nueva contraseña debe tener al menos 8 caracteres')
      return
    }

    if(newPassword !== confirmPassword){
      setMsg('La confirmación no coincide con la nueva contraseña')
      return
    }

    setChangingAdminPassword(true)
    try{
      const token = localStorage.getItem('adminToken')
      if(!token){
        setMsg('Sesión de admin inválida')
        return
      }

      await axios.patch(
        api+"/api/admin/password",
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      setAdminPasswordCurrent('')
      setAdminPasswordNext('')
      setAdminPasswordConfirm('')
      setMsg('Contraseña actualizada correctamente')
    }catch(err){
      console.error(err)
      const status = err?.response?.status
      if(status===401 || status===403){ handleAuthError(); return }
      setMsg(err?.response?.data?.error || 'Error actualizando contraseña')
    }finally{
      setChangingAdminPassword(false)
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

  function toggleExtendedInfoForm(ev){
    if(expandedExtraInfoEventId === ev.id){
      setExpandedExtraInfoEventId('')
      return
    }

    setExpandedExtraInfoEventId(ev.id)
    setExtraInfoDeparturePlaceInput('')
    setExtraInfoDepartureTimeInput('')
    setExtraInfoDraft({
      departurePlaces: ev.departurePlaces && ev.departurePlaces.length > 0 ? ev.departurePlaces : (ev.departurePlace ? [ev.departurePlace] : []),
      departureTimes: ev.departureTimes && ev.departureTimes.length > 0 ? ev.departureTimes : (ev.departureTime ? [ev.departureTime] : []),
      returnTime: ev.returnTime || '',
      returnTimeMode: ev.returnTime && !/^\d{2}:\d{2}$/.test(ev.returnTime) ? 'text' : 'time',
      paymentMethods: ev.paymentMethods || '',
      imageFocusX: parseFocusPercent(ev.imageFocusX, 50),
      imageFocusY: parseFocusPercent(ev.imageFocusY, 50),
      imageScale: parseScalePercent(ev.imageScale, 100),
      transferAlias: ev.transferAlias || '',
      transferCBU: ev.transferCBU || '',
      transferBanco: ev.transferBanco || '',
      transferAmount: transferAmountToInput(ev.transferAmount),
      paymentProofDestination: ev.paymentProofDestination || '',
      postPaymentInstructions: ev.postPaymentInstructions || '',
      refundPolicyNotice: normalizeRefundPolicyNotice(ev.refundPolicyNotice)
    })
  }

  function updateExtraInfoDraft(patch){
    setExtraInfoDraft(prev => ({ ...prev, ...patch }))
  }

  function addDeparturePlace(){
    const place = departurePlaceInput.trim()
    if(!place || departurePlaces.includes(place)) return
    setDeparturePlaces(prev => [...prev, place])
    setDeparturePlaceInput('')
  }

  function addEventDate(){
    const normalized = normalizeEventDate(dateInput)
    if(!normalized) return
    setEventDates(prev => {
      const next = normalizeEventDates([...prev, normalized])
      setDate(next[0] || '')
      return next
    })
    setDateInput('')
  }

  function removeEventDate(value){
    const normalized = normalizeEventDate(value)
    if(!normalized) return
    setEventDates(prev => {
      const next = prev.filter(item => item !== normalized)
      setDate(next[0] || '')
      return next
    })
  }

  function removeDeparturePlace(i){
    setDeparturePlaces(prev => prev.filter((_,idx) => idx !== i))
  }

  function addDepartureTime(){
    const t = departureTimeInput.trim()
    if(!t || departureTimes.includes(t)) return
    setDepartureTimes(prev => [...prev, t])
    setDepartureTimeInput('')
  }

  function removeDepartureTime(i){
    setDepartureTimes(prev => prev.filter((_,idx) => idx !== i))
  }

  function addExtraInfoDeparturePlace(){
    const place = extraInfoDeparturePlaceInput.trim()
    if(!place || (extraInfoDraft.departurePlaces || []).includes(place)) return
    updateExtraInfoDraft({ departurePlaces: [...(extraInfoDraft.departurePlaces || []), place] })
    setExtraInfoDeparturePlaceInput('')
  }

  function removeExtraInfoDeparturePlace(i){
    updateExtraInfoDraft({ departurePlaces: (extraInfoDraft.departurePlaces || []).filter((_,idx) => idx !== i) })
  }

  function addExtraInfoDepartureTime(){
    const t = extraInfoDepartureTimeInput.trim()
    if(!t || (extraInfoDraft.departureTimes || []).includes(t)) return
    updateExtraInfoDraft({ departureTimes: [...(extraInfoDraft.departureTimes || []), t] })
    setExtraInfoDepartureTimeInput('')
  }

  function removeExtraInfoDepartureTime(i){
    updateExtraInfoDraft({ departureTimes: (extraInfoDraft.departureTimes || []).filter((_,idx) => idx !== i) })
  }

  async function submitExtendedInfo(evId){
    try{
      setSavingExtraInfoEventId(evId)
      const token = localStorage.getItem('adminToken')
      await axios.patch(
        api+`/api/events/${evId}`,
        {
          departurePlace: (extraInfoDraft.departurePlaces || [])[0] || '',
          departurePlaces: extraInfoDraft.departurePlaces || [],
          departureTimes: extraInfoDraft.departureTimes || [],
          returnTime: extraInfoDraft.returnTime,
          paymentMethods: paymentMethodsToText(extraInfoDraft.paymentMethods),
          imageFocusX: parseFocusPercent(extraInfoDraft.imageFocusX, 50),
          imageFocusY: parseFocusPercent(extraInfoDraft.imageFocusY, 50),
          imageScale: parseScalePercent(extraInfoDraft.imageScale, 100),
          transferAlias: extraInfoDraft.transferAlias,
          transferCBU: extraInfoDraft.transferCBU,
          transferBanco: extraInfoDraft.transferBanco,
          transferAmount: parseTransferAmount(extraInfoDraft.transferAmount, 0),
          paymentProofDestination: extraInfoDraft.paymentProofDestination,
          postPaymentInstructions: extraInfoDraft.postPaymentInstructions,
          refundPolicyNotice: normalizeRefundPolicyNotice(extraInfoDraft.refundPolicyNotice)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const normalizedTransferAccount = normalizeTransferAccountPreset({
        alias: extraInfoDraft.transferAlias,
        cbu: extraInfoDraft.transferCBU,
        banco: extraInfoDraft.transferBanco
      })
      if(normalizedTransferAccount && (normalizedTransferAccount.alias || normalizedTransferAccount.cbu)){
        const transferKey = transferAccountPresetKey(normalizedTransferAccount)
        const alreadySaved = savedTransferAccounts.some(item => transferAccountPresetKey(item) === transferKey)
        if(!alreadySaved) await saveTransferAccounts([...savedTransferAccounts, normalizedTransferAccount], { silentError: true })
      }
      setMsg('Información ampliada actualizada')
      setExpandedExtraInfoEventId('')
      load()
    }catch(err){
      console.error(err)
      const status = err?.response?.status
      if(status === 401 || status === 403){ handleAuthError(); return }
      setMsg('Error actualizando información ampliada')
    }finally{
      setSavingExtraInfoEventId('')
    }
  }

  const visibleEvents = filteredEvents()

  return (
    <div className="container admin">
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
                <label className="label">Fechas del evento</label>
                <div className="departure-times-editor">
                  <div className="departure-times-input-row">
                    <input
                      className="input"
                      type="date"
                      value={dateInput}
                      onChange={e=>setDateInput(e.target.value)}
                      onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addEventDate()}}}
                    />
                    <button
                      type="button"
                      className="btn ghost departure-times-add-btn"
                      onClick={addEventDate}
                      disabled={!normalizeEventDate(dateInput)}
                    >
                      ＋ Agregar
                    </button>
                  </div>
                  {eventDates.length > 0 && (
                    <div className="departure-times-tags">
                      {eventDates.map(value=>(
                        <span key={value} className="departure-time-tag">
                          {formatDateTime(value)}
                          <button type="button" className="departure-time-remove" onClick={()=>removeEventDate(value)} title="Quitar">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="field-note">Podés agregar varias fechas. La primera se usa como fecha principal.</div>
              </div>
            </div>

            <div className="admin-field-row">
              <div className="admin-field">
                <label className="label">Lugar de salida</label>
                <div className="departure-times-editor">
                  <div className="departure-times-input-row">
                    <input className="input" placeholder="Ej: Terminal de ómnibus - Dársena 4" value={departurePlaceInput} onChange={e=>setDeparturePlaceInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addDeparturePlace()}}} />
                    <button type="button" className="btn ghost departure-times-add-btn" onClick={addDeparturePlace} disabled={!departurePlaceInput.trim()}>＋ Agregar</button>
                  </div>
                  {departurePlaces.length > 0 && (
                    <div className="departure-times-tags">
                      {departurePlaces.map((place,i)=>(
                        <span key={i} className="departure-time-tag">
                          {place}
                          <button type="button" className="departure-time-remove" onClick={()=>removeDeparturePlace(i)} title="Quitar">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="admin-field">
                <label className="label">Hora de salida</label>
                <div className="departure-times-editor">
                  <div className="departure-times-input-row">
                    <input className="input" type="time" value={departureTimeInput} onChange={e=>setDepartureTimeInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addDepartureTime()}}} />
                    <button type="button" className="btn ghost departure-times-add-btn" onClick={addDepartureTime} disabled={!departureTimeInput}>＋ Agregar</button>
                  </div>
                  {departureTimes.length > 0 && (
                    <div className="departure-times-tags">
                      {departureTimes.map((t,i)=>(
                        <span key={i} className="departure-time-tag">
                          {t}
                          <button type="button" className="departure-time-remove" onClick={()=>removeDepartureTime(i)} title="Quitar">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="admin-field-row">
              <div className="admin-field">
                <label className="label">Hora de regreso</label>
                <div className="return-time-mode-toggle">
                  <button type="button" className={`return-time-mode-btn${returnTimeMode==='time'?' active':''}`} onClick={()=>{ setReturnTimeMode('time'); setReturnTime('') }}>Hora</button>
                  <button type="button" className={`return-time-mode-btn${returnTimeMode==='text'?' active':''}`} onClick={()=>{ setReturnTimeMode('text'); setReturnTime('') }}>Texto libre</button>
                </div>
                {returnTimeMode === 'time'
                  ? <input className="input" type="time" value={returnTime} onChange={e=>setReturnTime(e.target.value)} />
                  : <input className="input" type="text" placeholder="Ej: 30min después de finalizado el evento" value={returnTime} onChange={e=>setReturnTime(e.target.value)} />
                }
              </div>

              <div className="admin-field">
                <label className="label">Campos repetitivos</label>
                <div className="field-note">WhatsApp, link de reserva, pagos, transferencia y políticas se toman del Formulario 2 (Plantilla).</div>
                <div className="field-note">Podés modificarlos una sola vez y se aplican en cada nuevo evento.</div>
              </div>
            </div>

            <div className="admin-field">
              <label className="label">Imagen</label>
              <input className="input" type="file" accept=".jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.heic,.heif,.svg,.img,image/*" onChange={onFile} />
              {imagePreview && <img className="preview-img" src={imagePreview} alt="preview" style={{marginTop:8}}/>}
            </div>

            <div className="admin-field">
              <label className="label">Encuadre de imagen en card</label>
              <div className="image-focus-editor">
                <div className="image-focus-row">
                  <div className="image-focus-row-head">
                    <span className="sublabel">Horizontal</span>
                    <span className="image-focus-value">{imageFocusX}%</span>
                  </div>
                  <input
                    className="image-focus-range"
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={imageFocusX}
                    onChange={e=>setImageFocusX(parseFocusPercent(e.target.value, 50))}
                  />
                  <div className="image-focus-hint">Izquierda a derecha</div>
                </div>
                <div className="image-focus-row">
                  <div className="image-focus-row-head">
                    <span className="sublabel">Vertical</span>
                    <span className="image-focus-value">{imageFocusY}%</span>
                  </div>
                  <input
                    className="image-focus-range"
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={imageFocusY}
                    onChange={e=>setImageFocusY(parseFocusPercent(e.target.value, 50))}
                  />
                  <div className="image-focus-hint">Arriba a abajo</div>
                </div>
                <div className="image-focus-row">
                  <div className="image-focus-row-head">
                    <span className="sublabel">Tamano</span>
                    <span className="image-focus-value">{imageScale}%</span>
                  </div>
                  <input
                    className="image-focus-range"
                    type="range"
                    min="20"
                    max="130"
                    step="1"
                    value={imageScale}
                    onChange={e=>setImageScale(parseScalePercent(e.target.value, 100))}
                  />
                  <div className="image-focus-hint">Zoom de imagen</div>
                </div>
                <div className="image-focus-actions">
                  <button
                    type="button"
                    className="btn ghost image-focus-action-btn"
                    onClick={()=>{ setImageFocusX(50); setImageFocusY(50); setImageScale(100) }}
                  >
                    Restablecer
                  </button>
                  <button
                    type="button"
                    className="btn ghost image-focus-action-btn"
                    onClick={()=>setImageScale(100)}
                  >
                    Zoom 100%
                  </button>
                </div>
                {imagePreview && (
                  <div className="image-focus-preview">
                    <div className="image-focus-preview-card">
                      <div className="image-focus-preview-title">Imagen completa para ajustar</div>
                      <div className="image-focus-reference-shell">
                        <div className="image-focus-reference-frame">
                          <img
                            src={imagePreview}
                            alt="Vista previa completa"
                            style={{
                              objectPosition: `${imageFocusX}% ${imageFocusY}%`,
                              '--image-scale': `${(parseScalePercent(imageScale, 100) / 100).toFixed(2)}`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="image-focus-preview-card">
                      <div className="image-focus-preview-title">Vista final en Home</div>
                      <div className="image-focus-home-preview-shell">
                        <article className="event-card image-focus-home-card-preview">
                          <div className="thumb" style={{ position:'relative' }}>
                            <img
                              src={imagePreview}
                              alt="Vista previa encuadre"
                              style={{
                                objectPosition: `${imageFocusX}% ${imageFocusY}%`,
                                '--image-scale': `${(parseScalePercent(imageScale, 100) / 100).toFixed(2)}`
                              }}
                            />
                            <div className="province-badge">{province || 'N/D'}</div>
                          </div>
                        </article>
                      </div>
                    </div>
                  </div>
                )}
                {!imagePreview && (
                  <div className="image-focus-empty">
                    Subí una imagen para activar la vista previa del encuadre.
                  </div>
                )}
              </div>
            </div>

            <div className="admin-field">
              <label className="label">Plantilla aplicada en este evento</label>
              <div className="field-note">WhatsApp reserva: {whatsappNumber || 'No configurado'}</div>
              <div className="field-note">Link reserva: {reservationLink || 'No configurado'}</div>
              <div className="field-note">Pagos: {paymentMethods || 'No configurado'}</div>
              <div className="field-note">Transferencia: {transferAlias || transferCBU ? `${transferAlias || 'Sin alias'}${transferCBU ? ` · ${transferCBU}` : ''}${transferBanco ? ` · ${transferBanco}` : ''}` : 'No configurado'}</div>
              <div className="field-note">Comprobante: {paymentProofDestination || 'No configurado'}</div>
            </div>

            <div className="admin-form-actions">
              <button className="btn positive" type="submit" disabled={loading}>{loading? 'Creando...':'Crear evento'}</button>
            </div>
            </form>
          </section>

          <section className="admin-form-block event-form-block">
            <div className="panel-header">
              <div>
                <span className="form-kind-chip">Formulario 2</span>
                <h3 className="admin-section-title">Plantilla de datos concurrentes</h3>
                <p>Configurá una sola vez los datos que se repiten y se aplicarán automáticamente en cada nuevo evento.</p>
              </div>
            </div>

            <div className="admin-field">
              <label className="label">Número de WhatsApp para reservas</label>
              <input className="input" placeholder="Ej: 542215551234 o +5491234567890" value={whatsappNumber} onChange={e=>setWhatsappNumber(e.target.value)} type="tel" />
              {whatsappNumber && (
                <div className="helper-text">
                  URL generada: <code className="code-preview">https://wa.me/{whatsappNumber}</code>
                </div>
              )}
              <div className="whatsapp-reservation-tools">
                <div className="whatsapp-saved-row">
                  <select
                    className="input"
                    value=""
                    onChange={e=>selectSavedWhatsappNumber(e.target.value)}
                    disabled={!savedWhatsappNumbers.length}
                  >
                    <option value="">{savedWhatsappNumbers.length ? 'Usar número guardado...' : 'Sin números guardados'}</option>
                    {savedWhatsappNumbers.map(number => (
                      <option key={number} value={number}>{number}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn secondary whatsapp-save-btn"
                    onClick={addCurrentWhatsappNumberToSaved}
                    disabled={!whatsappNumber.trim() || savingWhatsappNumbers}
                  >
                    {savingWhatsappNumbers ? 'Guardando...' : 'Guardar número'}
                  </button>
                </div>

                {savedWhatsappNumbers.length > 0 && (
                  <div className="whatsapp-saved-list">
                    {savedWhatsappNumbers.map(number => (
                      <span key={number} className="whatsapp-saved-chip">
                        <button type="button" className="whatsapp-chip-use" onClick={()=>setWhatsappNumber(number)}>{number}</button>
                        <button type="button" className="whatsapp-chip-delete" onClick={()=>removeSavedWhatsappNumber(number)} title="Eliminar número" aria-label={`Eliminar ${number}`}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="admin-field">
              <label className="label">URL de reserva (alternativa)</label>
              <input className="input" placeholder="Ej: https://www.ejemplo.com/reservar" value={reservationLink} onChange={e=>setReservationLink(e.target.value)} />
              <div className="field-note">Si completás ambas, en Home se prioriza WhatsApp para reservar.</div>
            </div>

            <div className="admin-field">
              <label className="label">Formas de pago</label>
              <input
                className="input"
                placeholder="Ej: Efectivo, Transferencia, Tarjeta"
                value={paymentMethods}
                onChange={e=>setPaymentMethods(e.target.value)}
              />
              <div className="whatsapp-reservation-tools payment-methods-tools">
                <div className="whatsapp-saved-row">
                  <select
                    className="input"
                    value=""
                    onChange={e=>selectSavedPaymentMethod(e.target.value)}
                    disabled={!savedPaymentMethods.length}
                  >
                    <option value="">{savedPaymentMethods.length ? 'Agregar forma guardada...' : 'Sin formas guardadas'}</option>
                    {savedPaymentMethods.map(method => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn secondary whatsapp-save-btn"
                    onClick={addCurrentPaymentMethodsToSaved}
                    disabled={!paymentMethods.trim() || savingPaymentMethods}
                  >
                    {savingPaymentMethods ? 'Guardando...' : 'Guardar formas'}
                  </button>
                </div>

                {savedPaymentMethods.length > 0 && (
                  <div className="whatsapp-saved-list">
                    {savedPaymentMethods.map(method => (
                      <span key={method} className="whatsapp-saved-chip">
                        <button type="button" className="whatsapp-chip-use" onClick={()=>selectSavedPaymentMethod(method)}>{method}</button>
                        <button type="button" className="whatsapp-chip-delete" onClick={()=>removeSavedPaymentMethod(method)} title="Eliminar forma de pago" aria-label={`Eliminar ${method}`}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="admin-field">
              <label className="label">Pago por transferencia: datos de cuenta</label>
              <div className="transfer-fields-group">
                <div className="transfer-subfield">
                  <label className="sublabel">Alias</label>
                  <input className="input" placeholder="Ej: empresa.pagos.mp" value={transferAlias} onChange={e=>setTransferAlias(e.target.value)} />
                </div>
                <div className="transfer-subfield">
                  <label className="sublabel">CBU</label>
                  <input className="input" placeholder="Ej: 0000000000000000000000" value={transferCBU} onChange={e=>setTransferCBU(e.target.value)} />
                </div>
                <div className="transfer-subfield">
                  <label className="sublabel">Banco</label>
                  <input className="input" placeholder="Ej: Banco Nación" value={transferBanco} onChange={e=>setTransferBanco(e.target.value)} />
                </div>
                <div className="transfer-subfield">
                  <label className="sublabel">Valor traslado (ARS)</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Ej: 15000"
                    value={transferAmount}
                    onChange={e=>setTransferAmount(e.target.value)}
                  />
                </div>
              </div>
              <div className="whatsapp-reservation-tools">
                <div className="whatsapp-saved-row">
                  <select
                    className="input"
                    value=""
                    onChange={e=>selectSavedTransferAccount(e.target.value)}
                    disabled={!savedTransferAccounts.length}
                  >
                    <option value="">{savedTransferAccounts.length ? 'Usar cuenta guardada...' : 'Sin cuentas guardadas'}</option>
                    {savedTransferAccounts.map(account => {
                      const key = transferAccountPresetKey(account)
                      return <option key={key} value={key}>{formatTransferAccountLabel(account)}</option>
                    })}
                  </select>
                  <button
                    type="button"
                    className="btn secondary whatsapp-save-btn"
                    onClick={addCurrentTransferAccountToSaved}
                    disabled={(!transferAlias.trim() && !transferCBU.trim()) || savingTransferAccounts}
                  >
                    {savingTransferAccounts ? 'Guardando...' : 'Guardar cuenta'}
                  </button>
                </div>

                {savedTransferAccounts.length > 0 && (
                  <div className="whatsapp-saved-list">
                    {savedTransferAccounts.map(account => {
                      const key = transferAccountPresetKey(account)
                      const label = formatTransferAccountLabel(account)
                      return (
                        <span key={key} className="whatsapp-saved-chip">
                          <button type="button" className="whatsapp-chip-use" onClick={()=>selectSavedTransferAccount(key)}>{label}</button>
                          <button type="button" className="whatsapp-chip-delete" onClick={()=>removeSavedTransferAccount(account)} title="Eliminar cuenta" aria-label={`Eliminar ${label}`}>×</button>
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="admin-field">
              <label className="label">Dónde enviar comprobante</label>
              <input
                className="input"
                placeholder="Ej: WhatsApp +54..., mail..., Instagram..."
                value={paymentProofDestination}
                onChange={e=>setPaymentProofDestination(e.target.value)}
              />
            </div>

            <div className="admin-field">
              <label className="label">Indicaciones luego del pago</label>
              <textarea
                className="input admin-textarea"
                placeholder="Ej: Enviar comprobante + nombre y DNI para confirmar reserva"
                value={postPaymentInstructions}
                onChange={e=>setPostPaymentInstructions(e.target.value)}
              />
            </div>

            <div className="admin-field">
              <label className="label">Politica de cancelacion y reembolsos (mas info)</label>
              <textarea
                className="input admin-textarea"
                value={refundPolicyNotice}
                onChange={e=>setRefundPolicyNotice(e.target.value)}
              />
            </div>

            <div className="admin-form-actions">
              <button className="btn positive" type="button" onClick={saveEventDefaults} disabled={savingEventDefaults}>
                {savingEventDefaults ? 'Guardando plantilla...' : 'Guardar plantilla'}
              </button>
            </div>
          </section>

          <div className="admin-forms-divider" role="separator" aria-label="Separador entre formularios">
            <span>Cambio de formulario</span>
          </div>

          <div className="form-panel driver-form-panel admin-form-block driver-form-block">
            <div className="panel-header">
              <div>
                <span className="form-kind-chip">Formulario 3</span>
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
              const imageObjectPosition = `${parseFocusPercent(ev.imageFocusX, 50)}% ${parseFocusPercent(ev.imageFocusY, 50)}%`
              const imageScaleFactor = (parseScalePercent(ev.imageScale, 100) / 100).toFixed(2)
              const isExtraInfoOpen = expandedExtraInfoEventId === ev.id
              return (
                <div key={ev.id} className={`event-card ${isExtraInfoOpen ? 'event-card-editing' : ''}`}>
                  <div className="thumb" style={{position:'relative'}}>
                    <img
                      src={imageSrc || '/placeholder.png'}
                      alt=""
                      style={{
                        objectPosition: imageObjectPosition,
                        '--image-scale': imageScaleFactor
                      }}
                    />
                    <div className="province-badge">{ev.province || 'N/D'}</div>
                  </div>
                  <div className="info">
                    <div className="event-card-heading">
                      <h4>{ev.name}</h4>
                      <span className={`event-status ${ev.assignedDriver ? 'assigned' : 'unassigned'}`}>
                        {ev.assignedDriver ? 'Chofer asignado' : 'Sin chofer'}
                      </span>
                    </div>
                    <p className="event-date">{formatEventDatesSummary(ev.dates, ev.date)}</p>
                    <div className="meta">
                      {Array.isArray(ev.dates) && ev.dates.length > 1 && (
                        <div className="meta-row meta-row-full">
                          <span className="meta-label">Fechas</span>
                          <span className="meta-value">{formatEventDatesSummary(ev.dates, ev.date)}</span>
                        </div>
                      )}
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
                      {((ev.departurePlaces && ev.departurePlaces.length > 0) || ev.departurePlace) && (
                        <div className="meta-row">
                          <span className="meta-label">Lugar salida</span>
                          <span className="meta-value">{ev.departurePlaces && ev.departurePlaces.length > 0 ? ev.departurePlaces.join(' • ') : ev.departurePlace}</span>
                        </div>
                      )}
                      {((ev.departureTimes && ev.departureTimes.length > 0) || ev.departureTime || ev.returnTime) && (
                        <div className="meta-row">
                          <span className="meta-label">Horario</span>
                          <span className="meta-value">
                            {(ev.departureTimes && ev.departureTimes.length > 0 ? ev.departureTimes.join(', ') : ev.departureTime || '—')}{ev.returnTime ? ` / ${ev.returnTime}` : ''}
                          </span>
                        </div>
                      )}
                      {ev.paymentMethods && (
                        <div className="meta-row meta-row-full">
                          <span className="meta-label">Pago</span>
                          <span className="meta-value">{ev.paymentMethods}</span>
                        </div>
                      )}
                      {parseTransferAmount(ev.transferAmount, 0) > 0 && (
                        <div className="meta-row">
                          <span className="meta-label">Valor traslado</span>
                          <span className="meta-value">{formatCurrencyArs(ev.transferAmount)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="actions admin-card-actions">
                    <select className="event-driver-select" onChange={(e)=>assignDriver(ev.id,e.target.value)} defaultValue="">
                      <option value="">Asignar chofer</option>
                      {drivers.map(d=> <option key={d.id} value={d.id}>{d.username || d.name}</option>)}
                    </select>
                    <select
                      className="event-driver-select event-transfer-wsp-select"
                      value={ev.transferReportWhatsapp || ''}
                      onChange={(e)=>assignTransferWhatsapp(ev.id, e.target.value)}
                    >
                      <option value="">WhatsApp – Informar transferencia</option>
                      {savedTransferWhatsappNumbers.map((n,i)=>(
                        <option key={i} value={n}>{n}</option>
                      ))}
                      {ev.transferReportWhatsapp && !savedTransferWhatsappNumbers.includes(ev.transferReportWhatsapp) && (
                        <option value={ev.transferReportWhatsapp}>{ev.transferReportWhatsapp}</option>
                      )}
                    </select>
                    <div className="event-action-grid">
                      <button className="btn secondary" onClick={()=>editDepartureInfo(ev)}>Editar salida</button>
                      <button className="btn outline" onClick={()=>editReservationLink(ev)}>Editar reserva</button>
                      <button className={`btn ghost event-extra-toggle-btn${isExtraInfoOpen ? ' is-open' : ''}`} onClick={()=>toggleExtendedInfoForm(ev)}>
                        <span className="event-extra-toggle-icon" aria-hidden="true">{isExtraInfoOpen ? '−' : '+'}</span>
                        <span>{isExtraInfoOpen ? 'Cerrar info extra' : 'Editar info extra'}</span>
                      </button>
                    </div>
                    <button className="btn danger event-delete-btn" onClick={()=>deleteEvent(ev.id)}>Eliminar evento</button>
                  </div>

                  {isExtraInfoOpen && (
                    <div className="event-extra-edit-overlay" onClick={()=>setExpandedExtraInfoEventId('')}>
                      <div className="event-extra-edit-form" onClick={(e)=>e.stopPropagation()}>
                        <div className="event-extra-edit-grid">
                          <div className="admin-field">
                            <label className="label">Lugar de salida</label>
                            <div className="departure-times-editor">
                              <div className="departure-times-input-row">
                                <input className="input" placeholder="Ej: Terminal de ómnibus" value={extraInfoDeparturePlaceInput} onChange={e=>setExtraInfoDeparturePlaceInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addExtraInfoDeparturePlace()}}} />
                                <button type="button" className="btn ghost departure-times-add-btn" onClick={addExtraInfoDeparturePlace} disabled={!extraInfoDeparturePlaceInput.trim()}>＋ Agregar</button>
                              </div>
                              {(extraInfoDraft.departurePlaces || []).length > 0 && (
                                <div className="departure-times-tags">
                                  {(extraInfoDraft.departurePlaces || []).map((place,i)=>(
                                    <span key={i} className="departure-time-tag">
                                      {place}
                                      <button type="button" className="departure-time-remove" onClick={()=>removeExtraInfoDeparturePlace(i)} title="Quitar">×</button>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="admin-field">
                            <label className="label">Hora de salida</label>
                            <div className="departure-times-editor">
                              <div className="departure-times-input-row">
                                <input className="input" type="time" value={extraInfoDepartureTimeInput} onChange={e=>setExtraInfoDepartureTimeInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addExtraInfoDepartureTime()}}} />
                                <button type="button" className="btn ghost departure-times-add-btn" onClick={addExtraInfoDepartureTime} disabled={!extraInfoDepartureTimeInput}>＋ Agregar</button>
                              </div>
                              {(extraInfoDraft.departureTimes || []).length > 0 && (
                                <div className="departure-times-tags">
                                  {(extraInfoDraft.departureTimes || []).map((t,i)=>(
                                    <span key={i} className="departure-time-tag">
                                      {t}
                                      <button type="button" className="departure-time-remove" onClick={()=>removeExtraInfoDepartureTime(i)} title="Quitar">×</button>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="admin-field">
                            <label className="label">Hora de regreso</label>
                            <div className="return-time-mode-toggle">
                              <button type="button" className={`return-time-mode-btn${extraInfoDraft.returnTimeMode==='time'?' active':''}`} onClick={()=>updateExtraInfoDraft({ returnTimeMode:'time', returnTime:'' })}>Hora</button>
                              <button type="button" className={`return-time-mode-btn${extraInfoDraft.returnTimeMode==='text'?' active':''}`} onClick={()=>updateExtraInfoDraft({ returnTimeMode:'text', returnTime:'' })}>Texto libre</button>
                            </div>
                            {extraInfoDraft.returnTimeMode === 'time'
                              ? <input className="input" type="time" value={extraInfoDraft.returnTime} onChange={e=>updateExtraInfoDraft({ returnTime: e.target.value })} />
                              : <input className="input" type="text" placeholder="Ej: 30min después de finalizado el evento" value={extraInfoDraft.returnTime} onChange={e=>updateExtraInfoDraft({ returnTime: e.target.value })} />
                            }
                          </div>

                          <div className="admin-field admin-field-full">
                            <label className="label">Encuadre de imagen en card</label>
                            <div className="image-focus-editor">
                              <div className="image-focus-row">
                                <div className="image-focus-row-head">
                                  <span className="sublabel">Horizontal</span>
                                  <span className="image-focus-value">{parseFocusPercent(extraInfoDraft.imageFocusX, 50)}%</span>
                                </div>
                                <input
                                  className="image-focus-range"
                                  type="range"
                                  min="0"
                                  max="100"
                                  step="1"
                                  value={parseFocusPercent(extraInfoDraft.imageFocusX, 50)}
                                  onChange={e=>updateExtraInfoDraft({ imageFocusX: parseFocusPercent(e.target.value, 50) })}
                                />
                                <div className="image-focus-hint">Izquierda a derecha</div>
                              </div>
                              <div className="image-focus-row">
                                <div className="image-focus-row-head">
                                  <span className="sublabel">Vertical</span>
                                  <span className="image-focus-value">{parseFocusPercent(extraInfoDraft.imageFocusY, 50)}%</span>
                                </div>
                                <input
                                  className="image-focus-range"
                                  type="range"
                                  min="0"
                                  max="100"
                                  step="1"
                                  value={parseFocusPercent(extraInfoDraft.imageFocusY, 50)}
                                  onChange={e=>updateExtraInfoDraft({ imageFocusY: parseFocusPercent(e.target.value, 50) })}
                                />
                                <div className="image-focus-hint">Arriba a abajo</div>
                              </div>
                              <div className="image-focus-row">
                                <div className="image-focus-row-head">
                                  <span className="sublabel">Tamano</span>
                                  <span className="image-focus-value">{parseScalePercent(extraInfoDraft.imageScale, 100)}%</span>
                                </div>
                                <input
                                  className="image-focus-range"
                                  type="range"
                                  min="20"
                                  max="130"
                                  step="1"
                                  value={parseScalePercent(extraInfoDraft.imageScale, 100)}
                                  onChange={e=>updateExtraInfoDraft({ imageScale: parseScalePercent(e.target.value, 100) })}
                                />
                                <div className="image-focus-hint">Zoom de imagen</div>
                              </div>
                              <div className="image-focus-actions">
                                <button
                                  type="button"
                                  className="btn ghost image-focus-action-btn"
                                  onClick={()=>updateExtraInfoDraft({ imageFocusX: 50, imageFocusY: 50, imageScale: 100 })}
                                >
                                  Restablecer
                                </button>
                                <button
                                  type="button"
                                  className="btn ghost image-focus-action-btn"
                                  onClick={()=>updateExtraInfoDraft({ imageScale: 100 })}
                                >
                                  Zoom 100%
                                </button>
                              </div>
                              <div className="image-focus-preview">
                                <div className="image-focus-preview-card">
                                  <div className="image-focus-preview-title">Imagen completa para ajustar</div>
                                  <div className="image-focus-reference-shell">
                                    <div className="image-focus-reference-frame">
                                      <img
                                        src={imageSrc || '/placeholder.png'}
                                        alt={`Vista completa ${ev.name}`}
                                        style={{
                                          objectPosition: `${parseFocusPercent(extraInfoDraft.imageFocusX, 50)}% ${parseFocusPercent(extraInfoDraft.imageFocusY, 50)}%`,
                                          '--image-scale': `${(parseScalePercent(extraInfoDraft.imageScale, 100) / 100).toFixed(2)}`
                                        }}
                                      />
                                    </div>
                                  </div>
                                </div>
                                <div className="image-focus-preview-card">
                                  <div className="image-focus-preview-title">Vista final en Home</div>
                                  <div className="image-focus-home-preview-shell">
                                    <article className="event-card image-focus-home-card-preview">
                                      <div className="thumb" style={{ position:'relative' }}>
                                        <img
                                          src={imageSrc || '/placeholder.png'}
                                          alt={`Vista previa ${ev.name}`}
                                          style={{
                                            objectPosition: `${parseFocusPercent(extraInfoDraft.imageFocusX, 50)}% ${parseFocusPercent(extraInfoDraft.imageFocusY, 50)}%`,
                                            '--image-scale': `${(parseScalePercent(extraInfoDraft.imageScale, 100) / 100).toFixed(2)}`
                                          }}
                                        />
                                        <div className="province-badge">{ev.province || 'N/D'}</div>
                                      </div>
                                    </article>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="admin-field">
                            <label className="label">Formas de pago</label>
                            <input
                              className="input"
                              value={extraInfoDraft.paymentMethods}
                              onChange={e=>updateExtraInfoDraft({ paymentMethods: e.target.value })}
                              placeholder="Ej: Efectivo, Transferencia, Tarjeta"
                            />
                          </div>

                          <div className="admin-field admin-field-full">
                            <label className="label">Transferencia: datos de cuenta</label>
                            <div className="transfer-fields-group">
                              <div className="transfer-subfield">
                                <label className="sublabel">Alias</label>
                                <input className="input" placeholder="Ej: empresa.pagos.mp" value={extraInfoDraft.transferAlias} onChange={e=>updateExtraInfoDraft({ transferAlias: e.target.value })} />
                              </div>
                              <div className="transfer-subfield">
                                <label className="sublabel">CBU</label>
                                <input className="input" placeholder="Ej: 0000000000000000000000" value={extraInfoDraft.transferCBU} onChange={e=>updateExtraInfoDraft({ transferCBU: e.target.value })} />
                              </div>
                              <div className="transfer-subfield">
                                <label className="sublabel">Banco</label>
                                <input className="input" placeholder="Ej: Banco Nación" value={extraInfoDraft.transferBanco} onChange={e=>updateExtraInfoDraft({ transferBanco: e.target.value })} />
                              </div>
                              <div className="transfer-subfield">
                                <label className="sublabel">Valor traslado (ARS)</label>
                                <input
                                  className="input"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="Ej: 15000"
                                  value={extraInfoDraft.transferAmount}
                                  onChange={e=>updateExtraInfoDraft({ transferAmount: e.target.value })}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="admin-field">
                            <label className="label">Enviar comprobante a</label>
                            <input
                              className="input"
                              value={extraInfoDraft.paymentProofDestination}
                              onChange={e=>updateExtraInfoDraft({ paymentProofDestination: e.target.value })}
                              placeholder="WhatsApp, mail o red social"
                            />
                          </div>

                          <div className="admin-field admin-field-full">
                            <label className="label">Indicaciones luego del pago</label>
                            <textarea
                              className="input admin-textarea"
                              value={extraInfoDraft.postPaymentInstructions}
                              onChange={e=>updateExtraInfoDraft({ postPaymentInstructions: e.target.value })}
                              placeholder="Qué hacer luego de transferir"
                            />
                          </div>

                          <div className="admin-field admin-field-full">
                            <label className="label">Politica de cancelacion y reembolsos (mas info)</label>
                            <textarea
                              className="input admin-textarea"
                              value={extraInfoDraft.refundPolicyNotice}
                              onChange={e=>updateExtraInfoDraft({ refundPolicyNotice: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="event-extra-edit-actions">
                          <button
                            className="btn positive"
                            type="button"
                            onClick={()=>submitExtendedInfo(ev.id)}
                            disabled={savingExtraInfoEventId === ev.id}
                          >
                            {savingExtraInfoEventId === ev.id ? 'Guardando...' : 'Guardar info extra'}
                          </button>
                          <button
                            className="btn ghost"
                            type="button"
                            onClick={()=>setExpandedExtraInfoEventId('')}
                            disabled={savingExtraInfoEventId === ev.id}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
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

      <div className="logo-upload-panel card">
        <div className="panel-header">
          <div>
            <h3 className="admin-section-title">WhatsApp — Informar transferencia</h3>
            <p>Agregá los números de WhatsApp a los que el cliente podrá informar una transferencia. Se asignan por evento desde la card de cada evento.</p>
          </div>
        </div>

        <div className="whatsapp-saved-row">
          <input
            className="input"
            type="tel"
            placeholder="Ej: +5491123456789"
            value={transferWhatsappInput}
            onChange={e=>setTransferWhatsappInput(e.target.value)}
            onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); const n=normalizeWhatsappNumber(transferWhatsappInput); if(n && !savedTransferWhatsappNumbers.includes(n)){ saveTransferWhatsappNumbers([...savedTransferWhatsappNumbers, n], { showSuccessMessage: true }); setTransferWhatsappInput('') } } }}
          />
          <button
            className="btn whatsapp-save-btn"
            type="button"
            disabled={savingTransferWhatsappNumbers || !transferWhatsappInput.trim()}
            onClick={()=>{
              const n = normalizeWhatsappNumber(transferWhatsappInput)
              if(!n){ setMsg('Ingresá un número válido'); return }
              if(savedTransferWhatsappNumbers.includes(n)){ setMsg('Ese número ya está guardado'); return }
              saveTransferWhatsappNumbers([...savedTransferWhatsappNumbers, n], { showSuccessMessage: true })
              setTransferWhatsappInput('')
            }}
          >
            {savingTransferWhatsappNumbers ? 'Guardando...' : 'Agregar número'}
          </button>
        </div>

        {savedTransferWhatsappNumbers.length === 0 ? (
          <div className="helper" style={{marginTop:12}}>No hay números cargados.</div>
        ) : (
          <div className="whatsapp-list">
            {savedTransferWhatsappNumbers.map((n, i) => (
              <div key={i} className="whatsapp-list-item">
                <span className="whatsapp-list-number">{n}</span>
                <a
                  href={`https://wa.me/${n.replace(/\D/g,'')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn outline whatsapp-list-test-btn"
                >
                  Probar
                </a>
                <button
                  className="btn danger whatsapp-list-del-btn"
                  type="button"
                  onClick={()=>removeTransferWhatsappNumber(n)}
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="drivers-credentials-panel card">
        <div className="panel-header">
          <div>
            <h3 className="admin-section-title">Credenciales de choferes</h3>
            <p>Consultá accesos activos, reseteá contraseñas y eliminá credenciales manualmente si hace falta.</p>
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
              <span>Acciones</span>
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
                <span className="dcred-actions">
                  <button
                    className="btn outline dcred-reset-btn"
                    type="button"
                    disabled={resettingId === d.id || deletingDriverId === d.id}
                    onClick={()=>handleResetPassword(d.id)}
                  >
                    {resettingId === d.id ? 'Generando...' : 'Resetear'}
                  </button>

                  <button
                    className="btn danger dcred-delete-btn"
                    type="button"
                    disabled={deletingDriverId === d.id || resettingId === d.id}
                    onClick={()=>handleDeleteDriver(d.id, d.name || d.username)}
                  >
                    {deletingDriverId === d.id ? 'Eliminando...' : 'Eliminar acceso'}
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {canManageAdminUsers && (
      <div className="admin-users-panel card">
        <div className="panel-header">
          <div>
            <h3 className="admin-section-title">Usuarios administradores</h3>
            <p>Creá accesos admin, actualizá sus contraseñas y eliminá usuarios existentes.</p>
          </div>
          <button className="btn secondary" type="button" onClick={()=>loadAdminUsers(true)} disabled={loadingAdminUsers}>
            {loadingAdminUsers ? 'Actualizando...' : 'Actualizar lista'}
          </button>
        </div>

        <div className="admin-users-create">
          <input
            className="input"
            type="email"
            placeholder="Email del admin"
            value={adminUserEmail}
            onChange={e=>setAdminUserEmail(e.target.value)}
          />
          <input
            className="input"
            type="password"
            placeholder="Contraseña (mínimo 8 caracteres)"
            value={adminUserPassword}
            onChange={e=>setAdminUserPassword(e.target.value)}
          />
          <input
            className="input"
            type="text"
            placeholder="Nombre (opcional)"
            value={adminUserName}
            onChange={e=>setAdminUserName(e.target.value)}
          />
          <button
            className="btn positive"
            type="button"
            onClick={handleCreateAdminUser}
            disabled={creatingAdminUser}
          >
            {creatingAdminUser ? 'Creando...' : 'Crear usuario admin'}
          </button>
        </div>

        <div className="field-note">Podés consultar la contraseña vigente de cada admin (botón Ver), copiarla y actualizarla desde la misma fila.</div>

        {loadingAdminUsers && adminUsers.length === 0 && (
          <div className="helper" style={{ marginTop: 12 }}>Cargando usuarios admin...</div>
        )}

        {!loadingAdminUsers && adminUsers.length === 0 ? (
          <div className="helper" style={{ marginTop: 12 }}>No hay usuarios administradores cargados.</div>
        ) : (
          <div className="admin-users-table">
            <div className="admin-users-row admin-users-head">
              <span>Email</span>
              <span>Nombre</span>
              <span>Creado</span>
              <span>Contraseña</span>
              <span>Acciones</span>
            </div>
            {adminUsers.map(adminItem => (
              <div key={adminItem.id} className="admin-users-row">
                <span className="admin-users-email">{adminItem.email || adminItem.username || '—'}</span>
                <span className="admin-users-name">{adminItem.name || '—'}</span>
                <span className="admin-users-created">
                  {adminItem.createdAt ? new Date(Number(adminItem.createdAt)).toLocaleDateString('es-AR', { day:'2-digit', month:'short', year:'numeric' }) : '—'}
                </span>
                <span className="admin-users-password-cell">
                  <input
                    className="input admin-users-password-input"
                    type={visibleAdminUserPasswords[adminItem.id] ? 'text' : 'password'}
                    placeholder="Contraseña vigente / nueva contraseña (mínimo 8)"
                    value={adminUserPasswordDrafts[adminItem.id] || ''}
                    onChange={e=>setAdminPasswordDraftForUser(adminItem.id, e.target.value)}
                  />
                  <span className="field-note admin-users-password-note">
                    {adminItem.currentPassword
                      ? 'Contraseña vigente registrada.'
                      : 'No hay contraseña vigente registrada para este usuario. Podés generar una nueva.'}
                  </span>
                  <span className="admin-users-password-actions">
                    <button
                      className="btn ghost"
                      type="button"
                      disabled={updatingAdminUserPasswordId === adminItem.id}
                      onClick={()=>toggleAdminUserPasswordVisibility(adminItem.id)}
                    >
                      {visibleAdminUserPasswords[adminItem.id] ? 'Ocultar' : 'Ver'}
                    </button>
                    <button
                      className="btn secondary"
                      type="button"
                      disabled={updatingAdminUserPasswordId === adminItem.id}
                      onClick={()=>generateAdminUserPassword(adminItem.id)}
                    >
                      Generar
                    </button>
                    <button
                      className="btn secondary"
                      type="button"
                      disabled={updatingAdminUserPasswordId === adminItem.id || !(adminUserPasswordDrafts[adminItem.id] || '').trim()}
                      onClick={()=>copyAdminUserPassword(adminItem.id, adminItem.email || adminItem.username || adminItem.name)}
                    >
                      Copiar
                    </button>
                    <button
                      className="btn outline"
                      type="button"
                      disabled={updatingAdminUserPasswordId === adminItem.id || deletingAdminUserId === adminItem.id}
                      onClick={()=>handleUpdateAdminUserPassword(adminItem.id, adminItem.email || adminItem.username || adminItem.name)}
                    >
                      {updatingAdminUserPasswordId === adminItem.id ? 'Actualizando...' : 'Actualizar'}
                    </button>
                  </span>
                </span>
                <span className="admin-users-actions">
                  <button
                    className="btn danger"
                    type="button"
                    disabled={deletingAdminUserId === adminItem.id || updatingAdminUserPasswordId === adminItem.id}
                    onClick={()=>handleDeleteAdminUser(adminItem.id, adminItem.email || adminItem.username || adminItem.name)}
                  >
                    {deletingAdminUserId === adminItem.id ? 'Eliminando...' : 'Eliminar'}
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      <div className="admin-password-panel card">
        <div className="panel-header">
          <div>
            <h3 className="admin-section-title">Actualizar mi contraseña</h3>
            <p>Modificá la contraseña de la cuenta con la que estás logueado como administrador.</p>
          </div>
        </div>

        <form className="admin-password-form" onSubmit={handleChangeMyAdminPassword}>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            placeholder="Contraseña actual"
            value={adminPasswordCurrent}
            onChange={e=>setAdminPasswordCurrent(e.target.value)}
          />
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            placeholder="Nueva contraseña (mínimo 8 caracteres)"
            value={adminPasswordNext}
            onChange={e=>setAdminPasswordNext(e.target.value)}
          />
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            placeholder="Confirmar nueva contraseña"
            value={adminPasswordConfirm}
            onChange={e=>setAdminPasswordConfirm(e.target.value)}
          />
          <button className="btn positive" type="submit" disabled={changingAdminPassword}>
            {changingAdminPassword ? 'Actualizando...' : 'Actualizar contraseña'}
          </button>
        </form>
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

      <div className="logo-upload-panel card">
        <div className="panel-header">
          <div>
            <h3 className="admin-section-title">Redes sociales</h3>
            <p>Agregá redes con nombre, icono y link para mostrarlas en Home.</p>
          </div>
        </div>

        <div className="social-admin-create">
          <input
            className="input"
            type="text"
            placeholder="Nombre (Ej: Instagram)"
            value={socialDraft.name}
            onChange={e=>updateSocialDraft({ name: e.target.value })}
          />

          <input
            className="input"
            type="text"
            placeholder="Icono (Ej: 📸 o IG)"
            value={socialDraft.icon}
            onChange={e=>updateSocialDraft({ icon: e.target.value })}
          />

          <input
            className="input"
            type="url"
            placeholder="Link (Ej: https://instagram.com/tu_cuenta)"
            value={socialDraft.link}
            onChange={e=>updateSocialDraft({ link: e.target.value })}
          />

          <button className="btn secondary" type="button" onClick={addSocialLinkDraft}>
            Agregar red
          </button>
        </div>

        {socialLinks.length === 0 ? (
          <div className="helper" style={{ marginTop: 12 }}>No hay redes cargadas.</div>
        ) : (
          <div className="social-admin-list">
            {socialLinks.map(item => (
              <div key={item.id} className="social-admin-item">
                {renderSocialAdminIcon(item)}
                <div className="social-admin-meta">
                  <span className="social-admin-name">{item.name}</span>
                  <a href={item.link} target="_blank" rel="noopener noreferrer">{item.link}</a>
                </div>
                <button
                  className="btn danger social-admin-remove-btn"
                  type="button"
                  onClick={()=>removeSocialLinkDraft(item.id)}
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="logo-upload-row social-admin-save-row">
          <button className="btn" type="button" onClick={saveSocialLinks} disabled={savingSocialLinks}>
            {savingSocialLinks ? 'Guardando...' : 'Guardar redes'}
          </button>
        </div>
      </div>
    </div>
  )
}