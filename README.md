# RataLibre – Prueba Técnica

Backend Nest + Frontend Next para importar publicaciones de Mercado Libre, persistirlas en Postgres y analizarlas con OpenAI.

## Deploy público
- Frontend: `https://prueba-tec-nu.vercel.app`
- Backend: `https://prueba-tec-rmp9.onrender.com`

## Variables de entorno
### Backend (`backend/`)
- `DATABASE_URL` (Postgres/Supabase)
- `MELI_CLIENT_ID`, `MELI_CLIENT_SECRET`
- `MELI_REDIRECT_URI` (ej: `https://<backend>/meli/callback`)
- `FRONTEND_URL` (ej: `https://<frontend>`)
- `FRONTEND_ORIGIN` (coma separados; ej: `https://<frontend>,http://localhost:3000`)
- `OPENAI_API_KEY`
- **No usar** `MELI_ACCESS_TOKEN` en prod para evitar monousuario forzado.

### Frontend (`frontend/`)
- `NEXT_PUBLIC_API_BASE` (URL del backend, sin slash final)

## Correr local
1) Backend: `cd backend && npm install && npm run start:dev`
2) Frontend: `cd frontend && npm install && npm run dev`
3) Abrir `http://localhost:3000` y usar el botón “Conectar Mercado Libre” (OAuth).

## Flujo
1) Conectar Mercado Libre (OAuth). El token se guarda solo en backend.
2) Importar publicación por item/product ID o crearla manualmente.
3) Listar/editar/eliminar publicaciones.
4) Botón “Analizar publicación” → LLM devuelve recomendaciones (título, descripción, oportunidades, riesgos).
5) Swagger en backend: `/api/docs`.

## Notas
- App monousuario (token ML en servidor). Multiusuario requiere auth + owner_id en tablas.
- Tokens/secretos solo en variables de entorno (no commitear).
