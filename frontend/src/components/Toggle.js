import React from "react";
import { motion } from "framer-motion";

function Toggle({ dark, setDark }) {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={() => setDark(!dark)}
      className="theme-toggle"
      aria-label="Toggle theme"
    >
      {dark ? "🌙" : "☀️"}
    </motion.button>
  );
}

export default Toggle;