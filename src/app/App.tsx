import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import { StoreProvider } from "./context/StoreContext";

export default function App() {
  return (
    <StoreProvider>
      <RouterProvider router={router} />
    </StoreProvider>
  );
}
