# 13/07/2026

## Cambios realizados primera versión

### Carpeta `app/student`
La carpeta "student" originalmente solo tenía el Dashboard por un problema de lógica al crear el sistema inicialmente. <br>
Actualmente se separaron las rutas `login`, `join` y `register` de la carpeta **`app/maestro/`** debido a que estas rutas hacian alusión a funciones que utilizan los alumnos, mientras que la carpeta de "maestro" estaba pensada para funciones que solo los maestros o personal acádemico pudiese acceder (Como el dashboard de monitorización de asistencia)

#### Desglose de las rutes dentro de `app/student`
* **`login`**: Es la ventana de inicio de sesión para los alumnos, donde colocan su correo y contraseña
* **`join`**: Es la ventana de "unirse a una clase", donde se coloca el código que proyecte el profesor para la clase.
* **`register`**: Es la ventana de unión a una clase, donde colocan la información de su asistencia (**Dispositivo en uso, lugar donde se sentó, observaciones, etc.**)
* **`dashboard`**: Es la ventana principal de un alumno después de un login, la cual incluye un resumen de sus asistencias y un botón para entrar a la ventana de `join`.

## Cambios contemplados a realizar
### Agrupar archivos por acciones
Este cambio se basa en tomar todos los archivos `.tsx` que están sueltos dentro de la carpeta `app/` para agruparlos dentro de archivos que describan sus opciones, no se si esto afecte en la funcionalidad que tiene el sistema de pestañas que no se recargan, pero lo dudo. <br>
Los archivos se deben separar por acciones o su función que desempeñan en el sistema, por ejemplo, actualmente todos las funciones que hay en las pestañas son para gestión, por lo tanto todas se guardarían dentro de una carpeta `Gestion` y subcarpetas para cada gestión: `GestionAlumnos`, `GestionClases`, `GestionIncidencias`, `GestionPeriodos`, `GestionPersonal`, `GestionReportes`, etc. 
```text
sailv1/
├── app/
│   ├── gestion/             # Componentes de UI principales
│   │   ├── GestionAlumnos/
│   │   ├── GestionClases/
│   │   ├── GestionIncidencias/
│   │   ├── GestionPeriodos/
│   │   ├── GestionPersonal/
│   │   └── GestionReportes/
│   ├── formulario/
│   │   ├── alta/
│   │   │   └── SesionesClase/
│   │   └── edicion/
│   │   │   └── SesionesClaseEdit/
│   ├── maestro/             # Rutas exclusivas para docentes
│   │   └── dashboard/
│   ├── student/             # Rutas exclusivas para alumnos
│   │   ├── dashboard/
│   │   ├── join/
│   │   ├── login/
│   │   └── register/
│   ├── login/               # Inicio de sesión general
│   ├── FormularioClase.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx             # La página principal para el personal acádemico y que en lo personal necesita una refactorización muy fuerte ya que es demasiado largo
├── data/
│   └── database.json        # json dinamico que alterna y guarda los códigos para ingresar asistencia
└── docs/                    # ruta de archivos para documentación (tanto secciones que se agregaran al GitHub como un historial de versiones más detallado)
```
