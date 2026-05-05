const srcPattern = "." + "/src/" + "**" + "/" + "*.{js,jsx}"

export default {
  content: ["./index.html", srcPattern],
  theme: {
    extend: {
      fontFamily: {
        display: ["Fraunces", "serif"],
        sans: ["Manrope", "sans-serif"]
      },
      colors: {
        ink: "#101936",
        paper: "#F7F0E3",
        clay: "#B75F3A",
        moss: "#65734B",
        night: "#151923",
        pen: "#1E1E8C"
      },
      boxShadow: {
        lift: "0 24px 70px rgba(16, 25, 54, 0.16)"
      }
    }
  },
  plugins: []
}
