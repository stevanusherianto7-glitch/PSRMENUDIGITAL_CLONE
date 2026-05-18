import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import { StoreProvider } from "./context/StoreContext";
import { useThemeStore } from "./hooks/useThemeStore";

export default function App() {
  useThemeStore(); // Registers root listener for instant theme changes across all pages

  return (
    <StoreProvider>
      <RouterProvider router={router} />
    </StoreProvider>
  );
}
