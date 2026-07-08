---

# Sistema de Gestión de Laboratorios y Asistencia (SAIL)

## Descripción

Este proyecto es un sistema de gestión escolar diseñado específicamente para administrar laboratorios, controlar el catálogo de clases, registrar las asistencias de los estudiantes y gestionar incidencias. La plataforma está construida utilizando el framework Next.js e integra Supabase para el manejo de base de datos.

## Características Principales

* **Paneles de Control por Rol:** Accesos y vistas (dashboards) dedicados e independientes para perfiles de administrador, maestro, auxiliar y estudiante (student).


* **Control de Asistencia:** Módulo dedicado para el registro de asistencias diarias a los laboratorios.


* **Gestión Administrativa:** Interfaces para la administración de alumnos, catálogo de clases, laboratorios y asignación de materias (imparte/cursa).


* **Sistema de Incidencias:** Funcionalidad para reportar y dar seguimiento a incidencias dentro de los laboratorios.


* **Autenticación Segura:** Sistema de login y registro gestionado mediante NextAuth.


* **Generación de Reportes:** Módulos de interfaz de usuario y API para la consulta y creación de reportes.



## Requisitos Previos

Para poder ejecutar este proyecto en tu entorno local, asegúrate de contar con lo siguiente:

* **Node.js** (Versión 18 o superior recomendada para Next.js).
* Un gestor de paquetes como **npm**, **yarn** o **pnpm**.
* Una cuenta y proyecto configurado en **Supabase** (requerido por `app/lib/supabase.ts`).



## Modo de Uso

1. **Clonar el repositorio:**
```bash
git clone <https://github.com/bilileo/sailv1.git>
cd sailv1

```


2. **Instalar las dependencias:**
```bash
npm install

```


3. **Configurar las variables de entorno:**
Crea un archivo `.env` o `.env.local` en la raíz del proyecto. Deberás incluir las credenciales necesarias para la base de datos y la autenticación (Supabase URL, Supabase Anon Key y NextAuth Secret).
4. **Ejecutar el servidor de desarrollo:**
```bash
npm run dev

```


Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver la aplicación.

## Estructura del Proyecto

A continuación se muestra la arquitectura general del código fuente:

```text
sailv1/
├── app/
│   ├── api/                 # Endpoints del backend
│   │   ├── asistencia/
│   │   ├── auth/
│   │   ├── catalogo/
│   │   ├── clases/
│   │   ├── estudiante/
│   │   ├── imparte/
│   │   ├── incidencias/
│   │   ├── laboratorios/
│   │   ├── maestros/
│   │   ├── reportes/
│   │   └── usuarios/
│   ├── lib/                 # Utilidades y configuración
│   │   ├── attendance-types.ts
│   │   ├── db.ts
│   │   └── supabase.ts
│   ├── maestro/             # Rutas exclusivas para docentes
│   │   ├── dashboard/
│   │   ├── join/
│   │   ├── login/
│   │   └── register/
│   ├── student/             # Rutas exclusivas para alumnos
│   │   └── dashboard/
│   ├── login/               # Inicio de sesión general
│   ├── Alumnos.tsx          # Componentes de UI principales
│   ├── CatalogoClases.tsx
│   ├── FormularioClase.tsx
│   ├── GestionIncidencias.tsx
│   ├── GestionUsuarios.tsx
│   ├── Reportes.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── data/
│   └── database.json        # json dinamico que alterna y guarda los códigos para ingresar asistencia
├── public/                  # Recursos estáticos (imágenes/iconos)
├── services/
│   └── claseService.ts      # Lógica de servicios
├── middleware.ts            # Middleware de Next.js
├── next.config.ts           # Configuración del framework
├── package.json             # Dependencias y scripts
└── tsconfig.json            # Configuración de TypeScript

```

## Desglose de Archivos Principales

* **`app/api/`**: Contiene la lógica del lado del servidor (API Routes) con endpoints separados y organizados para manejar operaciones CRUD de asistencias, catálogos, clases, incidencias, laboratorios, maestros, estudiantes y reportes.


* **`app/api/auth/[...nextauth]/route.ts`**: Archivo central para la configuración de NextAuth, el cual maneja la sesión y autenticación de los usuarios del sistema.


* **`app/lib/supabase.ts` y `app/lib/db.ts**`: Establecen y exportan la conexión a la base de datos y la instancia del cliente de Supabase para ser consumidos por el resto de la aplicación.


* **`app/lib/attendance-types.ts`**: Define las interfaces y tipos de TypeScript específicos para estandarizar el manejo de datos de asistencia en la aplicación.


* **`app/maestro/` y `app/student/**`: Separan la interfaz de usuario dependiendo del rol; incluyen sus propias rutas para los paneles de control (`dashboard`), así como el registro o unión a clases (`register`, `join`).


* **Componentes raíz (`app/Alumnos.tsx`, `app/CatalogoClases.tsx`, `app/FormularioClase.tsx`, etc.)**: Son las vistas e interfaces principales donde el administrador o docente interactúa con las distintas entidades del sistema.


* **`services/claseService.ts`**: Encapsula la lógica de negocio y las llamadas a la base de datos/API relacionadas específicamente con la gestión de las clases.


* **`middleware.ts`**: Archivo de Next.js utilizado para interceptar solicitudes, lo que permite proteger rutas privadas y redirigir usuarios no autenticados.


* **`data/database.json`**: Probablemente almacene información de configuración inicial, esquemas mockeados o datos "semilla" para el entorno de desarrollo.
