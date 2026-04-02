/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1b2333",
        muted: "#5c667d",
        panel: "#f3f7f6",
        accent: "#0f766e",
        accentSoft: "#dff5f2"
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "ui-sans-serif", "system-ui"]
      },
      boxShadow: {
        panel: "0 10px 30px -15px rgba(16, 24, 40, 0.2)"
      }
    }
  },
  plugins: []
};
