# Backend - Eventos Traslados

Steps to run backend:

1. Copy .env.example to .env and set MONGODB_URI and PORT if needed.
2. Install dependencies: npm install
3. Run: npm run dev (requires nodemon) or npm start

API endpoints:
- POST /api/events  { name, code } -> create event
- GET /api/events/:id -> get event and latest location
- POST /api/driver/login { username, password } -> login driver
- POST /api/driver/:id/arrived { eventId, lat, lng } -> save arrival location
- POST /api/driver/:id/update { eventId, lat, lng } -> save periodic location

Real-time: Socket.io emits 'locationUpdate' to room eventId when driver posts location.
