import { useCallback, useEffect, useState } from "react";

const KEY = "gosdoc_theme";
const VALID = ["light", "dark", "auto"];

function read() {
  const v = localStorage.getItem(KEY);
  return VALID.includes(v) ? v : "light";
}

function apply(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export default function useTheme() {
  const [theme, setThemeState] = useState(read);

  useEffect(() => {
    apply(theme);
  }, [theme]);

  const setTheme = useCallback((next) => {
    if (!VALID.includes(next)) return;
    localStorage.setItem(KEY, next);
    setThemeState(next);
  }, []);

  const cycle = useCallback(() => {
    setThemeState((prev) => {
      const i = VALID.indexOf(prev);
      const next = VALID[(i + 1) % VALID.length];
      localStorage.setItem(KEY, next);
      return next;
    });
  }, []);

  return { theme, setTheme, cycle };
}
