# Eventos Traslados - Proyecto completo

Estructura:
- backend/ (Node.js + Express + MongoDB + Socket.io)
- frontend/ (React + Vite + Google Maps)

Requisitos:
- Node.js 18+
- MongoDB running (local o Atlas)
- Google Maps JavaScript API key (enable Maps JavaScript API)

Setup backend:
1. cd backend
2. cp .env.example .env -> ajustar MONGODB_URI y PORT
3. npm install
4. npm run dev

Setup frontend:
1. cd frontend
2. npm install
3. Crear un archivo .env local con REACT_APP_GOOGLE_MAPS_KEY y REACT_APP_API_URL
4. npm run start

Uso básico:
- Ingresar como chofer con usuario: chofer1 / 1234
- Crear / conectar un evento con código en el login. Esto devuelve un link /evento/{id} para compartir con clientes.
- En el panel del chofer presionar "Llegué al punto de encuentro"; se captura ubicación y se guarda.
- Los clientes abren /evento/{id} y ven el mapa y el estado. También pueden usar "Cómo llegar".

Deploy sugerido:
- Backend: Render, Heroku, Railway o cualquier servicio que soporte Node.js. Asegurar variables de entorno y MongoDB.
- Frontend: Vercel o Netlify. Configurar REACT_APP_API_URL y la API key en variables de entorno.

Notas de seguridad:
- Este proyecto es demo. No usar contraseñas en texto plano ni claves sin protección en producción.

