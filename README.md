# Mi Vida en Orden

PWA ( Progressive Web App ) personal para organizar **objetivos, hábitos, agenda, finanzas y progreso**. Funciona sin conexión: todos los datos se guardan en el **localStorage de tu navegador**. No hay servidor, no hay cuentas y no hay servicios externos.

- **Interfaz en español**, fechas en formato **DD/MM/AAAA**, moneda en **pesos argentinos (ARS)**.
- Diseño **mobile-first**: navegación inferior en el teléfono y lateral en pantallas grandes.
- Tema **claro / oscuro**.
- Se puede **instalar en Android e iPhone** y usar en modo avión.

---

## Requisitos

- [Node.js](https://nodejs.org) 18 o superior (con `npm`).
- Un navegador moderno (Chrome, Edge, Firefox o Safari).

---

## Instalación y uso local

```bash
npm install        # instala dependencias
npm run dev        # arranca en modo desarrollo → http://localhost:5173
```

Comandos disponibles:

| Comando             | Qué hace                                                        |
| ------------------- | --------------------------------------------------------------- |
| `npm run dev`       | Servidor de desarrollo con recarga automática                   |
| `npm test`          | Ejecuta la suite de pruebas (Vitest)                            |
| `npm run typecheck` | Chequeo de tipos con TypeScript                                 |
| `npm run build`     | Genera iconos + typecheck + build de producción en `dist/`      |
| `npm run preview`   | Sirve el build de producción → http://localhost:4173            |
| `npm run icons`     | Regenera los iconos PNG (`scripts/generate-icons.mjs`)          |

Para ver la app como PWA (con service worker y caché offline) usá `npm run build && npm run preview`.

---

## Qué incluye

- **Inicio**: fecha, saludo, progreso de objetivos, hábitos del día (pendientes/hechos), tareas próximas (se completan desde ahí), resumen mensual de ingresos/gastos/ahorros, objetivos por prioridad y el desafío físico de 60 días.
- **Hábitos**: 10 hábitos sugeridos al primer arranque, alta/baja/edición, frecuencia diaria / días específicos / veces por semana, fecha de inicio, historial con calendario visual, porcentaje semanal y racha. Los hábitos **nunca se marcan solos**.
- **Objetivos**: 25 objetivos sembrados en 6 categorías, **sin fechas ni porcentajes inventados** (todo se configura desde la app), pasos, notas, presupuesto, prioridad, estado, y desafío de 60 días con fecha de inicio elegida por vos.
- **Agenda**: tareas con fecha, hora, duración y categoría (Gimnasio, Trabajo, Reparto de agua, Estudio, Programación, Inglés, Recreación), vistas diaria/semanal, reprogramación y rutina semanal reutilizable sin horarios impuestos.
- **Finanzas**: fuentes de ingreso y categorías de gasto predefinidas, transferencias **excluidas** de los totales, balance mensual, saldo acumulado, desgloses, filtros, comparación entre meses y metas de ahorro (objetivo / ahorrado / restante). Sin datos ficticios.
- **Ajustes**: tema, exportar/importar respaldo JSON con validación y confirmación explícita, y borrado total con confirmación.

---

## Copia de seguridad (exportar / importar)

1. Andá a **Ajustes → Respaldo**.
2. **Exportar** descarga un archivo `.json` con todos tus datos.
3. **Importar** pide ese archivo, lo valida y te pide **confirmación antes de reemplazar** lo que tenés.
4. Un archivo de otra app o corrupto se **rechaza**; si algún registro suelto está dañado, se descarta ese y se conservan los válidos.

> ⚠️ **Los datos viven solo en este navegador.** Si borrás los datos del sitio, usás modo incógnito o cambiás de dispositivo/navegador, se pierden. Exportá un respaldo periódicamente.

---

## Cómo probar que funciona sin conexión (modo avión)

1. `npm run build && npm run preview` (o publicala, ver abajo) y abrila en el teléfono/PC.
2. Esperá a que cargue una vez con internet.
3. Activá **modo avión** (o cortá el Wi-Fi).
4. Recargá la página: la app carga igual desde la caché del service worker.
5. El indicador del encabezado pasa a **"Sin conexión"**.
6. Creá un hábito, tarea o movimiento: se guarda igual (localStorage).
7. Desactivá el modo avión: el indicador vuelve a **"En línea"**.

---

## Publicar en GitHub Pages

El proyecto ya está configurado con `base: './'`, así que funciona en un subdirectorio (por ejemplo `https://tu-usuario.github.io/mi-vida-en-orden/`).

### Opción A: GitHub Actions (automática)

1. Creá un repositorio en GitHub y subí el proyecto:
   ```bash
   git init
   git add .
   git commit -m "Mi Vida en Orden"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/mi-vida-en-orden.git
   git push -u origin main
   ```
2. El workflow incluido (`.github/workflows/deploy.yml`) compila y publica automáticamente en Pages.
3. En GitHub: **Settings → Pages → Source → GitHub Actions**.
4. Cada `git push` a `main` republica la app.

### Opción B: manual

```bash
npm run build
```

Subí el contenido de `dist/` a tu hosting o a la rama `gh-pages` del repositorio.

---

## Instalar en el teléfono

- **Android (Chrome)**: abrí la URL → menú ⋮ → **"Instalar aplicación"** / **"Agregar a pantalla de inicio"**.
- **iPhone (Safari)**: abrí la URL → botón **Compartir** → **"Agregar a pantalla de inicio"**.
- En escritorio (Chrome/Edge): icono de **instalar** en la barra de direcciones.

Queda con ícono propio, pantalla completa (standalone) y funciona offline.

---

## Stack técnico

- React 18 + TypeScript + Vite 6
- `vite-plugin-pwa` (service worker + manifest con Workbox)
- Vitest para pruebas
- Sin backend, sin frameworks de UI, sin dependencias de íconos (los PNG se generan con un script propio)

Estructura resumida:

```
src/
  lib/        # lógica pura: fechas, dinero, hábitos, objetivos, finanzas, storage, backup
  lib/*.test.ts  # pruebas unitarias
  store/      # estado global + persistencia en localStorage
  pages/      # Inicio, Hábitos, Objetivos, Agenda, Finanzas, Ajustes
  components/ # UI compartida e íconos
  styles/     # estilos globales (tema claro/oscuro)
scripts/      # generación de iconos PNG
```

---

## Pruebas

```bash
npm test           # 81 pruebas
npm run typecheck  # sin errores de tipos
npm run build      # build de producción + generación de SW
```

Cubren: formato de fechas DD/MM/AAAA, cálculo de semanas/meses, dinero ARS y parseo de importes con separadores argentinos, rachas y porcentajes de hábitos, prioridades/estados de objetivos, totales de finanzas (con transferencias excluidas), validación de storage y de respaldos.
