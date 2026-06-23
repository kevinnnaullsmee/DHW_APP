# 🧠 MEMORIA DE SESIÓN - DHW APP
> Última actualización: 2026-05-26

---

## 🎨 TEMA VISUAL APROBADO

### Paleta de Colores (DEFINITIVA)
| Rol | Color | Hex |
|-----|-------|-----|
| Principal | Negro | `#000000` |
| Secundario | Rojo | `#FF1E27` |
| Secundario | Cromo | `#D4D4D8` |

### ❌ Colores RECHAZADOS (NO usar)
- **Verde neón** (`#39FF14`) — eliminado
- **Morado/Púrpura** (`#9D00FF`) — eliminado
- Cualquier otro color que no sea Negro, Rojo o Cromo

---

## ✅ CAMBIOS REALIZADOS

### `src/app/globals.css`
- Variables CSS actualizadas al nuevo tema Negro/Rojo/Cromo
- Eliminadas variables de verde neón y morado

### `src/components/BottomNav.tsx`
- Botón de cámara rediseñado: fondo negro, borde rojo, ícono cromo
- El usuario rechazó versiones anteriores — mantener estilo actual

### `src/app/page.tsx` (Mapa)
- Mapa con más detalle (nombres de lugares visibles)
- Búsqueda por nombre de grafitero/pinta → muestra solo esas pintas en el mapa
- Eliminado botón de herramienta de desarrollador (esquina inferior izquierda)
- Colores actualizados al nuevo tema

### `src/app/feed/page.tsx`
- Numeración secuencial de pintas (`#1`, `#2`, etc.) por orden cronológico
- Colores actualizados al nuevo tema

### `src/app/profile/page.tsx`
- Muestra número de pinta correspondiente a cada spot
- Colores actualizados al nuevo tema

### `src/app/register/page.tsx`
- Eliminados gradientes verde/morado
- Nuevo estilo con tema Negro/Rojo/Cromo

### `src/app/login/page.tsx`
- Eliminados gradientes verde/morado
- Nuevo estilo con tema Negro/Rojo/Cromo

### `src/app/stats/page.tsx`
- ⚠️ **PENDIENTE DE REVISIÓN**: El objeto `styleColors` y los componentes de gráficas pueden tener verde/morado residual
- Todos los colores deben cambiarse a Negro, Rojo y Cromo

---

## 🔢 SISTEMA DE NUMERACIÓN DE PINTAS

- Cada graffiti tiene un número automático global (`#1`, `#2`, `#3`...)
- El número se asigna por orden cronológico (`created_at`)
- Es consistente en todas las vistas (mapa, feed, perfil, stats)
- Ejemplo: "Graffiti #42"

---

## 🗺️ FUNCIONALIDADES DEL MAPA

- **Mapa detallado**: nombres de calles, lugares y zonas visibles
- **Búsqueda**: filtra pintas por nombre de grafitero o nombre de pinta
- **Resultados filtrados**: solo muestra en el mapa las pintas que coinciden con la búsqueda
- **Sin botón de dev**: eliminado el botón de herramientas del desarrollador

---

## 🐛 ERRORES CONOCIDOS

### Error de Supabase Auth
```
Invalid Refresh Token: Refresh Token Not Found
```
- **Causa**: Token de sesión expirado o inválido en el cliente
- **Solución aplicada**: Manejo de error para redirigir al login cuando el token es inválido

---

## 🏗️ STACK TECNOLÓGICO

- **Framework**: Next.js (servidor en puerto 3001)
- **Base de datos/Auth**: Supabase
- **Mapa**: `react-map-gl` con `maplibre-gl`
- **Estilos**: Tailwind CSS + variables CSS personalizadas en `globals.css`

---

## ⏭️ TAREAS PENDIENTES

- [ ] Revisar `stats/page.tsx` completamente — eliminar verde/morado del objeto `styleColors` y gráficas
- [ ] Verificar que ningún archivo tenga `var(--color-neon-green)` o `var(--color-neon-purple)`
- [ ] Confirmar que el botón de cámara en `BottomNav.tsx` está aprobado por el usuario
- [ ] Probar búsqueda en el mapa con nombres reales de grafiteros

---

## 👤 PREFERENCIAS DEL USUARIO

- Idioma: Español
- Estilo: Urbano/Graffiti — Oscuro, agresivo, callejero
- El crew usa: **Negro, Rojo y Cromo** como colores principales en sus graffitis
- No le gustan: colores "cyberpunk" o neón que no sean parte del tema
