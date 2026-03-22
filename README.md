# Eventos Traslados - Proyecto completo

Estructura:
- backend/ (Node.js + Express; Firebase admin optional; local fallback lowdb)
- frontend/ (React + Vite + Google Maps or OSM fallback)

Requisitos:
- Node.js 18+ y npm (solo para desarrollo local) o Docker
- Cuenta en GitHub, Vercel y Render (si vas a usar deploy automático)

1) Subir a GitHub
- git remote add origin https://github.com/37-3742/Traslados.git
- git push -u origin main

2) Configurar Vercel (frontend)
- Crear proyecto en Vercel e importar este repo
- Variables de entorno en Vercel (Project Settings -> Environment Variables):
  - VITE_API_URL = https://<BACKEND_URL>
  - VITE_GOOGLE_MAPS_KEY (opcional)
  - VITE_FIREBASE_* (opcional)
- El workflow de GitHub Actions ya contiene un paso para desplegar a Vercel usando un token. Para usarlo, añadir los secrets:
  - VERCEL_TOKEN
  - VERCEL_ORG_ID
  - VERCEL_PROJECT_ID

3) Configurar Render (backend)
- Importar repo en Render o usar render.yaml
- Añadir environment variables (Environment -> Environment Variables):
  - JWT_SECRET
  - Si usás Firebase: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY (reemplaza saltos de línea por \n), FIREBASE_DATABASE_URL
- Opcional: crear un service for backend y uno for frontend como está en render.yaml
- Para el GitHub Action que dispara Render, añadir secrets en GitHub:
  - RENDER_API_KEY
  - RENDER_SERVICE_ID

4) GitHub Actions
- Archivo .github/workflows/deploy.yml: construye frontend, despliega a Vercel y gatilla deploy en Render
- Añadir secrets mencionados arriba en GitHub

5) Notas sobre persistencia
- Si no configuras Firebase, el backend usa lowdb (archivo localdb.json). Esto funciona localmente, pero no es persistente en deploys en contenedores. Para producción, usar Firebase/managed DB.

6) Probar localmente
- Backend: cd backend && npm install && npm run dev
- Frontend: cd frontend && npm install && npm start

Automatic start scripts

- start.sh (root) : instala dependencias si faltan y arranca backend/frontend en segundo plano. Logs: backend/backend.log y frontend/frontend.log

- backend/start-backend.sh : instala deps si faltan y arranca backend (dev)

- frontend/start-frontend.sh : instala deps si faltan y arranca frontend (dev)

Usage examples:
- From repo root:
  chmod +x start.sh
  ./start.sh

- Start only backend:
  cd backend
  chmod +x start-backend.sh
  ./start-backend.sh

- Start only frontend:
  cd frontend
  chmod +x start-frontend.sh
  ./start-frontend.sh

