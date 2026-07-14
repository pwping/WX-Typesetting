/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        app: {
          bg: "var(--app-bg)",
          surface: "var(--app-surface)",
          border: "var(--app-border)",
          accent: "var(--app-accent)",
          "accent-light": "var(--app-accent-light)",
          "accent-text": "var(--app-accent-text)",
          text: "var(--app-text)",
          "text-secondary": "var(--app-text-secondary)",
          "text-tertiary": "var(--app-text-tertiary)",
          hover: "var(--app-hover)",
          "active": "var(--app-active)",
        },
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "PingFang SC", "Microsoft YaHei", "sans-serif"],
        mono: ["SF Mono", "Consolas", "Monaco", "monospace"],
      },
    },
  },
  plugins: [],
}
