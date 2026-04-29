import { useState, useCallback } from "react";

const KEY = "gosdoc_sb_open";

function read() {
  const v = localStorage.getItem(KEY);
  return v === null ? true : v === "1";
}

export default function useSidebarOpen() {
  const [open, setOpen] = useState(read);

  const toggle = useCallback(() => {
    setOpen((v) => {
      const next = !v;
      localStorage.setItem(KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  return [open, toggle];
}
