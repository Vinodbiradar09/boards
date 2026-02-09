import { useEffect, useMemo, useState } from "react";

export function useBoardColumnMeta() {
  // Initialize state with the actual width if window exists
  const [screenWidth, setScreenWidth] = useState(() => 
    typeof window !== "undefined" ? window.innerWidth : 0
  );

  useEffect(() => {
    
    let timeoutId: NodeJS.Timeout;
    
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setScreenWidth(window.innerWidth);
      }, 50);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  const columnMeta = useMemo(() => {
    if (screenWidth === 0) return { count: 1, gap: 0 }; // Default for SSR
    if (screenWidth < 576) return { count: 1, gap: 0 };
    if (screenWidth < 768) return { count: 2, gap: 2 };
    if (screenWidth < 992) return { count: 2, gap: 6 };
    if (screenWidth < 1200) return { count: 3, gap: 2 };
    return { count: Math.floor(screenWidth / 380), gap: 4 };
  }, [screenWidth]);

  return columnMeta;
}