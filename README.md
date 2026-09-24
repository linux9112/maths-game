# 🧮 Math Calculation Practice & Games App

A modern, fast, offline-first, and responsive web application designed for mastering mental arithmetic, multiplication tables, and speed calculation through gamified practice.

![Math App Preview](public/pwa-512x512.png)

---

## ✨ Features

### 1. ✖️ Multiplication Table Mastery & Practice
- **Comprehensive Ranges**: Presets for 1–10, 1–20, 1–30, 1–43, 1–50, 1–100, custom table ranges, and multi-table selection.
- **Configurable Multipliers**: Multiplier ranges from ×1–×10 up to ×1–×20 or custom.
- **Learn & Memorize Mode**: Ordered flashcards with adjustable review timers (10s, 20s, 30s, 60s, or untimed).
- **Mode A (Multiple Choice)**: High-quality plausible distractor generator (no obvious last-digit or magnitude giveaways).
- **Mode B (Direct Typing)**: High-speed typing practice with instant validation and smart keyboard handling.

### 2. ➕ Operations & Multi-Level Arithmetic Engine
- **Operations Supported**: Addition (`+`), Subtraction (`−`), Multiplication (`×`), and Division (`÷`) with exact integer division defaults.
- **Multi-Level Difficulty**: Progressively scales from single-digit basics to multi-digit regrouping (up to 4-digit arithmetic).
- **Mixed Operation Mode**: Test flexibility across all four operations simultaneously.

### 3. 🎮 16+ Gamified Practice Modes
Organized into 5 categories for progressive skill-building:
- **⚡ Speed**: *60-Second Rush*, *Rocket Game*, *Operation Switch*, *Closest Answer*
- **🛡️ Survival**: *Survival Mode (3 Lives)*, *Calculation Runner*, *Bomb Defusal*
- **⚔️ Battles & Challenges**: *Table Battle*, *Boss Battle (HP & combat mechanics)*, *Daily Challenge*
- **🧠 Memory & Reasoning**: *Memory Calculation*, *Number Target*, *Find the Mistake*, *Bigger or Smaller*, *Quick Compare*
- **🧱 Arcade**: *Rain Calculation (falling math questions)*, *Table Breaker*

### 4. 📊 Analytics, Progression & Adaptive Learning
- **Adaptive Practice**: Prioritizes your weakest calculations and mistake history automatically.
- **Daily Challenge**: Deterministically generated daily question sets seeded by date.
- **Interactive Heatmap**: Visual table mastery grid from 1×1 to 10×10.
- **RPG Progression**: Earn XP, rank up badges, unlock achievements, and maintain daily streaks.

### 5. 📱 Fully Responsive & Mobile-Optimized
- Custom viewport handling ensures virtual keyboards never obscure active questions or input fields.
- Smooth layouts across small phones (320px), large phones (430px), tablets (768px), laptops (1024px+), and ultrawide desktops (1920px).
- Full desktop keyboard controls (`Enter`, `Esc`, number keys).

### 6. 🔌 Offline-First & Sound
- **100% Offline Capable**: Progressive Web App (PWA) with Service Worker and IndexedDB (via Dexie) + LocalStorage.
- **Zero Heavy Sound Files**: Dynamic synthesized sound effects powered by the Web Audio API.

---

## 🛠️ Tech Stack

- **Framework**: [React 18](https://react.dev/) + [TypeScript 5](https://www.typescriptlang.org/)
- **Build Tool**: [Vite 5](https://vitejs.dev/) + [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)
- **Styling**: [Tailwind CSS 3](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Audio**: Web Audio API Synthesizer
- **Storage**: IndexedDB ([Dexie.js](https://dexie.com/))
- **Animations**: [Canvas Confetti](https://www.npmjs.com/package/canvas-confetti)
- **Testing**: [Vitest](https://vitest.dev/) + React Testing Library (420+ automated tests)

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/) / [pnpm](https://pnpm.io/)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/linux9112/maths-game.git
   cd maths-game
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

4. **Run tests:**
   ```bash
   npm test
   ```

5. **Build for production:**
   ```bash
   npm run build
   ```

6. **Preview production build:**
   ```bash
   npm run preview
   ```

---

## 📂 Project Structure

```
├── public/                 # PWA icons and web manifest assets
├── src/
│   ├── app/                # Root Application & VisualViewportWrapper
│   ├── components/         # Shared UI components (Header, Footer, Confetti)
│   ├── features/
│   │   ├── daily/          # Daily challenge system
│   │   ├── dashboard/      # Metrics, Mastery Heatmap, Weakness Watchlist
│   │   ├── games/          # 16+ arcade and survival games
│   │   ├── operations/     # Multi-level arithmetic practice engine
│   │   └── tables/         # Multiplication table learn & practice modes
│   ├── services/           # IndexedDB / LocalStorage database & persistence
│   ├── sounds/             # Web Audio API sound synthesis engine
│   └── types/              # TypeScript definitions & data contracts
├── vite.config.ts          # Vite & PWA configuration
└── tailwind.config.js      # Responsive styling configuration
```

---

## 📄 License

MIT License. Feel free to use, modify, and build upon this project!
