import { createBrowserRouter, RouterProvider } from "react-router";
import Home from "./Home";
import AuthPage from "./AuthPage";
import Chat from "./Chat";

const router = createBrowserRouter([
  { path: "/", Component: Home },
  { path: "/login", element: <AuthPage mode="login" /> },
  { path: "/signup", element: <AuthPage mode="signup" /> },
  { path: "/chat", Component: Chat },
  { path: "*", Component: Home },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
