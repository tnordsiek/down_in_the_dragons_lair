/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Named dungeon ramps are ADDITIVE — Tailwind's default stone/amber/etc.
      // stay available so existing (test-locked) anchor tokens keep resolving.
      colors: {
        // Cavern obsidian → stone. Page background = obsidian-900 (matches old #171713).
        obsidian: {
          950: '#0d0d0b',
          900: '#171713',
          800: '#1f1e19',
          700: '#2a2823',
          600: '#3a372f',
          500: '#4d4940',
        },
        // Torch accent: gold → amber → ember. Primary interactive accent.
        torch: {
          50: '#fdf6e3',
          200: '#f6dd9a',
          300: '#f2c45a',
          400: '#e0a534',
          500: '#c4842a',
          600: '#9a6420',
        },
        // Parchment: scroll/treasure surfaces + high-contrast text on dark.
        parchment: {
          50: '#f7f0df',
          100: '#ece1c4',
          200: '#d8c79e',
          800: '#3c3526',
        },
        // Blood: damage / danger / destructive.
        blood: {
          200: '#f3b3ab',
          500: '#b22b22',
          600: '#962017',
          900: '#3a100c',
        },
        // Jade: success / victory.
        jade: {
          200: '#9fe3c0',
          400: '#43b581',
          600: '#1f7a52',
          900: '#0e2c20',
        },
        // Arcane: spells.
        arcane: {
          200: '#cdb8f5',
          400: '#9b6ff0',
          600: '#6b3fc4',
        },
        // Portal: teleport / rare.
        portal: {
          200: '#a9e0ef',
          400: '#43b7d6',
          600: '#1f7f99',
        },
      },
      fontFamily: {
        display: ['"Cinzel"', 'Georgia', 'Cambria', 'serif'],
        body: ['"EB Garamond"', 'Georgia', 'serif'],
      },
      boxShadow: {
        // Forged-metal bevel: light top edge, dark bottom edge, soft drop.
        forged:
          'inset 0 1px 0 0 rgba(247,240,223,0.10), inset 0 -2px 3px 0 rgba(0,0,0,0.55), 0 2px 6px rgba(0,0,0,0.5)',
        // Carved inset well (inputs / recessed surfaces).
        carve:
          'inset 0 2px 4px 0 rgba(0,0,0,0.65), inset 0 -1px 0 0 rgba(247,240,223,0.05)',
        // Torch glow (focus rings, active accents).
        'torch-glow':
          '0 0 0 2px rgba(242,196,90,0.55), 0 0 14px 2px rgba(224,165,52,0.35)',
        'torch-glow-sm': '0 0 8px 1px rgba(224,165,52,0.4)',
      },
      backgroundImage: {
        // Layered cavern wall: vertical depth gradient + vignette.
        'stone-wall':
          'radial-gradient(120% 80% at 50% -10%, #25231d 0%, #171713 55%, #0d0d0b 100%)',
        // Warm parchment paper.
        parchment: 'linear-gradient(180deg, #f7f0df 0%, #ece1c4 100%)',
        // Torch radial glow overlay (place behind accents / headers).
        'torch-radial':
          'radial-gradient(60% 50% at 50% 0%, rgba(224,165,52,0.18) 0%, rgba(224,165,52,0) 70%)',
        // SVG fractal-noise grain (no raster asset) — subtle stone tooth.
        'noise-grain':
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
        // Runic/heraldic divider: centered diamond flanked by rules.
        'runic-divider':
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='16' viewBox='0 0 240 16' preserveAspectRatio='xMidYMid meet'%3E%3Cg fill='none' stroke='%23c4842a' stroke-width='1.2'%3E%3Cline x1='0' y1='8' x2='100' y2='8' opacity='0.5'/%3E%3Cpath d='M120 2 L126 8 L120 14 L114 8 Z' fill='%23c4842a' stroke='none'/%3E%3Cline x1='140' y1='8' x2='240' y2='8' opacity='0.5'/%3E%3C/g%3E%3C/svg%3E\")",
      },
      borderRadius: {
        forged: '3px',
        carve: '2px',
      },
      keyframes: {
        'torch-flicker': {
          '0%,100%': { opacity: '1', filter: 'brightness(1)' },
          '45%': { opacity: '0.94', filter: 'brightness(1.04)' },
          '55%': { opacity: '0.88', filter: 'brightness(0.96)' },
          '70%': { opacity: '0.97', filter: 'brightness(1.02)' },
        },
        'glow-pulse': {
          '0%,100%': { boxShadow: '0 0 6px 0 rgba(224,165,52,0.25)' },
          '50%': { boxShadow: '0 0 16px 2px rgba(224,165,52,0.5)' },
        },
        ember: {
          '0%': { transform: 'translateY(0)', opacity: '0' },
          '15%': { opacity: '0.8' },
          '100%': { transform: 'translateY(-18px)', opacity: '0' },
        },
      },
      animation: {
        'torch-flicker': 'torch-flicker 4s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2.8s ease-in-out infinite',
        ember: 'ember 2.2s linear infinite',
      },
    },
  },
  plugins: [],
};
