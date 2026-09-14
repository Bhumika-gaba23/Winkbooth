import { Camera, Download, House, Images, Menu, Sparkles, X } from "lucide-react";
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
export function Shell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
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
        <button
          className="icon-btn menu"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? <X /> : <Menu />}
        </button>
      </header>
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
