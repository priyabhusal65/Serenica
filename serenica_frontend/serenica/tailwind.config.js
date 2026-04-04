/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Playfair Display'", "Georgia", "serif"],
        body: ["'DM Sans'", "sans-serif"],
      },
      colors: {
        teal:  { 50:"#f0fdfa",100:"#ccfbf1",200:"#99f6e4",300:"#5eead4",400:"#2dd4bf",500:"#14b8a6",600:"#0d9488",700:"#0f766e",800:"#115e59",900:"#134e4a" },
        sage:  { 50:"#f8faf5",100:"#eef2e8",200:"#dce6d1",300:"#bfd4ae",400:"#9dbc83",500:"#7da25c",600:"#628548",700:"#4e6a39",800:"#3f542e",900:"#344626" },
        cream: { 50:"#fdfcf7",100:"#faf7ed",200:"#f4efd8",300:"#ebe0bb",400:"#ddc994",500:"#cead68",600:"#b8924a",700:"#9a783d",800:"#7e6235",900:"#68502e" },
      },
      animation: {
        "float": "float 6s ease-in-out infinite",
        "breathe": "breathe 4s ease-in-out infinite",
        "fade-up": "fadeUp 0.6s ease forwards",
      },
      keyframes: {
        float:   { "0%,100%": { transform:"translateY(0)" }, "50%": { transform:"translateY(-12px)" } },
        breathe: { "0%,100%": { transform:"scale(1)", opacity:"0.7" }, "50%": { transform:"scale(1.08)", opacity:"1" } },
        fadeUp:  { from: { opacity:"0", transform:"translateY(24px)" }, to: { opacity:"1", transform:"translateY(0)" } },
      },
    },
  },
  plugins: [],
}
