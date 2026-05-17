import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import QueryProvider from "./providers/QueryProvider";
import App from "./App";
import "./index.css";
import "./i18n";

// Применяем сохранённую тему ДО рендера, чтобы не было вспышки
const savedTheme = localStorage.getItem("gosdoc_theme") || "light";
document.documentElement.setAttribute("data-theme", savedTheme);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryProvider>
  </StrictMode>
);
