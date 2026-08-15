import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

function FoundationScreen() {
  return <main>Photo scrapbook</main>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <FoundationScreen />
  </StrictMode>,
);
