import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from 'virtual:pwa-register';

if ('serviceWorker' in navigator) {
  registerSW();
}


createRoot(document.getElementById("root")!).render(
  <App />
);
