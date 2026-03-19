require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { join } = require('path');

// lowdb v5
const { Low, JSONFile } = require('lowdb');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'replace_with_secret';

let useFirebase = false;
let firebaseDB = null;
let localDB = null;

// Initialize Firebase Admin SDK using env vars if available
try{
  if(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY){
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL || undefined
    });
    firebaseDB = admin.database();
    useFirebase = true;
    console.log('Using Firebase Realtime Database')
  }
}catch(err){
  console.warn('Firebase init failed, falling back to local DB', err.message)
}

// Setup lowdb local fallback
(async ()=>{
  const file = join(__dirname, 'localdb.json')
  const adapter = new JSONFile(file)
  localDB = new Low(adapter)
  await localDB.read()
  localDB.data = localDB.data || { drivers: {}, events: {}, locations: {} }
  await localDB.write()
})();

// Helpers
function generateToken(payload){
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
}

function authMiddleware(req,res,next){
  const header = req.headers.authorization;
  if(!header) return res.status(401).json({ error: 'No token' });
  const token = header.split(' ')[1];
  try{
    const data = jwt.verify(token, JWT_SECRET);
    req.user = data;
    next();
  }catch(err){
    return res.status(401).json({ error: 'Token inválido' });
  }
}

// Seed demo driver (works for both)
async function seedDriver(){
  if(useFirebase){
    const ref = firebaseDB.ref('drivers');
    const snap = await ref.once('value');
    if(!snap.exists()){
      const passHash = await bcrypt.hash('1234', 10);
      await ref.push({ username: 'chofer1', passwordHash: passHash, name: 'Chofer Demo' });
      console.log('Seeded driver chofer1 / 1234 in Firebase');
    }
  }else{
    await localDB.read()
    if(Object.keys(localDB.data.drivers).length === 0){
      const passHash = await bcrypt.hash('1234', 10);
      const id = 'driver1'
      localDB.data.drivers[id] = { username: 'chofer1', passwordHash: passHash, name: 'Chofer Demo' }
      await localDB.write()
      console.log('Seeded driver chofer1 / 1234 in local DB');
    }
  }
}
seedDriver();

// Utility functions for DB operations
async function findDriverByUsername(username){
  if(useFirebase){
    const ref = firebaseDB.ref('drivers');
    const snap = await ref.orderByChild('username').equalTo(username).once('value');
    if(!snap.exists()) return null;
    let found = null;
    snap.forEach(child=>{ found = { id: child.key, ...child.val() }; })
    return found;
  }else{
    await localDB.read()
    const drivers = localDB.data.drivers
    for(const id of Object.keys(drivers)){
      if(drivers[id].username === username) return { id, ...drivers[id] }
    }
    return null
  }
}

async function createEvent(data){
  if(useFirebase){
    const ref = firebaseDB.ref('events');
    const newRef = await ref.push(data);
    return { id: newRef.key }
  }else{
    await localDB.read()
    const id = 'ev_'+Date.now()
    localDB.data.events[id] = data
    await localDB.write()
    return { id }
  }
}

async function getEventWithLocation(eventId){
  if(useFirebase){
    const evSnap = await firebaseDB.ref(`events/${eventId}`).once('value')
    if(!evSnap.exists()) return null
    const locSnap = await firebaseDB.ref(`locations/${eventId}`).orderByChild('timestamp').limitToLast(1).once('value')
    let latest = null
    locSnap.forEach(child=>{ latest = child.val() })
    return { event: evSnap.val(), location: latest }
  }else{
    await localDB.read()
    const ev = localDB.data.events[eventId] || null
    const locs = localDB.data.locations[eventId] || {}
    const keys = Object.keys(locs)
    const latest = keys.length ? locs[keys[keys.length-1]] : null
    return { event: ev, location: latest }
  }
}

async function pushLocation(eventId, payload){
  if(useFirebase){
    const locRef = firebaseDB.ref(`locations/${eventId}`).push()
    await locRef.set(payload)
  }else{
    await localDB.read()
    localDB.data.locations[eventId] = localDB.data.locations[eventId] || {}
    const id = 'loc_'+Date.now()
    localDB.data.locations[eventId][id] = payload
    await localDB.write()
  }
}

// Routes
app.post('/api/driver/register', async (req,res)=>{
  const { username, password, name } = req.body;
  const existing = await findDriverByUsername(username);
  if(existing) return res.status(400).json({ error: 'Usuario ya existe' });
  const passwordHash = await bcrypt.hash(password, 10);
  if(useFirebase){
    const ref = firebaseDB.ref('drivers');
    const newRef = await ref.push({ username, passwordHash, name });
    res.json({ id: newRef.key });
  }else{
    await localDB.read()
    const id = 'driver_'+Date.now()
    localDB.data.drivers[id] = { username, passwordHash, name }
    await localDB.write()
    res.json({ id })
  }
});

app.post('/api/driver/login', async (req,res)=>{
  const { username, password } = req.body;
  const found = await findDriverByUsername(username);
  if(!found) return res.status(401).json({ error: 'Credenciales inválidas' });
  const match = await bcrypt.compare(password, found.passwordHash);
  if(!match) return res.status(401).json({ error: 'Credenciales inválidas' });
  const token = generateToken({ driverId: found.id, name: found.name });
  res.json({ token, driverId: found.id, name: found.name });
});

app.post('/api/events', authMiddleware, async (req,res)=>{
  const { name, code } = req.body;
  const result = await createEvent({ name, code, status: 'en_curso', createdAt: Date.now() });
  res.json({ _id: result.id, name, code });
});

app.get('/api/events/:id', async (req,res)=>{
  const eventId = req.params.id;
  const data = await getEventWithLocation(eventId);
  if(!data || !data.event) return res.status(404).json({ error: 'Evento no encontrado' });
  res.json({ event: data.event, location: data.location });
});

app.post('/api/driver/:id/arrived', authMiddleware, async (req,res)=>{
  const { lat, lng, eventId } = req.body;
  if(!lat || !lng || !eventId) return res.status(400).json({ error: 'Faltan parámetros' });
  const payload = { lat, lng, timestamp: Date.now() };
  await pushLocation(eventId, payload);
  // update event status
  if(useFirebase){
    await firebaseDB.ref(`events/${eventId}`).update({ status: 'llego' })
  }else{
    await localDB.read()
    if(localDB.data.events[eventId]){
      localDB.data.events[eventId].status = 'llego'
      await localDB.write()
    }
  }
  res.json({ success: true, location: payload });
});

app.post('/api/driver/:id/update', authMiddleware, async (req,res)=>{
  const { lat, lng, eventId } = req.body;
  if(!lat || !lng || !eventId) return res.status(400).json({ error: 'Faltan parámetros' });
  const payload = { lat, lng, timestamp: Date.now() };
  await pushLocation(eventId, payload);
  res.json({ success: true, location: payload });
});

app.listen(PORT, ()=>console.log('Server listening on', PORT));