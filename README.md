# SAIL v1 — Sistema de Asistencia e Incidencias de Laboratorios
# Proyecto creado por:
* Cristhian Yael Castaños Melendrez
* Luis Fernando Espinoza Diaz
* Diego Aaron Mendoza Sanchez
* Ramón Alberto Vázquez Guzmán


## Descripción

**SAIL** es una aplicación web desarrollada con **Next.js 16**, **React 19**, **TypeScript** y **Supabase** para administrar los laboratorios de cómputo de una institución académica. Permite gestionar clases, grupos, periodos escolares, personal, alumnos e incidencias, y registrar la asistencia de los estudiantes mediante **códigos OTP/QR dinámicos** generados para cada laboratorio.

## Objetivo

Digitalizar y centralizar el control de los laboratorios: reemplazar las bitácoras en papel por un sistema que registre de forma confiable quién usa cada laboratorio, cuándo y en qué clase, facilitando la generación de reportes y el seguimiento de incidencias para el personal administrativo y docente.

## Características Principales

* **Autenticación por roles** con NextAuth (administrador / personal, maestros y estudiantes con login separado).
* **Registro de asistencia con códigos OTP** de 7 caracteres (letra del laboratorio + 6 dígitos) generados con `otplib`, mostrados también como **código QR** (`react-qr-code`).
* **Gestión (CRUD)** de alumnos, personal, clases, grupos, laboratorios, periodos, asuetos e incidencias.
* **Panel del maestro** para visualizar sus clases y sesiones.
* **Panel del estudiante** para registrarse, unirse a materias y registrar asistencia.
* **Generación automática de bitácoras** de sesiones por periodo, considerando días de la semana y asuetos.
* **Reportes exportables a Excel** (`xlsx`, `xlsx-js-style`) por periodo.
* **Cambio de contraseña** con hash seguro (`bcryptjs`).
* **Rutas protegidas** mediante middleware.
* **Despliegue con Docker** (Dockerfile multietapa y `docker-compose`).
* Interfaz con **Tailwind CSS 4**, íconos `lucide-react` y notificaciones `sonner`.

## Requisitos para la Instalación

* **Node.js 20** o superior.
* **npm** (o **pnpm**).
* Un proyecto en **Supabase** con las tablas del sistema (p. ej. `Laboratory`, `ClassSession`, etc.).
* *(Opcional)* **Docker** y **Docker Compose** para despliegue en contenedores.

## Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/bilileo/sailv1.git
   cd sailv1
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno** en un archivo `.env.local` (o `.env` para Docker) en la raíz:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
   NEXTAUTH_SECRET=<cadena-secreta-aleatoria>
   NEXTAUTH_URL=http://localhost:3000
   ```

4. **(Opcional) Generar los secretos OTP de los laboratorios:**
   ```bash
   npx tsx scripts/seed_secrets.ts
   ```

5. **Ejecutar en desarrollo:**
   ```bash
   npm run dev
   ```
   Abre [http://localhost:3000](http://localhost:3000).

6. **Compilar para producción:**
   ```bash
   npm run build && npm start
   ```

### Con Docker

```bash
docker compose up -d --build
```

La aplicación quedará disponible en el puerto `3000` usando las variables del archivo `.env`.

## Estructura del Proyecto

```text
sailv1/
├── app/
│   ├── api/                      # Endpoints del backend (API Routes)
│   │   ├── asistencia/           # Registro de asistencia
│   │   ├── asuetos/              # Días no laborables
│   │   ├── auth/[...nextauth]/   # Configuración de NextAuth
│   │   ├── catalogo/             # Catálogo de clases
│   │   ├── clases/               # Clases y sesiones
│   │   ├── cursa/ (join/)        # Inscripción de alumnos a materias
│   │   ├── device-types/         # Tipos de dispositivos
│   │   ├── estudiante/ (login/)  # Alta y login de estudiantes
│   │   ├── generar-bitacora/     # Generación de bitácoras por periodo
│   │   ├── grupos/               # Grupos
│   │   ├── imparte/              # Relación maestro–clase
│   │   ├── incidencias/          # Incidencias
│   │   ├── labSecrets/           # Secretos OTP por laboratorio
│   │   ├── laboratorios/         # Laboratorios
│   │   ├── Llevan/               # Relación alumno–clase
│   │   ├── maestros/             # Maestros
│   │   ├── periodos/             # Periodos escolares
│   │   ├── reportes/ (periodo/)  # Reportes
│   │   └── usuarios/             # Usuarios / personal
│   ├── components/               # Navbar y Perfil
│   ├── estudiante/               # Vistas de estudiante
│   │   ├── dashboard/
│   │   ├── join/
│   │   ├── join-materia/
│   │   ├── login/
│   │   └── register/
│   ├── formulario/
│   │   ├── alta/                 # Formularios de alta (alumnos, clases, grupos, etc.)
│   │   └── edicion/password/     # Cambio de contraseña
│   ├── gestion/                  # Módulos de gestión (alumnos, clases, grupos,
│   │                             # incidencias, laboratorios, periodos, personal, reportes)
│   ├── lib/                      # attendance-types.ts, db.ts, otpLab.ts, supabase.ts
│   ├── login/                    # Login del personal
│   ├── maestro/dashboard/        # Panel del maestro
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                  # Página principal (panel de administración)
├── data/database.json            # Almacenamiento local de códigos activos por laboratorio
├── docs/changes.md               # Registro de cambios
├── public/                       # Recursos estáticos
├── scripts/seed_secrets.ts       # Script para generar secretos OTP
├── services/claseService.ts      # Lógica de servicios de clases
├── utils/calendar.ts             # Utilidades de semanas/fechas del periodo
├── middleware.ts                 # Protección de rutas
├── Dockerfile / docker-compose.yml
├── next.config.ts / tsconfig.json / eslint.config.mjs / postcss.config.mjs
└── package.json
```

## Explicación de los Archivos Principales

* **`app/page.tsx` y `app/layout.tsx`**: Página principal (panel de administración que integra los módulos de gestión) y layout raíz de la aplicación.
* **`app/api/auth/[...nextauth]/route.ts`**: Configura NextAuth: proveedores de credenciales, validación con Supabase y manejo de sesión/roles.
* **`app/api/*/route.ts`**: Endpoints REST (GET/POST/PUT/DELETE) para cada entidad del sistema.
* **`app/api/generar-bitacora/route.ts`**: Genera los registros de bitácora de cada sesión de clase para el rango de fechas de un periodo.
* **`app/api/labSecrets/route.ts`**: Devuelve el secreto OTP y la letra asignada a un laboratorio.
* **`app/lib/supabase.ts`**: Crea y exporta el cliente de Supabase.
* **`app/lib/otpLab.ts`**: Genera el código de asistencia del laboratorio (letra + OTP de 6 dígitos).
* **`app/lib/db.ts`**: Lee/escribe `data/database.json`, donde se guardan los códigos activos por laboratorio con su expiración.
* **`app/lib/attendance-types.ts`**: Tipos de TypeScript para los datos de asistencia.
* **`app/gestion/`**: Componentes de administración (tablas, filtros y acciones) para cada entidad, incluyendo `Reportes.tsx` con exportación a Excel.
* **`app/formulario/alta/`**: Formularios para dar de alta alumnos, asuetos, clases, grupos, incidencias, periodos y personal.
* **`app/formulario/edicion/password/`**: Formulario y *server action* para cambiar la contraseña.
* **`app/maestro/dashboard/`**: Panel del docente y sus *server actions*.
* **`app/estudiante/`**: Registro, login, panel y unión a materias/asistencia de los estudiantes.
* **`app/components/`**: Componentes compartidos (`Navbar`, `Perfil`).
* **`services/claseService.ts`**: Encapsula la lógica de negocio relacionada con las clases.
* **`utils/calendar.ts`**: Calcula número de semana, total de semanas y fechas de una semana dentro de un periodo.
* **`scripts/seed_secrets.ts`**: Asigna secretos OTP a todos los laboratorios registrados en Supabase.
* **`middleware.ts`**: Protege la página principal y las rutas `/api/clases` y `/api/laboratorios`, redirigiendo a `/login` si no hay sesión.
* **`Dockerfile` / `docker-compose.yml`**: Construcción multietapa con Node 20 Alpine y orquestación del contenedor en el puerto 3000.
