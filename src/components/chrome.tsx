import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ROLE_LABELS, type Role } from '../domain/types.js';

/** Top chrome: brand, demo role switcher, user chip. */
export function TopNav({ role }: { role: Role }): React.JSX.Element {
  const chip: Record<Role, string> = {
    CONTRACTOR: 'Demo Operator',
    OPERATIONS: 'M. King · Operations',
    CUSTOMER_INFORMATION: 'T. Reid · Customer Info',
  };
  return (
    <header className="topnav">
      <span className="brand">
        <span className="brand-mark">AT</span> Disruption Hub
      </span>
      <nav className="role-switch" aria-label="Demo role switcher">
        <NavLink to="/contractor" className={({ isActive }) => (isActive ? 'active' : '')}>
          {ROLE_LABELS.CONTRACTOR}
        </NavLink>
        <NavLink to="/operations" className={({ isActive }) => (isActive ? 'active' : '')}>
          {ROLE_LABELS.OPERATIONS}
        </NavLink>
        <NavLink to="/comms" className={({ isActive }) => (isActive ? 'active' : '')}>
          {ROLE_LABELS.CUSTOMER_INFORMATION}
        </NavLink>
      </nav>
      <span className="user-chip">{chip[role]}</span>
    </header>
  );
}

/** Persistent synthetic-data disclosure bar (UI kit, every screen). */
export function DemoBar(): React.JSX.Element {
  return (
    <div className="demobar">
      DEMO WORKSPACE · Synthetic data · No live connections
    </div>
  );
}

export function Footer(): React.JSX.Element {
  return (
    <footer className="footer">
      <span>AT Disruption Hub / Bus operations</span>
      <span>Illustrative workflow only · All times NZDT · Not a live operational record</span>
    </footer>
  );
}

/** Card section wrapper for consistent page rhythm. */
export function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <section className="card" id={id}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
