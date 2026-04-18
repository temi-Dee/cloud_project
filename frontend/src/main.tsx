import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import NYSCRegistration from "./NYSC";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <NYSCRegistration />
  </StrictMode>
);
