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
  const { name, code, date, image, reservationLink, whatsappNumber } = req.body;
  const result = await createEvent({ name, code, date, image, reservationLink, whatsappNumber, thumbnail: null, status: 'en_curso', createdAt: Date.now() });
  res.json({ _id: result.id, name, code });
});

app.get('/api/events/:id', async (req,res)=>{
  const eventId = req.params.id;
  const data = await getEventWithLocation(eventId);
  if(!data || !data.event) return res.status(404).json({ error: 'Evento no encontrado' });
  res.json({ event: data.event, location: data.location });
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

    const eventDateMs = new Date(event.date || '').getTime();
    if(!Number.isFinite(eventDateMs)){
      return res.status(400).json({ error: 'El evento no tiene una fecha válida para recibir comentarios' });
    }

    if(eventDateMs >= Date.now()){
      return res.status(400).json({ error: 'Solo se puede comentar cuando el evento ya finalizó' });
    }

    const payload = {
      eventId,
      eventName: event.name || '',
      eventDate: event.date || '',
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
    const reservationLink = req.body.reservationLink || ''
    const whatsappNumber = req.body.whatsappNumber || ''
    const province = req.body.province || ''

    const eventId = 'ev_' + Date.now()
    const event = {
      name,
      code,
      date,
      province, // <-- ensure province is saved
      reservationLink,
      whatsappNumber,
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