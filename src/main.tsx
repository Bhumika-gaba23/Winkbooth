import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Features from "./pages/Features";
import Booth from "./pages/Booth";
import Edit from "./pages/Edit";
import ExportPage from "./pages/Export";
import Gallery from "./pages/Gallery";
import { Privacy, Terms } from "./pages/Legal";
import MusicPlayer from "./MusicPlayer";
import { MobileBottomNav } from "./components";
import "./styles.css";
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/features" element={<Features />} />
        <Route path="/booth" element={<Booth />} />
        <Route path="/edit" element={<Edit />} />
        <Route path="/export" element={<ExportPage />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="*" element={<Home />} />
      </Routes>
      <MusicPlayer />
      <MobileBottomNav />
    </BrowserRouter>
  );
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
