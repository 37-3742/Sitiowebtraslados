require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { join } = require('path');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const sharp = require('sharp');

// local JSON file fallback (no lowdb)
const localDbFile = path.join(__dirname, 'localdb.json');

function readLocalDB(){
  try{
    const raw = fs.readFileSync(localDbFile, 'utf8');
    return JSON.parse(raw);
  }catch(err){
    return { drivers: {}, events: {}, locations: {}, comments: {} };
  }
}
function writeLocalDB(data){
  fs.writeFileSync(localDbFile, JSON.stringify(data, null, 2), 'utf8');
}

// ensure file exists
(async ()=>{
  if(!fs.existsSync(localDbFile)){
    writeLocalDB({ drivers: {}, events: {}, locations: {}, comments: {} });
  }
})();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'replace_with_secret';
const DRIVER_ACCOUNT_TTL_MS = 48 * 60 * 60 * 1000;
const DEFAULT_REFUND_POLICY_NOTICE = 'La empresa no sera responsable por arrepentimiento de compra ni por inasistencia por motivos personales. El pasajero acepta que no se realizaran devoluciones ni reembolsos ante cancelaciones efectuadas por el propio pasajero o por cancelacion del evento.';

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

// Helpers
function generateToken(payload, expiresIn = '12h'){
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

function buildDriverAccountData({ username, passwordHash, name }){
  const createdAt = Date.now();
  return {
    username,
    passwordHash,
    name,
    createdAt,
    expiresAt: createdAt + DRIVER_ACCOUNT_TTL_MS
  };
}

function isDriverAccountExpired(driver){
  if(!driver) return false;
  const expiresAt = Number(driver.expiresAt || 0);
  if(!expiresAt) return false;
  return Date.now() >= expiresAt;
}

function parseFocusPercent(rawValue, fallback = 50){
  const parsed = Number(rawValue);
  if(!Number.isFinite(parsed)) return fallback;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function parseScalePercent(rawValue, fallback = 100){
  const parsed = Number(rawValue);
  if(!Number.isFinite(parsed)) return fallback;
  return Math.min(130, Math.max(20, Math.round(parsed)));
}

function normalizeWhatsappNumber(rawValue){
  if(typeof rawValue !== 'string') return '';
  return rawValue.trim().replace(/[\s()-]/g, '');
}

function normalizePaymentMethod(rawValue){
  if(typeof rawValue !== 'string') return '';
  return rawValue.trim().replace(/\s+/g, ' ');
}

function normalizeTransferAlias(rawValue){
  if(typeof rawValue !== 'string') return '';
  return rawValue.trim();
}

function normalizeTransferCBU(rawValue){
  if(typeof rawValue !== 'string') return '';
  return rawValue.replace(/\s+/g, '').trim();
}

function normalizeTransferBanco(rawValue){
  if(typeof rawValue !== 'string') return '';
  return rawValue.trim().replace(/\s+/g, ' ');
}

function normalizeTransferAccountPreset(rawValue){
  if(!rawValue || typeof rawValue !== 'object') return null;

  const alias = normalizeTransferAlias(rawValue.alias ?? rawValue.transferAlias ?? '');
  const cbu = normalizeTransferCBU(rawValue.cbu ?? rawValue.transferCBU ?? '');
  const banco = normalizeTransferBanco(rawValue.banco ?? rawValue.transferBanco ?? '');

  if(!alias && !cbu && !banco) return null;

  return {
    alias: alias.slice(0, 120),
    cbu: cbu.slice(0, 40),
    banco: banco.slice(0, 120)
  };
}

function transferAccountPresetKey(rawValue){
  const normalized = normalizeTransferAccountPreset(rawValue);
  if(!normalized) return '';
  return `${normalized.alias.toLowerCase()}|${normalized.cbu}|${normalized.banco.toLowerCase()}`;
}

function isValidWhatsappNumber(rawValue){
  return /^\+?\d{7,20}$/.test(rawValue || '');
}

function normalizeRefundPolicyNotice(rawValue){
  if(typeof rawValue !== 'string') return DEFAULT_REFUND_POLICY_NOTICE;
  return rawValue.trim() ? rawValue : DEFAULT_REFUND_POLICY_NOTICE;
}

function normalizeEventDate(rawValue){
  if(typeof rawValue !== 'string') return '';
  const trimmed = rawValue.trim();
  if(!trimmed) return '';

  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!match) return '';

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);

  if(
    parsed.getFullYear() !== year
    || parsed.getMonth() !== month - 1
    || parsed.getDate() !== day
  ) return '';

  return `${match[1]}-${match[2]}-${match[3]}`;
}

function normalizeEventDates(rawDates, fallbackDate = ''){
  const source = Array.isArray(rawDates) ? rawDates : [];
  const normalized = [];
  const seen = new Set();

  const candidates = [...source, fallbackDate];
  for(const value of candidates){
    const cleaned = normalizeEventDate(typeof value === 'string' ? value : String(value || ''));
    if(!cleaned || seen.has(cleaned)) continue;
    seen.add(cleaned);
    normalized.push(cleaned);
  }

  normalized.sort((a, b)=> a.localeCompare(b));
  return normalized;
}

function getPrimaryEventDate(rawDates, fallbackDate = ''){
  const normalized = normalizeEventDates(rawDates, fallbackDate);
  return normalized[0] || '';
}

function getLastEventDate(rawDates, fallbackDate = ''){
  const normalized = normalizeEventDates(rawDates, fallbackDate);
  return normalized.length ? normalized[normalized.length - 1] : '';
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
  try{
    if(useFirebase){
      const ref = firebaseDB.ref('drivers');
      const snap = await ref.once('value');
      if(!snap.exists()){
        const passHash = await bcrypt.hash('1234', 10);
        await ref.push(buildDriverAccountData({ username: 'chofer1', passwordHash: passHash, name: 'Chofer Demo' }));
        console.log('Seeded driver chofer1 / 1234 in Firebase');
      }
    }else{
      const db = readLocalDB();
      db.drivers = db.drivers || {};
      if(Object.keys(db.drivers).length === 0){
        const passHash = await bcrypt.hash('1234', 10);
        const id = 'driver1'
        db.drivers[id] = buildDriverAccountData({ username: 'chofer1', passwordHash: passHash, name: 'Chofer Demo' })
        writeLocalDB(db)
        console.log('Seeded driver chofer1 / 1234 in local DB');
      }
    }
  }catch(err){
    console.error('Error seeding driver', err)
  }
}
seedDriver();

// Admin helpers: find admin
async function findAdminByUsername(username){
  if(useFirebase){
    const ref = firebaseDB.ref('admins');
    const snap = await ref.orderByChild('username').equalTo(username).once('value');
    if(!snap.exists()) return null;
    let found = null;
    snap.forEach(child=>{ found = { id: child.key, ...child.val() }; })
    return found;
  }else{
    const db = readLocalDB();
    const admins = db.admins || {};
    for(const id of Object.keys(admins)){
      if(admins[id].username === username) return { id, ...admins[id] }
    }
    return null
  }
}

// Seed admin if not present
async function seedAdmin(){
  try{
    if(useFirebase){
      const ref = firebaseDB.ref('admins');
      const snap = await ref.once('value');
      if(!snap.exists()){
        const passHash = await bcrypt.hash('admin123', 10);
        await ref.push({ username: 'admin', passwordHash: passHash, name: 'Administrador' });
        console.log('Seeded admin admin / admin123 in Firebase');
      }
    }else{
      const db = readLocalDB();
      db.admins = db.admins || {};
      if(Object.keys(db.admins).length === 0){
        const passHash = await bcrypt.hash('admin123', 10);
        const id = 'admin1'
        db.admins[id] = { username: 'admin', passwordHash: passHash, name: 'Administrador' }
        writeLocalDB(db)
        console.log('Seeded admin admin / admin123 in local DB');
      }
    }
  }catch(err){ console.error('Error seeding admin', err) }
}
seedAdmin();

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
    const db = readLocalDB();
    const drivers = db.drivers || {};
    for(const id of Object.keys(drivers)){
      if(drivers[id].username === username) return { id, ...drivers[id] }
    }
    return null
  }
}

async function findDriverById(driverId){
  if(!driverId) return null;
  if(useFirebase){
    const snap = await firebaseDB.ref(`drivers/${driverId}`).once('value');
    if(!snap.exists()) return null;
    return { id: driverId, ...snap.val() };
  }

  const db = readLocalDB();
  const driver = db.drivers && db.drivers[driverId] ? db.drivers[driverId] : null;
  return driver ? { id: driverId, ...driver } : null;
}

async function createEvent(data){
  if(useFirebase){
    const ref = firebaseDB.ref('events');
    const newRef = await ref.push(data);
    return { id: newRef.key }
  }else{
    const db = readLocalDB();
    const id = 'ev_'+Date.now();
    db.events = db.events || {};
    db.events[id] = data;
    writeLocalDB(db);
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
    const mpSnap = await firebaseDB.ref(`meetingPoints/${eventId}`).once('value')
    const meetingPoint = mpSnap.exists() ? mpSnap.val() : null
    return { event: evSnap.val(), location: latest, meetingPoint }
  }else{
    const db = readLocalDB();
    const ev = db.events && db.events[eventId] ? db.events[eventId] : null
    const locs = (db.locations && db.locations[eventId]) ? db.locations[eventId] : {}
    const keys = Object.keys(locs)
    const latest = keys.length ? locs[keys[keys.length-1]] : null
    const meetingPoint = (db.meetingPoints && db.meetingPoints[eventId]) ? db.meetingPoints[eventId] : null
    return { event: ev, location: latest, meetingPoint }
  }
}

async function getEventById(eventId){
  if(!eventId) return null;
  if(useFirebase){
    const snap = await firebaseDB.ref(`events/${eventId}`).once('value');
    if(!snap.exists()) return null;
    return snap.val();
  }

  const db = readLocalDB();
  return db.events && db.events[eventId] ? db.events[eventId] : null;
}

function flattenCommentsByEvent(rawComments){
  const result = [];
  const grouped = rawComments || {};

  for(const [eventId, commentsForEvent] of Object.entries(grouped)){
    if(!commentsForEvent || typeof commentsForEvent !== 'object') continue;

    for(const [commentId, comment] of Object.entries(commentsForEvent)){
      if(!comment || typeof comment !== 'object') continue;
      result.push({
        id: commentId,
        eventId: comment.eventId || eventId,
        eventName: comment.eventName || '',
        eventDate: comment.eventDate || '',
        customerName: comment.customerName || '',
        comment: comment.comment || '',
        rating: comment.rating || null,
        createdAt: comment.createdAt || 0
      });
    }
  }

  result.sort((a, b)=> Number(b.createdAt || 0) - Number(a.createdAt || 0));
  return result;
}

async function pushLocation(eventId, payload){
  if(useFirebase){
    const locRef = firebaseDB.ref(`locations/${eventId}`).push()
    await locRef.set(payload)
  }else{
    const db = readLocalDB();
    db.locations = db.locations || {};
    db.locations[eventId] = db.locations[eventId] || {};
    const id = 'loc_'+Date.now();
    db.locations[eventId][id] = payload;
    writeLocalDB(db);
  }
}

async function saveMeetingPoint(eventId, payload){
  if(useFirebase){
    await firebaseDB.ref(`meetingPoints/${eventId}`).set(payload)
  }else{
    const db = readLocalDB();
    db.meetingPoints = db.meetingPoints || {};
    db.meetingPoints[eventId] = payload;
    writeLocalDB(db);
  }
}

// Routes
app.post('/api/driver/register', async (req,res)=>{
  const { username, password, name } = req.body;
  if(!username || !password || !name) return res.status(400).json({ error: 'Faltan datos del chofer' });
  const existing = await findDriverByUsername(username);
  if(existing) return res.status(400).json({ error: 'Usuario ya existe' });
  const passwordHash = await bcrypt.hash(password, 10);
  const driverData = buildDriverAccountData({ username, passwordHash, name });
  if(useFirebase){
    const ref = firebaseDB.ref('drivers');
    const newRef = await ref.push(driverData);
    res.json({ id: newRef.key, createdAt: driverData.createdAt, expiresAt: driverData.expiresAt });
  }else{
    const db = readLocalDB();
    db.drivers = db.drivers || {};
    const id = 'driver_'+Date.now();
    db.drivers[id] = driverData;
    writeLocalDB(db);
    res.json({ id, createdAt: driverData.createdAt, expiresAt: driverData.expiresAt })
  }
});

app.post('/api/driver/login', async (req,res)=>{
  const { username, password } = req.body;
  const found = await findDriverByUsername(username);
  if(!found) return res.status(401).json({ error: 'Credenciales inválidas' });
  if(isDriverAccountExpired(found)) return res.status(403).json({ error: 'Cuenta de chofer vencida' });
  const match = await bcrypt.compare(password, found.passwordHash);
  if(!match) return res.status(401).json({ error: 'Credenciales inválidas' });

  let tokenExpiresIn = '12h';
  const expiresAt = Number(found.expiresAt || 0);
  if(expiresAt){
    const secondsRemaining = Math.floor((expiresAt - Date.now()) / 1000);
    if(secondsRemaining <= 0) return res.status(403).json({ error: 'Cuenta de chofer vencida' });
    tokenExpiresIn = `${Math.max(1, Math.min(secondsRemaining, 12 * 60 * 60))}s`;
  }

  const token = generateToken({ driverId: found.id, name: found.name }, tokenExpiresIn);
  res.json({ token, driverId: found.id, name: found.name, expiresAt: found.expiresAt || null });
});

app.post('/api/events', authMiddleware, async (req,res)=>{
  const {
    name,
    code,
    date,
    dates,
    image,
    reservationLink,
    whatsappNumber,
    province,
    departurePlace,
    departurePlaces,
    departureTime,
    departureTimes,
    returnTime,
    paymentMethods,
    departureInfo,
    transferAlias,
    transferCBU,
    transferBanco,
    imageFocusX,
    imageFocusY,
    imageScale,
    transferAccountInfo,
    paymentProofDestination,
    postPaymentInstructions,
    refundPolicyNotice
  } = req.body;

  const normalizedDates = normalizeEventDates(dates, date);
  const primaryDate = getPrimaryEventDate(normalizedDates, date);

  const result = await createEvent({
    name,
    code,
    date: primaryDate,
    dates: normalizedDates,
    image,
    reservationLink,
    whatsappNumber,
    province: province || '',
    departurePlace: Array.isArray(departurePlaces) && departurePlaces.length > 0 ? departurePlaces[0] : (departurePlace || ''),
    departurePlaces: Array.isArray(departurePlaces) ? departurePlaces : (departurePlace ? [departurePlace] : []),
    departureTime: departureTime || '',
    departureTimes: Array.isArray(departureTimes) ? departureTimes : (departureTime ? [departureTime] : []),
    returnTime: returnTime || '',
    paymentMethods: paymentMethods || '',
    departureInfo: departureInfo || '',
    transferAlias: transferAlias || '',
    transferCBU: transferCBU || '',
    transferBanco: transferBanco || '',
    imageFocusX: parseFocusPercent(imageFocusX, 50),
    imageFocusY: parseFocusPercent(imageFocusY, 50),
    imageScale: parseScalePercent(imageScale, 100),
    transferAccountInfo: transferAccountInfo || '',
    paymentProofDestination: paymentProofDestination || '',
    postPaymentInstructions: postPaymentInstructions || '',
    refundPolicyNotice: normalizeRefundPolicyNotice(refundPolicyNotice),
    thumbnail: null,
    status: 'en_curso',
    createdAt: Date.now()
  });
  res.json({ _id: result.id, name, code });
});

// Find event by code (used by driver login)
app.get('/api/events/find-by-code', async (req,res)=>{
  const code = (req.query.code || '').trim();
  if(!code) return res.status(400).json({ error: 'Código requerido' });
  const lowerCode = code.toLowerCase();
  if(useFirebase){
    const snap = await firebaseDB.ref('events').once('value');
    const all = snap.val() || {};
    for(const [id, ev] of Object.entries(all)){
      if((ev.code || '').toLowerCase() === lowerCode || (ev.name || '').toLowerCase() === lowerCode){
        return res.json({ _id: id, ...ev });
      }
    }
    return res.status(404).json({ error: 'Evento no encontrado' });
  }else{
    const db = readLocalDB();
    const events = db.events || {};
    for(const id of Object.keys(events)){
      const ev = events[id];
      if((ev.code || '').toLowerCase() === lowerCode || (ev.name || '').toLowerCase() === lowerCode){
        return res.json({ _id: id, ...ev });
      }
    }
    return res.status(404).json({ error: 'Evento no encontrado' });
  }
});

app.get('/api/events/:id', async (req,res)=>{
  const eventId = req.params.id;
  const data = await getEventWithLocation(eventId);
  if(!data || !data.event) return res.status(404).json({ error: 'Evento no encontrado' });
  res.json({ event: data.event, location: data.location, meetingPoint: data.meetingPoint });
});

// Public: add customer experience comment for past events only
app.post('/api/events/:id/comments', async (req,res)=>{
  const eventId = req.params.id;
  const rawComment = req.body && req.body.comment ? String(req.body.comment) : '';
  const rawCustomerName = req.body && req.body.customerName ? String(req.body.customerName) : '';
  const rawRating = req.body ? req.body.rating : null;

  const comment = rawComment.trim();
  const customerName = rawCustomerName.trim().slice(0, 80);
  const ratingNumber = Number(rawRating);
  const rating = Number.isFinite(ratingNumber) && ratingNumber >= 1 && ratingNumber <= 5
    ? Math.round(ratingNumber)
    : null;

  if(!comment) return res.status(400).json({ error: 'El comentario es obligatorio' });
  if(comment.length > 1200) return res.status(400).json({ error: 'El comentario es demasiado largo' });

  try{
    const event = await getEventById(eventId);
    if(!event) return res.status(404).json({ error: 'Evento no encontrado' });

    const lastEventDate = getLastEventDate(event.dates, event.date);
    const eventDateMs = new Date(lastEventDate || '').getTime();
    if(!Number.isFinite(eventDateMs)){
      return res.status(400).json({ error: 'El evento no tiene una fecha válida para recibir comentarios' });
    }

    if(eventDateMs >= Date.now()){
      return res.status(400).json({ error: 'Solo se puede comentar cuando el evento ya finalizó' });
    }

    const payload = {
      eventId,
      eventName: event.name || '',
      eventDate: lastEventDate || '',
      customerName,
      comment,
      rating,
      createdAt: Date.now()
    };

    if(useFirebase){
      const ref = firebaseDB.ref(`comments/${eventId}`).push();
      await ref.set(payload);
      return res.json({ id: ref.key, ...payload });
    }

    const db = readLocalDB();
    db.comments = db.comments || {};
    db.comments[eventId] = db.comments[eventId] || {};
    const commentId = `comment_${Date.now()}`;
    db.comments[eventId][commentId] = payload;
    writeLocalDB(db);
    return res.json({ id: commentId, ...payload });
  }catch(err){
    console.error('Error saving event comment', err);
    return res.status(500).json({ error: 'Error guardando comentario' });
  }
});

app.post('/api/driver/:id/arrived', authMiddleware, async (req,res)=>{
  const { lat, lng, eventId } = req.body;
  if(!lat || !lng || !eventId) return res.status(400).json({ error: 'Faltan parámetros' });
  const payload = { lat, lng, timestamp: Date.now() };
  await saveMeetingPoint(eventId, payload);
  // update event status
  if(useFirebase){
    await firebaseDB.ref(`events/${eventId}`).update({ status: 'llego' })
  }else{
    const db = readLocalDB();
    if(db.events && db.events[eventId]){
      db.events[eventId].status = 'llego';
      writeLocalDB(db);
    }
  }
  res.json({ success: true, meetingPoint: payload });
});

app.post('/api/driver/:id/update', authMiddleware, async (req,res)=>{
  const { lat, lng, eventId } = req.body;
  if(!lat || !lng || !eventId) return res.status(400).json({ error: 'Faltan parámetros' });
  const payload = { lat, lng, timestamp: Date.now() };
  await pushLocation(eventId, payload);
  res.json({ success: true, location: payload });
});

// Admin login
app.post('/api/admin/login', async (req,res)=>{
  const { username, password } = req.body;
  const found = await findAdminByUsername(username);
  if(!found) return res.status(401).json({ error: 'Credenciales inválidas' });
  const match = await bcrypt.compare(password, found.passwordHash);
  if(!match) return res.status(401).json({ error: 'Credenciales inválidas' });
  const token = generateToken({ adminId: found.id, role: 'admin', name: found.name });
  res.json({ token, adminId: found.id, name: found.name });
});

// List all events
app.get('/api/events', async (req,res)=>{
  if(useFirebase){
    const snap = await firebaseDB.ref('events').once('value');
    res.json(snap.val() || {});
  }else{
    const db = readLocalDB();
    res.json(db.events || {});
  }
});

// List drivers (admin only)
app.get('/api/drivers', authMiddleware, async (req,res)=>{
  if(!req.user || req.user.role!=='admin') return res.status(403).json({ error: 'No autorizado' });
  const activeDrivers = {};
  if(useFirebase){
    const snap = await firebaseDB.ref('drivers').once('value');
    const raw = snap.val() || {};
    for(const [id, driver] of Object.entries(raw)){
      if(!isDriverAccountExpired(driver)) activeDrivers[id] = driver;
    }
  }else{
    const db = readLocalDB();
    const raw = db.drivers || {};
    for(const [id, driver] of Object.entries(raw)){
      if(!isDriverAccountExpired(driver)) activeDrivers[id] = driver;
    }
  }
  res.json(activeDrivers);
});

// Admin only: reset driver password
app.patch('/api/drivers/:id/reset-password', authMiddleware, async (req,res)=>{
  if(!req.user || req.user.role!=='admin') return res.status(403).json({ error: 'No autorizado' });
  const driverId = req.params.id;
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let newPassword = '';
  for(let i = 0; i < 10; i++) newPassword += chars[Math.floor(Math.random() * chars.length)];
  const passwordHash = await bcrypt.hash(newPassword, 10);
  if(useFirebase){
    const snap = await firebaseDB.ref(`drivers/${driverId}`).once('value');
    if(!snap.exists()) return res.status(404).json({ error: 'Chofer no encontrado' });
    await firebaseDB.ref(`drivers/${driverId}`).update({ passwordHash });
  }else{
    const db = readLocalDB();
    if(!db.drivers || !db.drivers[driverId]) return res.status(404).json({ error: 'Chofer no encontrado' });
    db.drivers[driverId].passwordHash = passwordHash;
    writeLocalDB(db);
  }
  res.json({ newPassword });
});

// Admin only: delete driver access and credentials
app.delete('/api/drivers/:id', authMiddleware, async (req,res)=>{
  if(!req.user || req.user.role!=='admin') return res.status(403).json({ error: 'No autorizado' });
  const driverId = req.params.id;

  if(useFirebase){
    const driverRef = firebaseDB.ref(`drivers/${driverId}`);
    const snap = await driverRef.once('value');
    if(!snap.exists()) return res.status(404).json({ error: 'Chofer no encontrado' });

    await driverRef.remove();

    const eventsSnap = await firebaseDB.ref('events').once('value');
    const rawEvents = eventsSnap.val() || {};
    const updates = {};
    for(const [eventId, eventData] of Object.entries(rawEvents)){
      if(eventData && eventData.assignedDriver === driverId){
        updates[`events/${eventId}/assignedDriver`] = null;
      }
    }

    if(Object.keys(updates).length > 0){
      await firebaseDB.ref().update(updates);
    }
  }else{
    const db = readLocalDB();
    if(!db.drivers || !db.drivers[driverId]) return res.status(404).json({ error: 'Chofer no encontrado' });

    delete db.drivers[driverId];
    db.events = db.events || {};
    for(const eventId of Object.keys(db.events)){
      if(db.events[eventId] && db.events[eventId].assignedDriver === driverId){
        delete db.events[eventId].assignedDriver;
      }
    }
    writeLocalDB(db);
  }

  res.json({ success: true });
});

// Admin only: list customer comments
app.get('/api/admin/comments', authMiddleware, async (req,res)=>{
  if(!req.user || req.user.role!=='admin') return res.status(403).json({ error: 'No autorizado' });

  try{
    if(useFirebase){
      const snap = await firebaseDB.ref('comments').once('value');
      return res.json(flattenCommentsByEvent(snap.val() || {}));
    }

    const db = readLocalDB();
    return res.json(flattenCommentsByEvent(db.comments || {}));
  }catch(err){
    console.error('Error listing comments', err);
    return res.status(500).json({ error: 'Error obteniendo comentarios' });
  }
});

// Assign driver to event (admin only)
app.post('/api/events/:id/assign-driver', authMiddleware, async (req,res)=>{
  if(!req.user || req.user.role!=='admin') return res.status(403).json({ error: 'No autorizado' });
  const eventId = req.params.id;
  const { driverId } = req.body;
  if(!driverId) return res.status(400).json({ error: 'driverId requerido' });

  const driver = await findDriverById(driverId);
  if(!driver) return res.status(404).json({ error: 'Chofer no encontrado' });
  if(isDriverAccountExpired(driver)) return res.status(400).json({ error: 'La cuenta del chofer está vencida' });

  if(useFirebase){
    await firebaseDB.ref(`events/${eventId}`).update({ assignedDriver: driverId });
  }else{
    const db = readLocalDB();
    db.events = db.events || {};
    if(!db.events[eventId]) return res.status(404).json({ error: 'Evento no encontrado' });
    db.events[eventId].assignedDriver = driverId;
    writeLocalDB(db);
  }
  res.json({ success: true });
});

// Get events assigned to a driver
app.get('/api/driver/:id/events', authMiddleware, async (req,res)=>{
  const driverId = req.params.id;
  // allow driver to fetch their events or admin
  if(req.user.role && req.user.role==='admin'){
    // admin can view any
  } else if(req.user.driverId && req.user.driverId !== driverId){
    return res.status(403).json({ error: 'No autorizado' });
  }
  if(useFirebase){
    const snap = await firebaseDB.ref('events').orderByChild('assignedDriver').equalTo(driverId).once('value');
    res.json(snap.val() || {});
  }else{
    const db = readLocalDB();
    const events = db.events || {};
    const out = {}
    for(const id of Object.keys(events)){
      if(events[id].assignedDriver === driverId) out[id]=events[id]
    }
    res.json(out)
  }
});

// multer setup
const uploadsDir = path.join(__dirname, 'uploads');
if(!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, uploadsDir) },
  filename: function (req, file, cb) { cb(null, Date.now() + '-' + file.originalname) }
});
const upload = multer({ storage });

// Serve uploads
app.use('/uploads', express.static(uploadsDir));

// New endpoint: create event with image upload (admin)
app.post('/api/events/upload', authMiddleware, upload.single('image'), async (req,res)=>{
  try{
    // File handling & thumbnail generation
    let imagePath = null;
    let thumbPath = null;
    if(req.file){
      const inputPath = path.join(uploadsDir, req.file.filename)
      imagePath = `/uploads/${req.file.filename}`;
      thumbPath = `/uploads/thumb-${req.file.filename}`;
      await sharp(inputPath)
        .rotate()
        .resize(400, 300, { fit: 'inside' })
        .toFile(path.join(uploadsDir, `thumb-${req.file.filename}`));
    }

    // Gather fields from form
    const name = req.body.name || ''
    const code = req.body.code || name
    const date = req.body.date || ''
    let dates = []
    try { dates = JSON.parse(req.body.dates || '[]') } catch(e) { dates = [] }
    if(!Array.isArray(dates)) dates = []
    const normalizedDates = normalizeEventDates(dates, date)
    const primaryDate = getPrimaryEventDate(normalizedDates, date)
    const reservationLink = req.body.reservationLink || ''
    const whatsappNumber = req.body.whatsappNumber || ''
    const province = req.body.province || ''
    const departurePlace = req.body.departurePlace || ''
    let departurePlaces = []
    try { departurePlaces = JSON.parse(req.body.departurePlaces || '[]') } catch(e) { departurePlaces = [] }
    if(!Array.isArray(departurePlaces)) departurePlaces = departurePlace ? [departurePlace] : []
    const departureTime = req.body.departureTime || ''
    let departureTimes = []
    try { departureTimes = JSON.parse(req.body.departureTimes || '[]') } catch(e) { departureTimes = [] }
    if(!Array.isArray(departureTimes)) departureTimes = departureTime ? [departureTime] : []
    const returnTime = req.body.returnTime || ''
    const paymentMethods = req.body.paymentMethods || ''
    const departureInfo = req.body.departureInfo || ''
    const transferAlias = req.body.transferAlias || ''
    const transferCBU = req.body.transferCBU || ''
    const transferBanco = req.body.transferBanco || ''
    const imageFocusX = parseFocusPercent(req.body.imageFocusX, 50)
    const imageFocusY = parseFocusPercent(req.body.imageFocusY, 50)
    const imageScale = parseScalePercent(req.body.imageScale, 100)
    const transferAccountInfo = req.body.transferAccountInfo || ''
    const paymentProofDestination = req.body.paymentProofDestination || ''
    const postPaymentInstructions = req.body.postPaymentInstructions || ''
    const refundPolicyNotice = normalizeRefundPolicyNotice(req.body.refundPolicyNotice)

    const eventId = 'ev_' + Date.now()
    const event = {
      name,
      code,
      date: primaryDate,
      dates: normalizedDates,
      province, // <-- ensure province is saved
      reservationLink,
      whatsappNumber,
      departurePlace: departurePlaces[0] || departurePlace,
      departurePlaces,
      departureTime,
      departureTimes,
      returnTime,
      paymentMethods,
      departureInfo,
      transferAlias,
      transferCBU,
      transferBanco,
      imageFocusX,
      imageFocusY,
      imageScale,
      transferAccountInfo,
      paymentProofDestination,
      postPaymentInstructions,
      refundPolicyNotice,
      image: imagePath,
      thumbnail: thumbPath,
      status: 'en_curso',
      createdAt: Date.now()
    }

    if(useFirebase){
      const ref = firebaseDB.ref('events');
      const newRef = await ref.push(event);
      res.json({ ok:true, id: newRef.key, event });
    }else{
      const db = readLocalDB();
      db.events = db.events || {};
      db.events[eventId] = event;
      writeLocalDB(db);
      res.json({ ok:true, id: eventId, event });
    }
  }catch(err){
    console.error(err)
    res.status(500).json({ error: 'upload_failed' })
  }
});

// Delete event (admin only)
app.delete('/api/events/:id', authMiddleware, async (req,res)=>{
  if(!req.user || req.user.role!=='admin') return res.status(403).json({ error: 'No autorizado' });
  const eventId = req.params.id;
  try{
    if(useFirebase){
      await firebaseDB.ref(`events/${eventId}`).remove();
      await firebaseDB.ref(`locations/${eventId}`).remove();
      await firebaseDB.ref(`comments/${eventId}`).remove();
    }else{
      const db = readLocalDB();
      if(db.events && db.events[eventId]) delete db.events[eventId];
      if(db.locations && db.locations[eventId]) delete db.locations[eventId];
      if(db.comments && db.comments[eventId]) delete db.comments[eventId];
      writeLocalDB(db);
    }
    res.json({ success: true });
  }catch(err){
    console.error('Error deleting event', err);
    res.status(500).json({ error: 'Error eliminando evento' });
  }
});

// Admin: update event fields (e.g., departureInfo)
app.patch('/api/events/:id', authMiddleware, async (req,res)=>{
  if(!req.user || req.user.role!=='admin') return res.status(403).json({ error: 'No autorizado' });
  const eventId = req.params.id;
  const updates = req.body || {};
  if(Object.prototype.hasOwnProperty.call(updates, 'imageFocusX')){
    updates.imageFocusX = parseFocusPercent(updates.imageFocusX, 50);
  }
  if(Object.prototype.hasOwnProperty.call(updates, 'imageFocusY')){
    updates.imageFocusY = parseFocusPercent(updates.imageFocusY, 50);
  }
  if(Object.prototype.hasOwnProperty.call(updates, 'imageScale')){
    updates.imageScale = parseScalePercent(updates.imageScale, 100);
  }
  if(
    Object.prototype.hasOwnProperty.call(updates, 'date')
    || Object.prototype.hasOwnProperty.call(updates, 'dates')
  ){
    const incomingDate = Object.prototype.hasOwnProperty.call(updates, 'date') ? updates.date : '';
    const incomingDates = Object.prototype.hasOwnProperty.call(updates, 'dates') ? updates.dates : [];
    const normalizedDates = normalizeEventDates(incomingDates, incomingDate);
    updates.dates = normalizedDates;
    updates.date = getPrimaryEventDate(normalizedDates, incomingDate);
  }
  try{
    if(useFirebase){
      await firebaseDB.ref(`events/${eventId}`).update(updates);
    }else{
      const db = readLocalDB();
      db.events = db.events || {};
      if(!db.events[eventId]) return res.status(404).json({ error: 'Evento no encontrado' });
      db.events[eventId] = { ...db.events[eventId], ...updates };
      writeLocalDB(db);
    }
    res.json({ success: true });
  }catch(err){
    console.error('Error updating event', err);
    res.status(500).json({ error: 'Error actualizando evento' });
  }
});

// Public/Driver: report return for event (optionally with location)
app.post('/api/events/:id/report-return', async (req,res)=>{
  const eventId = req.params.id;
  const { lat, lng } = req.body || {};
  try{
    // store a location with type 'return'
    const payload = { timestamp: Date.now(), lat: lat || null, lng: lng || null, type: 'return' };
    if(useFirebase){
      const locRef = firebaseDB.ref(`locations/${eventId}`).push();
      await locRef.set(payload);
      await firebaseDB.ref(`events/${eventId}`).update({ status: 'finalizado' });
    }else{
      const db = readLocalDB();
      db.locations = db.locations || {};
      db.locations[eventId] = db.locations[eventId] || {};
      const id = 'loc_'+Date.now();
      db.locations[eventId][id] = payload;
      // mark event finalized
      if(db.events && db.events[eventId]) db.events[eventId].status = 'finalizado';
      writeLocalDB(db);
    }
    res.json({ success: true });
  }catch(err){
    console.error('Error reporting return', err);
    res.status(500).json({ error: 'Error registrando la vuelta' });
  }
});

// Upload company logo (admin only)
app.post('/api/settings/logo', authMiddleware, upload.single('logo'), async (req, res) => {
  if(!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'No autorizado' });
  try{
    const logoPath = req.file ? `/uploads/${req.file.filename}` : null;
    if(useFirebase){
      await firebaseDB.ref('settings').update({ logo: logoPath });
    }else{
      const db = readLocalDB();
      db.settings = db.settings || {};
      db.settings.logo = logoPath;
      writeLocalDB(db);
    }
    res.json({ logo: logoPath });
  }catch(err){
    console.error('Error uploading logo', err);
    res.status(500).json({ error: 'Error subiendo logo' });
  }
});

// Upload driver login brand image (admin only)
app.post('/api/settings/driver-login-logo', authMiddleware, upload.single('logo'), async (req, res) => {
  if(!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'No autorizado' });
  try{
    const logoPath = req.file ? `/uploads/${req.file.filename}` : null;
    if(useFirebase){
      await firebaseDB.ref('settings').update({ driverLoginLogo: logoPath });
    }else{
      const db = readLocalDB();
      db.settings = db.settings || {};
      db.settings.driverLoginLogo = logoPath;
      writeLocalDB(db);
    }
    res.json({ driverLoginLogo: logoPath });
  }catch(err){
    console.error('Error uploading driver login logo', err);
    res.status(500).json({ error: 'Error subiendo imagen' });
  }
});

// Save organization Instagram link (admin only)
app.post('/api/settings/instagram-link', authMiddleware, async (req, res) => {
  if(!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'No autorizado' });
  try{
    const rawLink = typeof req.body?.instagramLink === 'string' ? req.body.instagramLink.trim() : '';
    const normalizedLink = rawLink
      ? (/^https?:\/\//i.test(rawLink) ? rawLink : `https://${rawLink}`)
      : '';

    if(normalizedLink){
      try{
        const parsed = new URL(normalizedLink);
        if(!parsed.hostname) return res.status(400).json({ error: 'Link inválido' });
      }catch(err){
        return res.status(400).json({ error: 'Link inválido' });
      }
    }

    if(useFirebase){
      await firebaseDB.ref('settings').update({ instagramLink: normalizedLink });
    }else{
      const db = readLocalDB();
      db.settings = db.settings || {};
      db.settings.instagramLink = normalizedLink;
      writeLocalDB(db);
    }

    res.json({ instagramLink: normalizedLink });
  }catch(err){
    console.error('Error saving instagram link', err);
    res.status(500).json({ error: 'Error guardando link' });
  }
});

// Save organization social links (admin only)
app.post('/api/settings/social-links', authMiddleware, async (req, res) => {
  if(!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'No autorizado' });

  try{
    const rawSocialLinks = Array.isArray(req.body?.socialLinks) ? req.body.socialLinks : null;
    if(!rawSocialLinks) return res.status(400).json({ error: 'socialLinks debe ser un arreglo' });

    const normalizeLink = (rawLink) => {
      const trimmed = typeof rawLink === 'string' ? rawLink.trim() : '';
      if(!trimmed) return null;

      const full = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
      try{
        const parsed = new URL(full);
        if(!parsed.hostname) return null;
        return full;
      }catch(err){
        return null;
      }
    };

    const normalized = [];
    for(let i = 0; i < rawSocialLinks.length; i += 1){
      const item = rawSocialLinks[i] || {};
      const name = typeof item.name === 'string' ? item.name.trim() : '';
      const icon = typeof item.icon === 'string' ? item.icon.trim() : '';
      const link = normalizeLink(item.link);

      if(!name && !icon && !item.link) continue;

      if(!name) return res.status(400).json({ error: `La red #${i + 1} necesita nombre` });
      if(!icon) return res.status(400).json({ error: `La red #${i + 1} necesita icono` });
      if(!link) return res.status(400).json({ error: `La red #${i + 1} tiene un link inválido` });

      normalized.push({
        name: name.slice(0, 60),
        icon: icon.slice(0, 60),
        link
      });
    }

    const instagramItem = normalized.find(item => (
      /instagram/i.test(item.name) || /instagram\.com/i.test(item.link)
    ));
    const legacyInstagramLink = instagramItem ? instagramItem.link : '';

    if(useFirebase){
      await firebaseDB.ref('settings').update({
        socialLinks: normalized,
        instagramLink: legacyInstagramLink
      });
    }else{
      const db = readLocalDB();
      db.settings = db.settings || {};
      db.settings.socialLinks = normalized;
      db.settings.instagramLink = legacyInstagramLink;
      writeLocalDB(db);
    }

    return res.json({ socialLinks: normalized });
  }catch(err){
    console.error('Error saving social links', err);
    return res.status(500).json({ error: 'Error guardando redes' });
  }
});

// Save frequently-used reservation WhatsApp numbers (admin only)
app.post('/api/settings/reservation-whatsapp-numbers', authMiddleware, async (req, res) => {
  if(!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'No autorizado' });

  try{
    const rawNumbers = Array.isArray(req.body?.numbers)
      ? req.body.numbers
      : (Array.isArray(req.body?.reservationWhatsappNumbers) ? req.body.reservationWhatsappNumbers : null);

    if(!rawNumbers) return res.status(400).json({ error: 'numbers debe ser un arreglo' });

    const normalized = [];
    for(let i = 0; i < rawNumbers.length; i += 1){
      const cleaned = normalizeWhatsappNumber(rawNumbers[i]);
      if(!cleaned) continue;
      if(!isValidWhatsappNumber(cleaned)){
        return res.status(400).json({ error: `Número inválido en posición ${i + 1}` });
      }
      if(!normalized.includes(cleaned)) normalized.push(cleaned);
    }

    if(useFirebase){
      await firebaseDB.ref('settings').update({ reservationWhatsappNumbers: normalized });
    }else{
      const db = readLocalDB();
      db.settings = db.settings || {};
      db.settings.reservationWhatsappNumbers = normalized;
      writeLocalDB(db);
    }

    return res.json({ reservationWhatsappNumbers: normalized });
  }catch(err){
    console.error('Error saving reservation whatsapp numbers', err);
    return res.status(500).json({ error: 'Error guardando números de WhatsApp' });
  }
});

// Save frequently-used payment methods for reservation forms (admin only)
app.post('/api/settings/reservation-payment-methods', authMiddleware, async (req, res) => {
  if(!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'No autorizado' });

  try{
    const rawMethods = Array.isArray(req.body?.methods)
      ? req.body.methods
      : (Array.isArray(req.body?.reservationPaymentMethods) ? req.body.reservationPaymentMethods : null);

    if(!rawMethods) return res.status(400).json({ error: 'methods debe ser un arreglo' });

    const normalized = [];
    const seen = new Set();
    for(let i = 0; i < rawMethods.length; i += 1){
      const cleaned = normalizePaymentMethod(rawMethods[i]);
      if(!cleaned) continue;
      const key = cleaned.toLowerCase();
      if(seen.has(key)) continue;
      seen.add(key);
      normalized.push(cleaned.slice(0, 80));
    }

    if(useFirebase){
      await firebaseDB.ref('settings').update({ reservationPaymentMethods: normalized });
    }else{
      const db = readLocalDB();
      db.settings = db.settings || {};
      db.settings.reservationPaymentMethods = normalized;
      writeLocalDB(db);
    }

    return res.json({ reservationPaymentMethods: normalized });
  }catch(err){
    console.error('Error saving reservation payment methods', err);
    return res.status(500).json({ error: 'Error guardando formas de pago' });
  }
});

// Save reusable defaults for repetitive event form fields (admin only)
app.post('/api/settings/event-defaults', authMiddleware, async (req, res) => {
  if(!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'No autorizado' });

  try{
    const raw = (req.body?.eventDefaults && typeof req.body.eventDefaults === 'object')
      ? req.body.eventDefaults
      : (req.body || {});

    const transferAmountRaw = typeof raw.transferAmount === 'string'
      ? raw.transferAmount.replace(',', '.').trim()
      : String(raw.transferAmount ?? '').trim();
    const transferAmountParsed = Number(transferAmountRaw || '0');
    const transferAmount = Number.isFinite(transferAmountParsed)
      ? Math.max(0, Math.round(transferAmountParsed * 100) / 100)
      : 0;

    const eventDefaults = {
      whatsappNumber: normalizeWhatsappNumber(raw.whatsappNumber || ''),
      reservationLink: typeof raw.reservationLink === 'string' ? raw.reservationLink.trim() : '',
      paymentMethods: typeof raw.paymentMethods === 'string' ? raw.paymentMethods.trim() : '',
      transferAlias: normalizeTransferAlias(raw.transferAlias || ''),
      transferCBU: normalizeTransferCBU(raw.transferCBU || ''),
      transferBanco: normalizeTransferBanco(raw.transferBanco || ''),
      transferAmount,
      paymentProofDestination: typeof raw.paymentProofDestination === 'string' ? raw.paymentProofDestination.trim() : '',
      postPaymentInstructions: typeof raw.postPaymentInstructions === 'string' ? raw.postPaymentInstructions.trim() : '',
      refundPolicyNotice: normalizeRefundPolicyNotice(raw.refundPolicyNotice)
    };

    if(useFirebase){
      await firebaseDB.ref('settings').update({ eventDefaults });
    }else{
      const db = readLocalDB();
      db.settings = db.settings || {};
      db.settings.eventDefaults = eventDefaults;
      writeLocalDB(db);
    }

    return res.json({ eventDefaults });
  }catch(err){
    console.error('Error saving event defaults', err);
    return res.status(500).json({ error: 'Error guardando plantilla' });
  }
});

// Save frequently-used transfer account presets (admin only)
app.post('/api/settings/transfer-account-presets', authMiddleware, async (req, res) => {
  if(!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'No autorizado' });

  try{
    const rawAccounts = Array.isArray(req.body?.accounts)
      ? req.body.accounts
      : (Array.isArray(req.body?.transferAccountPresets) ? req.body.transferAccountPresets : null);

    if(!rawAccounts) return res.status(400).json({ error: 'accounts debe ser un arreglo' });

    const normalized = [];
    const seen = new Set();
    for(let i = 0; i < rawAccounts.length; i += 1){
      const account = normalizeTransferAccountPreset(rawAccounts[i]);
      if(!account || (!account.alias && !account.cbu)) continue;
      const key = transferAccountPresetKey(account);
      if(!key || seen.has(key)) continue;
      seen.add(key);
      normalized.push(account);
    }

    if(useFirebase){
      await firebaseDB.ref('settings').update({ transferAccountPresets: normalized });
    }else{
      const db = readLocalDB();
      db.settings = db.settings || {};
      db.settings.transferAccountPresets = normalized;
      writeLocalDB(db);
    }

    return res.json({ transferAccountPresets: normalized });
  }catch(err){
    console.error('Error saving transfer account presets', err);
    return res.status(500).json({ error: 'Error guardando cuentas de transferencia' });
  }
});

// Save transfer-report WhatsApp numbers (admin only)
app.post('/api/settings/transfer-whatsapp-numbers', authMiddleware, async (req, res) => {
  if(!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'No autorizado' });

  try{
    const rawNumbers = Array.isArray(req.body?.numbers) ? req.body.numbers : null;
    if(!rawNumbers) return res.status(400).json({ error: 'numbers debe ser un arreglo' });

    const normalized = [];
    for(let i = 0; i < rawNumbers.length; i += 1){
      const cleaned = normalizeWhatsappNumber(rawNumbers[i]);
      if(!cleaned) continue;
      if(!isValidWhatsappNumber(cleaned)){
        return res.status(400).json({ error: `Número inválido en posición ${i + 1}` });
      }
      if(!normalized.includes(cleaned)) normalized.push(cleaned);
    }

    if(useFirebase){
      await firebaseDB.ref('settings').update({ transferWhatsappNumbers: normalized });
    }else{
      const db = readLocalDB();
      db.settings = db.settings || {};
      db.settings.transferWhatsappNumbers = normalized;
      writeLocalDB(db);
    }

    return res.json({ transferWhatsappNumbers: normalized });
  }catch(err){
    console.error('Error saving transfer whatsapp numbers', err);
    return res.status(500).json({ error: 'Error guardando números' });
  }
});

// Get settings (public)
app.get('/api/settings', async (req,res) => {
  try{
    if(useFirebase){
      const snap = await firebaseDB.ref('settings').once('value');
      res.json(snap.val() || {});
    }else{
      const db = readLocalDB();
      res.json(db.settings || {});
    }
  }catch(err){
    console.error('Error getting settings', err);
    res.status(500).json({});
  }
});

// Admin: regenerate thumbnails for existing events
app.post('/api/admin/regenerate-thumbs', authMiddleware, async (req,res)=>{
  if(!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'No autorizado' });
  const processed = []
  const errors = []
  try{
    if(useFirebase){
      const snap = await firebaseDB.ref('events').once('value')
      const events = snap.val() || {}
      for(const id of Object.keys(events)){
        const ev = events[id]
        if(!ev || !ev.image) continue
        // only handle local uploads stored under /uploads
        if(ev.image.startsWith('/uploads/')){
          const filename = ev.image.replace('/uploads/','')
          const inputPath = path.join(uploadsDir, filename)
          if(fs.existsSync(inputPath)){
            try{
              const thumbName = 'thumb-'+filename
              const outPath = path.join(uploadsDir, thumbName)
              await sharp(inputPath).rotate().resize(400,300,{ fit: 'inside' }).toFile(outPath)
              const thumbnail = `/uploads/${thumbName}`
              await firebaseDB.ref(`events/${id}`).update({ thumbnail })
              processed.push(id)
            }catch(err){
              console.error('thumb error', err)
              errors.push({ id, error: err.message })
            }
          }else{
            errors.push({ id, error: 'file not found', path: inputPath })
          }
        }else{
          errors.push({ id, error: 'external image skipped', image: ev.image })
        }
      }
    }else{
      const db = readLocalDB()
      db.events = db.events || {}
      for(const id of Object.keys(db.events)){
        const ev = db.events[id]
        if(!ev || !ev.image) continue
        if(ev.image.startsWith('/uploads/')){
          const filename = ev.image.replace('/uploads/','')
          const inputPath = path.join(uploadsDir, filename)
          if(fs.existsSync(inputPath)){
            try{
              const thumbName = 'thumb-'+filename
              const outPath = path.join(uploadsDir, thumbName)
              await sharp(inputPath).rotate().resize(400,300,{ fit: 'inside' }).toFile(outPath)
              const thumbnail = `/uploads/${thumbName}`
              db.events[id].thumbnail = thumbnail
              processed.push(id)
            }catch(err){
              console.error('thumb error', err)
              errors.push({ id, error: err.message })
            }
          }else{
            errors.push({ id, error: 'file not found', path: inputPath })
          }
        }else{
          errors.push({ id, error: 'external image skipped', image: ev.image })
        }
      }
      writeLocalDB(db)
    }
    res.json({ ok:true, processed, errors })
  }catch(err){
    console.error('regenerate thumbs error', err)
    res.status(500).json({ error: 'Error regenerando thumbnails', details: err.message })
  }
})

app.listen(PORT, ()=>console.log('Server listening on', PORT));