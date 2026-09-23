/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./features/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: { extend: { colors: { ink: "#512437", paper: "#fff0f5", cream: "#fff8fb", pink: "#d95783", yellow: "#f3abc3", mint: "#8fbe91" } } },
  plugins: [],
};
