<div align="center">

```
 __  __      _ _____           _       _     _
|  \/  | ___| |_   _|         (_)     | |   | |
| \  / |/ _ \ | | |  _ __  ___ _  __ _| |__ | |_ ___
| |\/| |  __/ | | | | '_ \/ __| |/ _` | '_ \| __/ __|
| |  | |  __/ |_| |_| | | \__ \ | (_| | | | | |_\__ \
|_|  |_|\___|_|\___/|_| |_|___/_|\__, |_| |_|\__|___/
                                  __/ |
                                 |___/
```

**📊 Inteligencia de negocio para tus publicaciones de Mercado Libre**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com/)

[🚀 Ver Demo](https://prueba-tec-nu.vercel.app) • [📚 API Docs](https://prueba-tec-rmp9.onrender.com/api/docs)

</div>

---

## 🎯 ¿Qué es MeliInsights?

**MeliInsights** es una plataforma fullstack que te ayuda a optimizar tus ventas en Mercado Libre mediante análisis inteligente impulsado por IA. Conecta tu cuenta de ML, importa tus publicaciones, y obtén recomendaciones personalizadas para mejorar títulos, descripciones, precios y más.

### ✨ Features Principales

- 🔐 **Autenticación OAuth2** - Conexión segura con tu cuenta de Mercado Libre
- 📥 **Importación Automática** - Sincroniza tus publicaciones existentes en segundos
- 🤖 **Análisis con IA** - OpenAI analiza y sugiere mejoras para cada publicación
- 📝 **Editor Integrado** - Edita títulos, precios, stock y descripciones
- ⏸️ **Gestión de Estado** - Pausa y reactiva publicaciones desde la app
- 🎨 **UI Moderna** - Interfaz responsive y profesional con Next.js 16
- 📊 **Dashboard Intuitivo** - Visualiza todas tus publicaciones en un solo lugar
- 🔄 **Sincronización Bidireccional** - Cambios reflejados en Mercado Libre

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **UI**: CSS Modules + Tailwind-like custom styles
- **State Management**: React Hooks
- **HTTP Client**: Fetch API
- **Deploy**: Vercel

### Backend
- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL (Supabase)
- **ORM**: TypeORM
- **Authentication**: Passport.js + JWT
- **API Integration**:
  - Mercado Libre API (OAuth2)
  - OpenAI API (GPT-4)
- **Documentation**: Swagger/OpenAPI
- **Deploy**: Render

### DevOps & Tools
- **Version Control**: Git & GitHub
- **Package Manager**: npm
- **Code Quality**: ESLint + TypeScript strict mode
- **Environment**: Node.js 18+

---

## 📸 Screenshots & Demo

### 🎥 Video Demo

[![Watch Demo](https://img.shields.io/badge/▶️-Watch_Full_Demo-red?style=for-the-badge)](https://res.cloudinary.com/dlyty4dz4/video/upload/v1766938509/bandicam_2025-12-28_13-06-59-363_kfveet.mp4)

<details>
<summary>📷 Ver Screenshots</summary>

### Landing Page
![Landing Page](docs/screenshots/landing.png)

### Dashboard con Publicaciones
![Dashboard](docs/screenshots/dashboard.png)

### Análisis de IA
![AI Analysis](docs/screenshots/ai-analysis.png)

### Formulario de Login
![Login](docs/screenshots/login.png)

### Formulario de Registro
![Register](docs/screenshots/register.png)

### Crear Publicación Manual
![Create Publication](docs/screenshots/create-publication.png)

</details>

---

## 🚀 Demo en Vivo

- **Frontend**: [https://prueba-tec-nu.vercel.app](https://prueba-tec-nu.vercel.app)
- **API Backend**: [https://prueba-tec-rmp9.onrender.com](https://prueba-tec-rmp9.onrender.com)
- **Swagger Docs**: [https://prueba-tec-rmp9.onrender.com/api/docs](https://prueba-tec-rmp9.onrender.com/api/docs)

---

## 🏃‍♂️ Instalación y Desarrollo Local

### Prerequisitos

- Node.js 18+ y npm
- PostgreSQL (o cuenta de Supabase)
- Cuenta de desarrollador de Mercado Libre
- API Key de OpenAI

### 1. Clonar el Repositorio

```bash
git clone https://github.com/lessslie/prueba-tec.git
cd meli-insights
```

### 2. Configurar Backend

```bash
cd backend
npm install
```

Crear archivo `.env` basado en `.env.example`:

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Mercado Libre OAuth
MELI_CLIENT_ID=tu_client_id
MELI_CLIENT_SECRET=tu_client_secret
MELI_REDIRECT_URI=http://localhost:10000/meli/callback

# Frontend URLs (CORS)
FRONTEND_URL=http://localhost:3000
FRONTEND_ORIGIN=http://localhost:3000,https://tu-dominio.com

# JWT
JWT_SECRET=tu_secreto_super_seguro
JWT_EXPIRES_IN=7d

# OpenAI
OPENAI_API_KEY=sk-...
```

Iniciar backend en modo desarrollo:

```bash
npm run start:dev
```

El backend estará en `http://localhost:10000`

### 3. Configurar Frontend

```bash
cd frontend
npm install
```

Crear archivo `.env.local`:

```env
NEXT_PUBLIC_API_BASE=http://localhost:10000
```

Iniciar frontend:

```bash
npm run dev
```

El frontend estará en `http://localhost:3000`

### 4. Primer Uso

1. Abre `http://localhost:3000/register` y crea una cuenta
2. Inicia sesión en `http://localhost:3000/login`
3. Conecta tu cuenta de Mercado Libre con el botón OAuth
4. ¡Comienza a importar y analizar tus publicaciones!

---

## 📖 ¿Cómo Funciona?

### Flujo de Autenticación
```
Usuario → Login/Registro → JWT Token → Dashboard
                                      ↓
                              OAuth ML → Tokens guardados
```

### Flujo de Análisis
```
Seleccionar Publicación → Click "Analizar"
                              ↓
                    OpenAI GPT-4 procesa:
                    - Título
                    - Descripción
                    - Precio
                    - Categoría
                              ↓
                    Recomendaciones guardadas en DB
                              ↓
                    Mostrar sugerencias al usuario
```

### Arquitectura

```
┌─────────────────┐
│   Next.js App   │  ← Usuario
│   (Frontend)    │
└────────┬────────┘
         │ REST API
         ↓
┌─────────────────┐
│   NestJS API    │
│   (Backend)     │
└────┬───┬───┬────┘
     │   │   │
     ↓   ↓   ↓
  ┌──┐ ┌──┐ ┌────┐
  │PG│ │ML│ │ AI │
  └──┘ └──┘ └────┘
```

---

## 🔑 Variables de Entorno

### Backend (`backend/.env`)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | Connection string de PostgreSQL | `postgresql://...` |
| `MELI_CLIENT_ID` | Client ID de Mercado Libre | `123456789` |
| `MELI_CLIENT_SECRET` | Secret de ML | `abc123...` |
| `MELI_REDIRECT_URI` | Callback OAuth | `http://localhost:10000/meli/callback` |
| `FRONTEND_URL` | URL principal del frontend | `http://localhost:3000` |
| `FRONTEND_ORIGIN` | Orígenes permitidos (CORS) | `http://localhost:3000,https://...` |
| `JWT_SECRET` | Secret para firmar JWTs | `mi_secreto_seguro` |
| `JWT_EXPIRES_IN` | Duración del token | `7d`, `24h`, `60m` |
| `OPENAI_API_KEY` | API Key de OpenAI | `sk-...` |

### Frontend (`frontend/.env.local`)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_BASE` | URL del backend (sin `/` final) | `http://localhost:10000` |

---

## 📚 API Endpoints Principales

### Auth
- `POST /auth/register` - Crear cuenta
- `POST /auth/login` - Iniciar sesión

### Mercado Libre
- `GET /meli/auth` - Iniciar OAuth
- `GET /meli/callback` - Callback OAuth
- `GET /meli/status` - Estado de conexión
- `GET /meli/my-items` - Mis publicaciones en ML

### Publicaciones
- `GET /publications` - Listar publicaciones
- `POST /publications` - Crear publicación
- `GET /publications/:id` - Ver detalle
- `PATCH /publications/:id` - Actualizar
- `POST /publications/:id/pause` - Pausar
- `POST /publications/:id/activate` - Activar

### Análisis
- `POST /analysis/publications/:id` - Analizar con IA
- `GET /analysis/publications/:id` - Ver análisis guardado

**Documentación completa**: Ver Swagger en `/api/docs`

---

## 🎨 Features Destacadas

### 1. Análisis Inteligente con GPT-4
Utiliza prompts especializados para generar recomendaciones contextuales basadas en:
- Categoría del producto
- Competencia en el mercado
- Mejores prácticas de copywriting
- Optimización SEO para Mercado Libre

### 2. Gestión de Estado Avanzada
- Pausa publicaciones directamente desde la app
- Edita mientras están pausadas
- Reactiva con un click
- Sincronización automática con ML

### 3. Seguridad
- Autenticación JWT con expiración configurable
- Tokens de ML nunca expuestos al frontend
- CORS configurado correctamente
- Passwords hasheados con bcrypt

### 4. Experiencia de Usuario
- Loading states en todas las operaciones
- Mensajes de error claros
- Confirmaciones para acciones destructivas
- UI responsive mobile-first

---

## 🚧 Roadmap

### Próximas Features
- [ ] Dashboard con métricas y gráficos
- [ ] Análisis batch de múltiples publicaciones
- [ ] Exportar reportes a PDF/Excel
- [ ] Notificaciones por email
- [ ] Modo oscuro
- [ ] Tests unitarios y E2E
- [ ] Caché con Redis
- [ ] WebSockets para actualizaciones en tiempo real

---

## 🤝 Contribuir

Este es un proyecto de portfolio personal, pero si encontrás algún bug o tenés sugerencias:

1. Abrí un [Issue](https://github.com/lessslie/prueba-tec/issues)
2. Hacé un Fork del proyecto
3. Creá una rama: `git checkout -b feature/AmazingFeature`
4. Commit: `git commit -m 'Add some AmazingFeature'`
5. Push: `git push origin feature/AmazingFeature`
6. Abrí un Pull Request

---

## 👨‍💻 Desarrollador

**Agata Morales**

- Portfolio: [portfolio-agata.vercel.app](https://portfolio-agata.vercel.app/)
- LinkedIn: [linkedin.com/in/agata-morales](https://www.linkedin.com/in/agata-morales/)
- GitHub: [@lessslie](https://github.com/lessslie)
- Email: agata.morales92@gmail.com

---

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

---

## 🙏 Agradecimientos

- [Mercado Libre Developers](https://developers.mercadolibre.com/) - Por su excelente API y documentación
- [OpenAI](https://openai.com/) - Por hacer posible el análisis inteligente
- [Vercel](https://vercel.com/) - Por el hosting del frontend
- [Render](https://render.com/) - Por el hosting del backend
- [Supabase](https://supabase.com/) - Por la base de datos PostgreSQL

---

<div align="center">

**⭐ Si te gustó este proyecto, dejá una estrella en GitHub!**

Hecho con ❤️ y 🧉 por [Agata Morales]

</div>
