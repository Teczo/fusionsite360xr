import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const STORAGE_KEY = "ui.sidebar.collapsed";

/**
 * Breakpoint helper using matchMedia.
 * Returns { isMobile, isTablet, isDesktop, isLandscape }.
 *
 * Mobile:  width < 768px  (portrait only — landscape treated as tablet)
 * Tablet:  768px–1023px   OR  mobile-width + landscape
 * Desktop: >= 1024px
 */
function useBreakpoint() {
  const query = (q) => typeof window !== "undefined" && window.matchMedia(q).matches;

  const compute = () => {
    const w = window.innerWidth;
    const landscape = query("(orientation: landscape)");
    const isDesktop = w >= 1024;
    // Mobile landscape behaves as tablet
    const isMobile = w < 768 && !landscape;
    const isTablet = (!isDesktop && !isMobile);
    return { isMobile, isTablet, isDesktop, isLandscape: landscape };
  };

  const [bp, setBp] = useState(compute);

  useEffect(() => {
    const onResize = () => setBp(compute());
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  return bp;
}

export default function useSidebarState() {
  const { isMobile, isTablet, isDesktop, isLandscape } = useBreakpoint();
  const location = useLocation();

  // --- Collapsed state (desktop / tablet) ---
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw === "1";
    } catch {
      return false;
    }
  });

  // --- Open state (mobile drawer) ---
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Persist collapsed to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, sidebarCollapsed ? "1" : "0");
    } catch { /* noop */ }
  }, [sidebarCollapsed]);

  // Cross-tab sync
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY && e.newValue != null) {
        setSidebarCollapsed(e.newValue === "1");
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Keyboard shortcut: Ctrl/Cmd + B
  useEffect(() => {
    const onKey = (e) => {
      const isMeta = navigator.platform.includes("Mac") ? e.metaKey : e.ctrlKey;
      if (isMeta && e.key.toLowerCase() === "b") {
        e.preventDefault();
        if (isMobile) {
          setSidebarOpen((p) => !p);
        } else {
          setSidebarCollapsed((p) => !p);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMobile]);

  // Close mobile drawer on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Auto-collapse on tablet when first entering tablet breakpoint
  useEffect(() => {
    if (isTablet) {
      setSidebarCollapsed(true);
    }
  }, [isTablet]);

  // Toggle function used by topbar hamburger button
  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setSidebarOpen((p) => !p);
    } else {
      setSidebarCollapsed((p) => !p);
    }
  }, [isMobile]);

  return {
    sidebarOpen,
    setSidebarOpen,
    sidebarCollapsed,
    setSidebarCollapsed,
    isMobile,
    isTablet,
    isDesktop,
    isLandscape,
    toggleSidebar,
  };
}
