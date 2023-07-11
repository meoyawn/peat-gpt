import type { Config } from "tailwindcss"

// noinspection JSUnusedGlobalSymbols
export default {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  plugins: [require("@tailwindcss/typography"), require("@tailwindcss/forms")],
  theme: {
    extend: {},
  },
} satisfies Config
