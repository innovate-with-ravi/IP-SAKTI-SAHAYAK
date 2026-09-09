// App.tsx

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Landing from "./Landing";
import Login from "./Login";
import Register from "./Register";
import MainPage from "./Main_Page";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Main IP-SAKTI chat application */}
        <Route path="/main" element={<MainPage />} />

        {/* Support login transition target */}
        <Route path="/Landing_Notes" element={<MainPage />} />

        {/* Fallback to main */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}