import { Camera, Download, House, Images, Menu, Moon, Palette, Sparkles, X } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useRef, useState, type ReactNode } from "react";
export function Logo() {
  return (
    <NavLink to="/" className="logo">
      <img className="wink-mark" src="/winkbooth-mark.svg" alt="" />
      <span className="wink-wordmark"><b>wink</b>booth</span>
    </NavLink>
  );
}

export function AppLoadingScreen() {
  const [phase, setPhase] = useState<"visible" | "leaving" | "hidden">("visible");

  useEffect(() => {
    const beginExit = window.setTimeout(() => setPhase("leaving"), 1450);
    const remove = window.setTimeout(() => setPhase("hidden"), 1850);
    return () => {
      window.clearTimeout(beginExit);
      window.clearTimeout(remove);
    };
  }, []);

  if (phase === "hidden") return null;

  return (
    <div className={`app-loader ${phase === "leaving" ? "is-leaving" : ""}`} role="status" aria-live="polite" aria-label="WinkBooth is loading">
      <div className="app-loader-grain" aria-hidden="true" />
      <div className="app-loader-lockup" aria-hidden="true">
        <div className="app-loader-mark">
          <svg viewBox="0 0 256 256">
            <g className="app-loader-camera" transform="rotate(5 128 128)">
              <path d="M48 38h151a15 15 0 0 1 15 15v142a15 15 0 0 1-15 15H48a15 15 0 0 1-15-15V53a15 15 0 0 1 15-15Z" className="loader-camera-paper" />
              <path d="M62 59h123v103H62z" className="loader-camera-screen" />
              <ellipse className="loader-eye-open" cx="91" cy="103" rx="10" ry="19" />
              <path className="loader-eye-wink" d="M80 104q11 9 22 0" />
              <path d="m129 104 20-12M129 104l20 8" className="loader-eye-spark" />
              <path d="M91 137q31 28 61-1" className="loader-smile" />
              <path d="M107 179h25" className="loader-slot" />
            </g>
          </svg>
          <i className="loader-flash loader-flash-one" />
          <i className="loader-flash loader-flash-two" />
          <i className="loader-flash loader-flash-three" />
        </div>
        <div className="app-loader-wordmark"><b>wink</b>booth</div>
        <div className="app-loader-caption">developing something lovely</div>
        <div className="app-loader-progress"><i /></div>
      </div>
      <span className="sr-only">Loading WinkBooth</span>
    </div>
  );
}
export function Shell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const themeSwitcherRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem("winkbooth.theme");
    return ["classic", "sunrise", "sky", "mint"].includes(stored ?? "") ? stored! : "classic";
  });
  const themes = [
    ["classic", "Classic", "Warm paper"],
    ["sunrise", "Sunrise", "Apricot glow"],
    ["sky", "Sky", "Clear blue"],
    ["mint", "Mint", "Cool garden"],
  ] as const;
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("winkbooth.theme", theme);
  }, [theme]);
  useEffect(() => {
    if (!themeOpen) return;
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!themeSwitcherRef.current?.contains(event.target as Node)) setThemeOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setThemeOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [themeOpen]);
  const activeTheme = themes.find(([id]) => id === theme) ?? themes[0];
  const workflow = [
    ["/booth", "1", "Capture"],
    ["/edit", "2", "Style"],
    ["/export", "3", "Export"],
    ["/gallery", "4", "Keep"],
  ] as const;
  const step = workflow.findIndex(([to]) => to === pathname);
  return (
    <div className="app-shell">
      <div className="petal petal-a" />
      <div className="petal petal-b" />
      <header>
        <Logo />
        <nav className={open ? "open" : ""}>
          {[
            ["/", "Home"],
            ["/booth", "Booth"],
            ["/gallery", "Gallery"],
            ["/features", "Features"],
          ].map(([to, l]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={() => setOpen(false)}
            >
              {l}
            </NavLink>
          ))}
        </nav>
        <div className="header-actions">
          <div className="theme-switcher" ref={themeSwitcherRef}>
            <button className="theme-toggle" type="button" onClick={() => setThemeOpen((value) => !value)} aria-expanded={themeOpen} aria-label="Change theme">
              <Palette /> <span>{activeTheme[1]}</span>
            </button>
            {themeOpen && (
              <div className="theme-menu" role="menu" aria-label="Choose a theme">
                {themes.map(([id, label, copy]) => (
                  <button key={id} type="button" className={theme === id ? "active" : ""} onClick={() => { setTheme(id); setThemeOpen(false); }} role="menuitemradio" aria-checked={theme === id}>
                    <i className={`theme-dot theme-dot-${id}`} />
                    <span><b>{label}</b><small>{copy}</small></span>
                    {theme === id && <Moon aria-hidden="true" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="icon-btn menu" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      {step >= 0 && (
        <nav className="workflow-steps" aria-label="Create your photo strip">
          {workflow.map(([to, number, label], index) => (
            <NavLink key={to} to={to} className={index === step ? "active" : index < step ? "complete" : ""} aria-current={index === step ? "step" : undefined} aria-label={`${label}${index === step ? ", current step" : ""}`}>
              <i>{index < step ? "✓" : number}</i><span>{label}</span>
            </NavLink>
          ))}
        </nav>
      )}
      <main>{children}</main>
    </div>
  );
}

export function MobileBottomNav() {
  const { pathname } = useLocation();
  const boothActive = pathname === "/booth" || pathname === "/edit" || pathname === "/export";
  const items = [
    { to: "/", label: "Home", Icon: House, active: pathname === "/" },
    { to: "/booth", label: "Booth", Icon: Camera, active: boothActive },
    { to: "/gallery", label: "Gallery", Icon: Images, active: pathname === "/gallery" },
    { to: "/features", label: "Features", Icon: Sparkles, active: pathname === "/features" },
  ];
  return (
    <nav className="mobile-bottom-nav" aria-label="Primary mobile navigation">
      {items.map(({ to, label, Icon, active }) => (
        <NavLink key={to} to={to} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

type SheetSnap = "collapsed" | "half" | "full";

export function BottomSheet({
  title,
  open,
  onClose,
  className = "",
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  className?: string;
  children: ReactNode;
}) {
  const [snap, setSnap] = useState<SheetSnap>("half");
  const startY = useRef(0);
  useEffect(() => {
    if (open) setSnap("half");
  }, [open]);
  const moveSnap = (direction: -1 | 1) => {
    const snaps: SheetSnap[] = ["collapsed", "half", "full"];
    const next = Math.min(2, Math.max(0, snaps.indexOf(snap) + direction));
    setSnap(snaps[next]);
  };
  return (
    <aside className={`${className} mobile-sheet ${open ? "is-open" : ""} snap-${snap}`} aria-label={title}>
      <div
        className="mobile-sheet-grab"
        role="button"
        tabIndex={0}
        aria-label={`${title}. Swipe or press Enter to resize.`}
        onClick={() => setSnap((value) => value === "collapsed" ? "half" : value === "half" ? "full" : "half")}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setSnap((value) => value === "collapsed" ? "half" : value === "half" ? "full" : "half");
          }
          if (event.key === "ArrowUp") moveSnap(1);
          if (event.key === "ArrowDown") moveSnap(-1);
          if (event.key === "Escape") onClose();
        }}
        onPointerDown={(event) => {
          startY.current = event.clientY;
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerUp={(event) => {
          const distance = startY.current - event.clientY;
          if (Math.abs(distance) > 42) moveSnap(distance > 0 ? 1 : -1);
        }}
      >
        <i aria-hidden="true" />
      </div>
      <div className="mobile-sheet-heading">
        <b>{title}</b>
        <button type="button" onClick={onClose} aria-label={`Close ${title}`}><X /></button>
      </div>
      <div className="mobile-sheet-content">{children}</div>
    </aside>
  );
}
export function SectionTitle({
  eyebrow,
  title,
  copy,
}: {
  eyebrow?: string;
  title: string;
  copy?: string;
}) {
  return (
    <div className="section-title">
      {eyebrow && <span>{eyebrow}</span>}
      <h1>{title}</h1>
      {copy && <p>{copy}</p>}
    </div>
  );
}
export function Button({
  children,
  onClick,
  kind = "outline",
  disabled = false,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  kind?: "primary" | "outline" | "ghost";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`button ${kind} ${className}`}
    >
      {children}
    </button>
  );
}
export function Empty({
  title,
  copy,
  action,
}: {
  title: string;
  copy: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Camera />
      </div>
      <h2>{title}</h2>
      <p>{copy}</p>
      {action}
    </div>
  );
}
export const featureIcons = [Camera, Sparkles, Download, Images];
