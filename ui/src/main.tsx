import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// No StrictMode: in dev it double-runs effects, which would call AnnaAppRuntime.connect()
// twice and open two heartbeats.
createRoot(document.getElementById("root")!).render(<App />);
