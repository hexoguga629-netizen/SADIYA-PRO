import { useEffect, useState } from "react";
import PhantomNexus from "./phantom/PhantomNexus";

export default function App() {
  const [isOverlay, setIsOverlay] = useState(false);
  useEffect(() => {
    const ipc = window.electron?.ipcRenderer;
    ipc?.on("overlay-mode", (_event: unknown, mode: boolean) =>
      setIsOverlay(mode),
    );
    return () => {
      ipc?.removeAllListeners?.("overlay-mode");
    };
  }, []);
  return isOverlay ? (
    <div className="h-screen grid place-items-center bg-[#030713] text-cyan-300 text-xs tracking-[.2em]">
      MAX OVERLAY ACTIVE
    </div>
  ) : (
    <PhantomNexus />
  );
}
