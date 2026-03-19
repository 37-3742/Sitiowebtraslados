import React, { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api'
import { initializeApp } from 'firebase/app'
import { getDatabase, ref, onValue } from 'firebase/database'

export default function EventView(){
  const { id } = useParams()
  const [location, setLocation] = useState(null)
  const [status, setStatus] = useState('en_curso')

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000'

  useEffect(()=>{
    async function load(){
      try{
        const res = await axios.get(apiUrl+`/api/events/${id}`)
        if(res.data.location){
          setLocation({ lat: res.data.location.lat, lng: res.data.location.lng })
        }
        if(res.data.event) setStatus(res.data.event.status)
      }catch(err){
        console.error(err)
      }
    }
    load()

    // Try Firebase realtime updates if configuration present
    try{
      const firebaseConfig = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      }
      if(firebaseConfig.apiKey){
        const app = initializeApp(firebaseConfig)
        const db = getDatabase(app)
        const locRef = ref(db, `locations/${id}`)
        onValue(locRef, (snap)=>{
          const val = snap.val()
          if(!val) return
          // get last child
          const keys = Object.keys(val)
          const last = val[keys[keys.length-1]]
          setLocation({ lat: last.lat, lng: last.lng })
        })
      }
    }catch(err){
      console.warn('Firebase not configured for realtime')
    }
  }, [id])

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY || ''
  })

  const openGoogleMaps = useCallback(()=>{
    if(!location) return
    const url = `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`
    window.open(url, '_blank')
  }, [location])

  return (
    <div className="container">
      <div className="card">
        <div className="header">
          <h2>Seguimiento del colectivo</h2>
          <div>
            <span style={{marginRight:8}}>{status === 'llego' ? 'El colectivo ya llegó' : 'En camino'}</span>
            <button className="btn secondary" onClick={openGoogleMaps}>Cómo llegar</button>
          </div>
        </div>
        <div style={{marginTop:12}}>
          {isLoaded ? (
            <div className="map">
              <GoogleMap center={location||{lat:-34.6037,lng:-58.3816}} zoom={14} mapContainerStyle={{width:'100%',height:'100%'}}>
                {location && <Marker position={location} />}
              </GoogleMap>
            </div>
          ) : (
            <div className="center">Cargando mapa...</div>
          )}
        </div>
      </div>
    </div>
  )
}