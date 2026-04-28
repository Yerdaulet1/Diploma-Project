import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import ru from "./ru.json";
import kk from "./kk.json";

const saved = localStorage.getItem("gosdoc_lang") || "en";

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ru: { translation: ru },
      kk: { translation: kk },
    },
    lng: saved,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });

export default i18n;
