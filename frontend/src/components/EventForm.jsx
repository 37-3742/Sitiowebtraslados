import React from 'react'

function EventForm(props){
  // basic fields
  const [name, setName] = React.useState((props.initial && props.initial.name) || '')
  const [datetime, setDatetime] = React.useState((props.initial && props.initial.datetime) || '')
  const [reservationUrl, setReservationUrl] = React.useState((props.initial && props.initial.reservationUrl) || '')
  const [province, setProvince] = React.useState((props.initial && props.initial.province) || '')

  // files
  const [imageFile, setImageFile] = React.useState(null)
  const [driversFile, setDriversFile] = React.useState(null)
  const [logoFile, setLogoFile] = React.useState(null)

  // preview URLs
  const [imagePreview, setImagePreview] = React.useState(null)
  const [logoPreview, setLogoPreview] = React.useState(null)

  const PROVINCES = [
    'Buenos Aires','Catamarca','Chaco','Chubut','Córdoba','Corrientes','Entre Ríos','Formosa','Jujuy','La Pampa','La Rioja','Mendoza','Misiones','Neuquén','Río Negro','Salta','San Juan','San Luis','Santa Cruz','Santa Fe','Santiago del Estero','Tierra del Fuego','Ciudad Autónoma de Buenos Aires'
  ]

  React.useEffect(()=>{
    if(imageFile){
      const url = URL.createObjectURL(imageFile)
      setImagePreview(url)
      return ()=> URL.revokeObjectURL(url)
    }else setImagePreview(null)
  },[imageFile])

  React.useEffect(()=>{
    if(logoFile){
      const url = URL.createObjectURL(logoFile)
      setLogoPreview(url)
      return ()=> URL.revokeObjectURL(url)
    }else setLogoPreview(null)
  },[logoFile])

  const handleSubmit = async (e) =>{
    e.preventDefault()

    const formData = new FormData()
    formData.append('name', name)
    formData.append('datetime', datetime)
    formData.append('reservationUrl', reservationUrl)
    formData.append('province', province)
    if(imageFile) formData.append('image', imageFile)
    if(driversFile) formData.append('drivers', driversFile)
    if(logoFile) formData.append('logo', logoFile)

    try{
      await fetch('/api/events',{
        method: 'POST',
        body: formData
      })
      setName('')
      setDatetime('')
      setReservationUrl('')
      setProvince('')
      setImageFile(null)
      setDriversFile(null)
      setLogoFile(null)
    }catch(err){
      console.error(err)
    }
  }

  // simple validation: require name, datetime and province
  const canSubmit = name.trim() !== '' && datetime.trim() !== '' && province.trim() !== ''

  return (
    <form onSubmit={handleSubmit} className="event-form">
      <div className="form-row">
        <div className="form-col">
          <label className="muted">Nombre</label>
          <input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="Nombre del evento" />

          {/* Provincia (required) - moved up for visibility */}
          <label className="muted" style={{marginTop:10}}>Provincia <span style={{color:'#ef4444'}}>*</span></label>
          <div className="province-wrapper">
            <select id="province" name="province" className="input province-select" value={province} onChange={e=>setProvince(e.target.value)} aria-required="true" required>
              <option value="" disabled>Seleccione provincia</option>
              {PROVINCES.map(p=> <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <label className="muted" style={{marginTop:10}}>Fecha y hora</label>
          <input className="input" value={datetime} onChange={e=>setDatetime(e.target.value)} placeholder="dd/mm/aaaa, hh:mm" />

          <label className="muted" style={{marginTop:10}}>Enlace de reserva (URL)</label>
          <input className="input" value={reservationUrl} onChange={e=>setReservationUrl(e.target.value)} placeholder="https://wa.me/.." />
        </div>

        <div className="form-col">
          <label className="muted">Imagen</label>
          <input className="input" type="file" accept="image/*" onChange={e=>setImageFile(e.target.files[0]||null)} />
          {imagePreview && <div className="file-preview"><img src={imagePreview} alt="preview"/><div className="filename">{imageFile && imageFile.name}</div></div>}
          <div className="file-note">Tamaño recomendado: 1200x800, formato JPG/PNG</div>

          <label className="muted" style={{marginTop:10}}>Cargar choferes (archivo)</label>
          <input className="input" type="file" accept=".csv,.xlsx" onChange={e=>setDriversFile(e.target.files[0]||null)} />
          {driversFile && <div className="file-preview"><div className="filename">{driversFile.name}</div></div>}
          <div className="file-note">CSV con columnas: nombre, teléfono, licencia</div>

          <label className="muted" style={{marginTop:10}}>Logo de la empresa</label>
          <input className="input" type="file" accept="image/*" onChange={e=>setLogoFile(e.target.files[0]||null)} />
          {logoPreview && <div className="file-preview"><img src={logoPreview} alt="logo preview"/><div className="filename">{logoFile && logoFile.name}</div></div>}
          <div className="file-note">Logo cuadrado preferido (200x200)</div>
        </div>
      </div>

      <div className="actions">
        <button type="button" className="btn outline" onClick={()=>{
          // reset
          setName(''); setDatetime(''); setReservationUrl(''); setProvince(''); setImageFile(null); setDriversFile(null); setLogoFile(null);
        }}>Cancelar</button>
        <button type="submit" className="btn" disabled={!canSubmit}>Crear evento</button>
      </div>
    </form>
  )
}

export default EventForm
