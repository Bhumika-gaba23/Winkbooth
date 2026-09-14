import { Camera, Download, Images, Menu, Sparkles, X } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useState, type ReactNode } from "react";
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
