# Aves del Odiel — RPG ornitológico
Un juego RPG de pixel art ambientado en las **Marismas del Odiel** (Huelva, España), donde los jugadores exploran, observan y fotografían aves locales.
## 🎮 Características
- **Exploración por zonas**: Recorre diferentes hábitats como el Sendero del Odiel
- **Sistema de encuentro con aves**: Observa y fotografía especies locales
- **Cuaderno de campo**: Registro detallado de aves avistadas
- **Ciclo día/noche**: Sistema de tiempo con fases (Amanecer, Mañana, Tarde, Noche)
- **Modo dual**: Interfaz adaptativa para escritorio y dispositivos táctiles
- **Pixel art retro**: Estética visual inspirada en juegos clásicos
## 🛠️ Tecnologías
- **React 18** con TypeScript
- **Vite** como bundler y servidor de desarrollo
- **TailwindCSS** para estilos
- **Canvas API** para renderizado del juego
- **Framer Motion** para animaciones
- **Lucide React** para iconos
## 🚀 Instalación
```bash
npm install
```
## 🎯 Comandos disponibles
```bash
# Iniciar servidor de desarrollo
npm run dev
# Construir para producción
npm run build
# Verificar tipos TypeScript
npm run typecheck
```
## 🎮 Controles
### Escritorio
- **Clic izquierdo**: Acción principal / Interactuar
- **Teclas**: Navegación por menús y acciones
### Dispositivos táctiles
- **Toque**: Acción principal
- **Interfaz táctil**: Botones virtuales para navegación
## 📁 Estructura del proyecto
```
├── src/
│   ├── components/     # Componentes UI (pantallas, HUD, overlays)
│   ├── game/           # Lógica del juego (engine, mundo, aves, audio)
│   ├── App.tsx         # Componente principal
│   ├── main.tsx        # Punto de entrada
│   └── index.css       # Estilos globales
├── index.html          # HTML base
├── package.json        # Dependencias y scripts
├── tsconfig.json       # Configuración TypeScript
└── vite.config.js      # Configuración Vite
```
## 🐦 Especies de aves
El juego incluye múltiples especies de aves de las Marismas del Odiel, cada una con:
- Comportamientos únicos
- Horarios de actividad específicos
- Información educativa en el cuaderno de campo
## 🌍 Ambientación
Las **Marismas del Odiel** son un espacio natural protegido en la provincia de Huelva, conocido por su rica biodiversidad de aves acuáticas y migratorias. Este juego rinde homenaje a este ecosistema único.
## 📝 Licencia
Proyecto educativo/desarrollo personal.
---
**¡Disfruta de la observación de aves en las Marismas del Odiel!** 🦅🦩🦆
