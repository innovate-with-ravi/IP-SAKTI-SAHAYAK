import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "./Landing";
import Login from "./Login";
import Register from "./Register";
import ResetPassword from "./ResetPassword";
import MainPage from "./ChatPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login mode="login" />} />
        <Route path="/signup" element={<Login mode="signup" />} />
        <Route path="/register" element={<Login mode="signup" />} />
        <Route path="/register-form" element={<Register />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/forgot-password" element={<ResetPassword />} />

        {/* IP-SAKTI chat application routes */}
        <Route path="/chat" element={<MainPage />} />
        <Route path="/main" element={<MainPage />} />
        <Route path="/Landing_Notes" element={<MainPage />} />

        {/* Fallback to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}