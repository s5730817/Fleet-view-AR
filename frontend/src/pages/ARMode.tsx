import { useRef } from "react";
import { useNavigate } from "react-router-dom";
// @ts-expect-error Migrated JS AR module from myAR package.
import ARInterface from "@/ar/ARInterface.jsx";

const ARMode = () => {
  const navigate = useNavigate();
  const arContainerRef = useRef<HTMLDivElement | null>(null);

  return (
    <div ref={arContainerRef} className="fixed inset-0 z-50 overflow-hidden bg-black">
      <div className="absolute inset-0">
        <ARInterface onExit={() => navigate("/dashboard")} />
      </div>
    </div>
  );
};

export default ARMode;
