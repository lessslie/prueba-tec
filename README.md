# RataLibre - Prueba Tecnica

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
- `JWT_SECRET`
- `JWT_EXPIRES_IN` (ej: `1d`, `1h`, `1min`)
- `OPENAI_API_KEY`
- **No usar** `MELI_ACCESS_TOKEN` en prod para evitar monousuario forzado.

### Frontend (`frontend/`)
- `NEXT_PUBLIC_API_BASE` (URL del backend, sin slash final)

## Correr local
1) Backend: `cd backend && npm install && npm run start:dev`
2) Frontend: `cd frontend && npm install && npm run dev`
3) Abrir `http://localhost:3000/login` y usar el botón “Conectar Mercado Libre” (OAuth) desde el dashboard.

## Auth
- Las pantallas de login y registro estan en `/login` y `/register`.
- El dashboard requiere sesion activa (JWT); cuando el token expira, se cierra sesion automaticamente y aparece un modal de aviso.

## Flujo principal
1) **Conectar Mercado Libre**: OAuth desde el botón. Tokens se guardan solo en backend. Estado: `GET /meli/status`.
2) **Crear o importar**:
   - Manual: el **Item ID se deja vacío** (ML lo genera). Elegir categoría en cascada; si ML bloquea subcategorías (403 PolicyAgent), usar el campo de **ID manual (hoja)**.
   - Celulares (MLA1055) ya incluyen atributos mínimos (COLOR, IS_DUAL_SIM, CARRIER + BRAND/MODEL). Si otra categoría pide más atributos, el error 400 indica cuáles y se deben enviar.
   - Imágenes: URLs públicas directas (jpg/png). ML puede tardar unos minutos en procesarlas.
   - ML puede dejar la publicación en `paused` para cuentas nuevas/test; activarla desde ML.
   - Importar: pegar item/product ID o URL completa. Si 401/403, reconectar ML.
3) **Mis publicaciones ML**: botón “Cargar mis publicaciones” usa `/meli/me` y `/meli/my-items`; se pueden importar desde el selector.
4) **Analizar publicación**: usa OpenAI y guarda el análisis.
5) Swagger en backend: `/api/docs`.

## Notas
- App monousuario (token ML en servidor). Multiusuario requiere auth + owner_id en tablas.
- Tokens/secretos solo en variables de entorno (no commitear).
