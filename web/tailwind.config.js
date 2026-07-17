/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /* shadcn 语义名 → 设计 token（供 ui/ 组件使用） */
        border: "var(--border)",
        input: "var(--border)",
        ring: "var(--accent-500)",
        background: "var(--bg-app)",
        foreground: "var(--ink-1)",
        primary: {
          DEFAULT: "var(--accent-500)",
          foreground: "var(--ink-inverse)",
        },
        secondary: {
          DEFAULT: "var(--bg-subtle)",
          foreground: "var(--ink-1)",
        },
        destructive: {
          DEFAULT: "#DC2626",
          foreground: "var(--ink-inverse)",
        },
        muted: {
          DEFAULT: "var(--bg-subtle)",
          foreground: "var(--ink-3)",
        },
        popover: {
          DEFAULT: "var(--bg-surface)",
          foreground: "var(--ink-1)",
        },
        card: {
          DEFAULT: "var(--bg-surface)",
          foreground: "var(--ink-1)",
        },
        sidebar: {
          DEFAULT: "var(--bg-surface)",
          foreground: "var(--ink-1)",
          primary: "var(--accent-500)",
          "primary-foreground": "var(--ink-inverse)",
          accent: "var(--bg-subtle)",
          "accent-foreground": "var(--ink-1)",
          border: "var(--border)",
          ring: "var(--accent-500)",
        },
        /* design.md §3 设计 token 色板 */
        app: "var(--bg-app)",
        surface: "var(--bg-surface)",
        subtle: "var(--bg-subtle)",
        soft: "var(--bg-muted)",
        strong: "var(--border-strong)",
        ink: {
          1: "var(--ink-1)",
          2: "var(--ink-2)",
          3: "var(--ink-3)",
          4: "var(--ink-4)",
          inverse: "var(--ink-inverse)",
        },
        accent: {
          DEFAULT: "var(--bg-subtle)",
          foreground: "var(--ink-1)",
          50: "var(--accent-50)",
          100: "var(--accent-100)",
          500: "var(--accent-500)",
          600: "var(--accent-600)",
          ink: "var(--accent-ink)",
        },
        amber: {
          50: "var(--amber-50)",
          100: "var(--amber-100)",
          500: "var(--amber-500)",
          600: "var(--amber-600)",
          border: "var(--amber-border)",
        },
        /* design.md §3.4 状态色（文字 / 徽标底） */
        status: {
          saved: { text: "#64748B", bg: "#F0F3F7" },
          pending: { text: "#B45309", bg: "#FBEED3" },
          applied: { text: "#2563EB", bg: "#E9F0FD" },
          viewed: { text: "#7C3AED", bg: "#F1ECFD" },
          chatting: { text: "#0E7490", bg: "#E4F4F8" },
          interviewing: { text: "#C2410C", bg: "#FCEEDF" },
          offer: { text: "#15803D", bg: "#E6F5EB" },
          rejected: { text: "#BE123C", bg: "#FBE9ED" },
          abandoned: { text: "#78716C", bg: "#F1EFEC" },
          closed: { text: "#57534E", bg: "#ECEAE6" },
        },
        /* design.md §3.5 来源色 */
        source: {
          boss: { text: "#0E9F80", bg: "#E5F6F1" },
          liepin: { text: "#EA580C", bg: "#FCEEE3" },
          linkedin: { text: "#2563EB", bg: "#E9F0FD" },
          lagou: { text: "#65A30D", bg: "#F0F7E2" },
          official: { text: "#6366F1", bg: "#EDEDFD" },
          referral: { text: "#8B5CF6", bg: "#F2EDFD" },
          hunter: { text: "#DB2777", bg: "#FBE9F2" },
          other: { text: "#78716C", bg: "#F1EFEC" },
        },
      },
      fontFamily: {
        sans: ['"Manrope"', '"Noto Sans SC"', '-apple-system', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
        serif: ['"Noto Serif SC"', '"Songti SC"', 'serif'],
        mono: ['"JetBrains Mono"', '"SFMono-Regular"', 'Consolas', 'monospace'],
      },
      fontSize: {
        caption: ['12px', { lineHeight: '1.4', fontWeight: '500' }],
        ui: ['13px', { lineHeight: '1.5', fontWeight: '400' }],
        body: ['14px', { lineHeight: '1.6', fontWeight: '400' }],
        reading: ['15px', { lineHeight: '1.8', fontWeight: '400' }],
        'card-title': ['15px', { lineHeight: '1.4', fontWeight: '600' }],
        section: ['16px', { lineHeight: '1.4', fontWeight: '600' }],
        'page-title': ['20px', { lineHeight: '1.3', fontWeight: '650', letterSpacing: '-0.01em' }],
        greeting: ['22px', { lineHeight: '1.35', fontWeight: '650', letterSpacing: '-0.01em' }],
        stat: ['30px', { lineHeight: '1.1', fontWeight: '700' }],
        'mono-sm': ['12px', { lineHeight: '1.5' }],
        mono: ['13px', { lineHeight: '1.6' }],
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '10px',
        '2xl': '14px',
        pill: '999px',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        e0: '0 1px 2px rgba(27,27,24,0.04)',
        e1: '0 2px 8px rgba(27,27,24,0.06)',
        e2: '0 4px 16px rgba(27,27,24,0.10)',
        e3: '0 12px 40px rgba(27,27,24,0.16)',
      },
      maxWidth: {
        content: '1160px',
        reading: '680px',
      },
      zIndex: {
        sticky: '10',
        topbar: '20',
        overlay: '40',
        drawer: '50',
        modal: '60',
        command: '70',
        toast: '80',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
        standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        instant: '120ms',
        fast: '160ms',
        base: '200ms',
        panel: '280ms',
        page: '240ms',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
        /* 骨架屏 1.4s 呼吸（design.md §6 / dashboard 加载态） */
        breathe: {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
        /* StatusBadge pulse 变体：圆点 1.6s 呼吸缩放（§7.5） */
        "pulse-dot": {
          "0%,100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.35)" },
        },
        /* 侧栏 logo 悬停 8° 摆动（§7.1） */
        wiggle: {
          "0%,100%": { transform: "rotate(0deg)" },
          "25%": { transform: "rotate(8deg)" },
          "75%": { transform: "rotate(-4deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        breathe: "breathe 1.4s ease-in-out infinite",
        "pulse-dot": "pulse-dot 1.6s ease-in-out infinite",
        wiggle: "wiggle 0.4s ease-in-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
