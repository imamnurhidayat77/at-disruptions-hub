import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ROLE_LABELS, type Role } from '../domain/types.js';
import { useAppStore } from '../state/AppStore.js';
import { FioriButton } from './Button.js';
import { ConfirmDialog } from './ConfirmDialog.js';
import { Icon, type IconName } from './icons.js';

const ROLE_HOME: Record<Role, string> = {
  CONTRACTOR: '/contractor',
  OPERATIONS: '/operations',
  CUSTOMER_INFORMATION: '/comms',
};

const INITIALS: Record<Role, string> = {
  CONTRACTOR: 'DO',
  OPERATIONS: 'SC',
  CUSTOMER_INFORMATION: 'TR',
};

const TITLES: Record<Role, string> = {
  CONTRACTOR: 'Bus Operator',
  OPERATIONS: 'Sarah Chen',
  CUSTOMER_INFORMATION: 'Talia Reed',
};

const SUBTITLES: Record<Role, string> = {
  CONTRACTOR: 'Bus Operator',
  OPERATIONS: 'Duty Operations Manager',
  CUSTOMER_INFORMATION: 'Customer Information',
};

interface SideLink {
  to: string;
  label: string;
  icon: IconName;
  /** Extra path prefixes that keep this entry highlighted. */
  match?: string[];
  /** Path suffixes that keep this entry highlighted (e.g. sub-steps). */
  matchEnd?: string[];
}

/** Role destinations. */
const SIDE_LINKS: Record<Role, { section: string; links: SideLink[] }> = {
  CONTRACTOR: {
    section: 'Bus Operator Portal',
    links: [
      { to: '/contractor', label: 'Overview', icon: 'dashboard' },
      { to: '/contractor/report', label: 'Report Disruption', icon: 'plus' },
      { to: '/contractor/incidents', label: 'My Incidents', icon: 'clipboard', match: ['/contractor/incident', '/contractor/sent'] },
      { to: '/contractor/help', label: 'Help', icon: 'help' },
    ],
  },
  OPERATIONS: {
    section: 'Operations',
    links: [
      { to: '/operations', label: 'Overview', icon: 'dashboard' },
      { to: '/operations/incoming', label: 'Incoming', icon: 'inbox', match: ['/operations/incoming/'] },
      { to: '/operations/incidents', label: 'Incidents', icon: 'clipboard', match: ['/operations/incident'] },
      { to: '/operations/recovery', label: 'Recovery', icon: 'wrench' },
      { to: '/operations/reviews', label: 'Reviews', icon: 'checks' },
      { to: '/operations/analytics', label: 'Analytics', icon: 'chart' },
    ],
  },
  CUSTOMER_INFORMATION: {
    section: 'Customer Information',
    links: [
      { to: '/comms', label: 'Overview', icon: 'dashboard' },
      { to: '/comms/queue', label: 'Communication Queue', icon: 'messages', match: ['/comms/incident'] },
      { to: '/comms/published', label: 'Published Updates', icon: 'send', match: ['/comms/published/'] },
      { to: '/comms/templates', label: 'Templates', icon: 'files' },
      { to: '/comms/analytics', label: 'Analytics', icon: 'chart' },
    ],
  },
};

function isLinkActive(pathname: string, l: SideLink): boolean {
  return (
    pathname === l.to ||
    (l.match ?? []).some((p) => pathname.startsWith(p)) ||
    (l.matchEnd ?? []).some((s) => pathname.endsWith(s))
  );
}

function detailPath(role: Role, id: string): string {
  if (role === 'CONTRACTOR') return `/contractor/incident/${id}`;
  if (role === 'OPERATIONS') return `/operations/incident/${id}`;
  return `/comms/incident/${id}`;
}

type PopId = 'role' | 'notif' | 'overflow' | 'help' | null;

/**
 * Top chrome — SAP Fiori shell-bar pattern (from the reference):
 * row 1 = ☰ ‹ brand | product · view-switcher … search · bell · help · … · avatar,
 * row 2 = text tabs with a "More" overflow pill on narrow screens.
 * Role switching for evaluation — all roles share the same records.
 */
export function TopNav(): React.JSX.Element {
  const { state, setRole, resetDemo } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState<PopId>(null);
  const [drawer, setDrawer] = useState(false);
  const [query, setQuery] = useState('');
  const [mobileSearch, setMobileSearch] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const shellRef = useRef<HTMLElement>(null);

  const { links } = SIDE_LINKS[state.role];

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return state.incidents
      .filter((i) =>
        [i.id, i.route, i.location, i.disruptionType].some((v) =>
          String(v ?? '').toLowerCase().includes(q),
        ),
      )
      .slice(0, 6);
  }, [query, state.incidents]);

  const notifCount = state.incidents.filter((i) => i.operationalStatus !== 'CLOSED').length;

  function toggle(id: Exclude<PopId, null>): void {
    setOpen((v) => (v === id ? null : id));
  }

  function onRoleChange(role: Role): void {
    setRole(role);
    setOpen(null);
    setDrawer(false);
    navigate(ROLE_HOME[role]);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        setOpen(null);
        setDrawer(false);
        setMobileSearch(false);
      }
    }
    function onClick(e: MouseEvent): void {
      if (shellRef.current && !shellRef.current.contains(e.target as Node)) {
        setOpen(null);
      }
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, []);

  // Close the drawer / workspace menu on route change.
  useEffect(() => {
    setDrawer(false);
    setOpen(null);
    setMobileSearch(false);
    setQuery('');
  }, [location.pathname]);

  return (
    <header className="topnav shellbar" role="banner" ref={shellRef}>
      <div className="wrap shellbar-row">
        <div className="shellbar-start">
          <button
            className="icon-button shell-icon"
            type="button"
            aria-label="Open navigation menu"
            aria-expanded={drawer}
            onClick={() => setDrawer((v) => !v)}
          >
            <Icon name="menu" size={18} />
          </button>
          <button
            className="icon-button shell-icon shell-back"
            type="button"
            aria-label="Go back"
            onClick={() => navigate(-1)}
          >
            <Icon name="chevronLeft" size={16} />
          </button>
          <Link className="brand brand-link" to={ROLE_HOME[state.role]} aria-label="Go to role home">
            <span className="brand-mark">AT</span>
            <span className="shell-product">AT Disruption Hub</span>
          </Link>
        </div>

        <div className="shellbar-end">
          <div className="shell-search">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              aria-label="Search incidents"
            />
            <span className="shell-search-icon" aria-hidden="true">
              <Icon name="search" size={15} />
            </span>
            {query.trim().length >= 2 && (
              <div className="shell-pop search-pop" role="listbox" aria-label="Incident results">
                {results.length === 0 && <p className="muted small">No incidents match “{query.trim()}”.</p>}
                {results.map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    className="search-hit"
                    onClick={() => {
                      setQuery('');
                      navigate(detailPath(state.role, i.id));
                    }}
                  >
                    <strong>{i.id}</strong>
                    <span className="muted small">
                      Route {i.route} · {i.location}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            className="icon-button shell-icon shell-search-toggle"
            type="button"
            aria-label="Search"
            aria-expanded={mobileSearch}
            onClick={() => setMobileSearch((v) => !v)}
          >
            <Icon name="search" size={18} />
          </button>
          <div className="shell-pop-anchor">
            <button
              className="icon-button shell-icon"
              type="button"
              aria-label={`Notifications (${notifCount} open)`}
              aria-expanded={open === 'notif'}
              onClick={() => toggle('notif')}
            >
              <Icon name="bell" size={18} />
              {notifCount > 0 && <span className="shell-dot" aria-hidden="true" />}
            </button>
            {open === 'notif' && (
              <div className="shell-pop notif-pop" role="menu" aria-label="Notifications">
                <p className="shell-pop-title">Notifications</p>
                {notifCount === 0 && <p className="muted small">No open disruptions.</p>}
                {state.incidents
                  .filter((i) => i.operationalStatus !== 'CLOSED')
                  .slice(0, 5)
                  .map((i) => (
                    <button
                      key={i.id}
                      type="button"
                      className="search-hit"
                      onClick={() => {
                        setOpen(null);
                        navigate(detailPath(state.role, i.id));
                      }}
                    >
                      <strong>{i.id}</strong>
                      <span className="muted small">
                        Route {i.route} · {i.operationalStatus.replace(/_/g, ' ')}
                      </span>
                    </button>
                  ))}
              </div>
            )}
          </div>
          <div className="shell-pop-anchor shell-help-anchor">
            <button
              className="icon-button shell-icon"
              type="button"
              aria-label="Help"
              aria-expanded={open === 'help'}
              onClick={() => toggle('help')}
            >
              <Icon name="help" size={18} />
            </button>
            {open === 'help' && (
              <div className="shell-pop help-pop" role="menu" aria-label="Help">
                <p className="shell-pop-title">Help</p>
                <p className="muted small">
                  All times NZDT.
                </p>
                <Link to="/contractor/help" onClick={() => setOpen(null)}>
                  Open help page
                </Link>
              </div>
            )}
          </div>
          <div className="shell-pop-anchor">
            <button
              className="icon-button shell-icon"
              type="button"
              aria-label="More actions"
              aria-expanded={open === 'overflow'}
              onClick={() => toggle('overflow')}
            >
              <Icon name="overflow" size={18} />
            </button>
            {open === 'overflow' && (
              <div className="shell-pop overflow-pop" role="menu" aria-label="More actions">
                <p className="shell-pop-title">Signed in as {ROLE_LABELS[state.role]}</p>
                <p className="muted small">All roles share the same records.</p>
                <button
                  type="button"
                  className="role-option"
                  onClick={() => {
                    setOpen(null);
                    setConfirmingReset(true);
                  }}
                >
                  <span className="role-option-icon" aria-hidden="true">
                    <Icon name="refresh" size={18} />
                  </span>
                  Reset workspace
                </button>
              </div>
            )}
          </div>
          <div className="shell-pop-anchor">
            <button
              className="shell-user"
              type="button"
              onClick={() => toggle('role')}
              aria-expanded={open === 'role'}
              aria-haspopup="menu"
              aria-label="Role and user menu"
              title="Switch role — all roles share the same records."
            >
              <span className="shell-avatar" aria-hidden="true">
                {INITIALS[state.role]}
              </span>
            </button>
            {open === 'role' && (
              <div className="shell-pop role-popover" role="menu" aria-label="Role">
                <p className="role-popover-title">Role</p>
                <p className="muted small">Switch role — all roles share the same records.</p>
                {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                  <button
                    key={r}
                    className={`role-option${r === state.role ? ' selected' : ''}`}
                    type="button"
                    role="menuitemradio"
                    aria-checked={r === state.role}
                    onClick={() => onRoleChange(r)}
                  >
                    <span className="role-option-icon" aria-hidden="true">
                      {r === state.role ? <Icon name="check" size={18} /> : <Icon name="user" size={18} />}
                    </span>
                    {ROLE_LABELS[r]}
                  </button>
                ))}
                <p className="muted small">Switching role keeps the same shared records.</p>
                <p className="role-user">
                  <strong>{TITLES[state.role]}</strong>
                  <span className="muted small">{SUBTITLES[state.role]}</span>
                </p>
                <FioriButton
                  design="transparent"
                  icon="refresh"
                  onClick={() => {
                    setOpen(null);
                    setConfirmingReset(true);
                  }}
                >
                  Reset workspace
                </FioriButton>
              </div>
            )}
          </div>
        </div>
      </div>

      {mobileSearch && (
        <div className="wrap shellbar-mobile-search">
          <div className="shell-search open">
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              aria-label="Search incidents"
            />
            <span className="shell-search-icon" aria-hidden="true">
              <Icon name="search" size={15} />
            </span>
          </div>
        </div>
      )}

      {drawer && (
        <div className="shell-drawer-scrim" onClick={() => setDrawer(false)} aria-hidden="true" />
      )}
      <nav className={`shell-drawer${drawer ? ' open' : ''}`} aria-label={`${SIDE_LINKS[state.role].section} navigation`}>
        <p className="sidenav-label">{SIDE_LINKS[state.role].section}</p>
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end
            className={isLinkActive(location.pathname, l) ? 'active' : undefined}
            onClick={() => setDrawer(false)}
          >
            <span className="sidenav-icon" aria-hidden="true">
              <Icon name={l.icon} size={16} />
            </span>
            {l.label}
          </NavLink>
        ))}
        <div className="shell-drawer-role">
          <p className="sidenav-label">Role</p>
          {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
            <button
              key={r}
              type="button"
              className={`role-option${r === state.role ? ' selected' : ''}`}
              onClick={() => onRoleChange(r)}
            >
              {ROLE_LABELS[r]}
            </button>
          ))}
        </div>
      </nav>

      {confirmingReset && (
        <ConfirmDialog
          title="Reset workspace?"
          subtitle="Start over"
          summary={['This restores the workspace to its initial state.']}
          requireCheck={false}
          disclaimer="Shared records will be reset for all roles."
          confirmLabel="Reset workspace"
          tone="negative"
          onConfirm={() => {
            resetDemo();
            setConfirmingReset(false);
          }}
          onCancel={() => setConfirmingReset(false)}
        />
      )}
    </header>
  );
}

/** Role side navigation. */
export function SideNav({ role }: { role: Role }): React.JSX.Element {
  const { pathname } = useLocation();
  const { section, links } = SIDE_LINKS[role];
  return (
    <nav className="sidenav" aria-label={`${section} navigation`}>
      <p className="sidenav-label">{section}</p>
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end
          className={isLinkActive(pathname, l) ? 'active' : undefined}
        >
          <span className="sidenav-icon" aria-hidden="true">
            <Icon name={l.icon} size={16} />
          </span>
          {l.label}
        </NavLink>
      ))}
    </nav>
  );
}

function useViewportWidth(): number {
  const [w, setW] = useState(() => (typeof window === 'undefined' ? 1440 : window.innerWidth));
  useEffect(() => {
    function onResize(): void {
      setW(window.innerWidth);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return w;
}

/**
 * Tab bar under the shell bar — text tabs like the reference, with the
 * trailing tabs collapsed into an outlined "More" pill on narrow screens
 * (L ≈ 4 visible, M ≈ 3, S ≈ 2).
 */
export function MenuBar({ role }: { role: Role }): React.JSX.Element {
  const { pathname } = useLocation();
  const { section, links } = SIDE_LINKS[role];
  const width = useViewportWidth();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const visibleCount =
    width >= 1100 ? links.length : width >= 800 ? 4 : width >= 550 ? 3 : 2;
  const visible = links.slice(0, visibleCount);
  const hidden = links.slice(visibleCount);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname, width, role]);

  useEffect(() => {
    if (!moreOpen) return;
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') setMoreOpen(false);
    }
    function onClick(e: MouseEvent): void {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [moreOpen]);

  return (
    <nav className="menubar" aria-label={`${section} navigation`}>
      <div className="wrap menubar-inner">
        {visible.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end
            className={isLinkActive(pathname, l) ? 'active' : undefined}
          >
            {l.label}
          </NavLink>
        ))}
        {hidden.length > 0 && (
          <div className="menubar-more" ref={moreRef}>
            <button
              className={`menubar-more-button${hidden.some((l) => isLinkActive(pathname, l)) ? ' active' : ''}`}
              type="button"
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              onClick={() => setMoreOpen((v) => !v)}
            >
              More
              <Icon name="chevron" size={12} />
            </button>
            {moreOpen && (
              <div className="shell-pop menubar-more-pop" role="menu" aria-label="More navigation">
                {hidden.map((l) => (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    end
                    className={isLinkActive(pathname, l) ? 'selected' : undefined}
                    onClick={() => setMoreOpen(false)}
                  >
                    {l.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

export function Footer(): React.JSX.Element {
  return (
    <footer className="footer">
      <div className="wrap footer-inner">
        <span>AT Disruption Hub</span>
        <span>
          All times NZDT
        </span>
      </div>
    </footer>
  );
}

/** Small breadcrumb trail for page orientation. */
export function Crumbs({ trail }: { trail: string[] }): React.JSX.Element {
  return (
    <p className="crumbs" aria-label="Breadcrumb">
      {trail.join(' › ')}
    </p>
  );
}

/** Card section wrapper for consistent page rhythm. */
export function Section({
  id,
  title,
  count,
  center,
  children,
}: {
  id?: string;
  title: string;
  /** Right-aligned record count in the toolbar row (Figma). */
  count?: string;
  /** Center all card content (title, actions, text). */
  center?: boolean;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <section className={`card${center === true ? ' center' : ''}`} id={id}>
      <div className="section-toolbar">
        <h2>{title}</h2>
        {count !== undefined && <span className="muted small">{count}</span>}
      </div>
      {children}
    </section>
  );
}
