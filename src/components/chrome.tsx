import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ROLE_LABELS, type Role } from '../domain/types.js';
import { useAppStore } from '../state/AppStore.js';
import { ConfirmDialog } from './ConfirmDialog.js';

const ROLE_HOME: Record<Role, string> = {
  CONTRACTOR: '/contractor',
  OPERATIONS: '/operations',
  CUSTOMER_INFORMATION: '/comms',
};

/** Application context label per role (contractor sees its own portal). */
const CONTEXT_LABEL: Record<Role, string> = {
  CONTRACTOR: 'Bus Operator Portal',
  OPERATIONS: 'Disruption Hub',
  CUSTOMER_INFORMATION: 'Disruption Hub',
};

const FOOTER_CONTEXT: Record<Role, string> = {
  CONTRACTOR: 'Bus Operator Portal',
  OPERATIONS: 'AT Disruption Hub / Bus operations',
  CUSTOMER_INFORMATION: 'AT Disruption Hub / Customer information',
};

/**
 * Top chrome: brand, Demo Role control (university prototype demonstration
 * only — not authentication), user chip. No role navigation links; each
 * role exposes only its own navigation.
 */
export function TopNav(): React.JSX.Element {
  const { state, setRole, resetDemo } = useAppStore();
  const navigate = useNavigate();
  const [confirmingReset, setConfirmingReset] = useState(false);

  function onRoleChange(role: Role): void {
    setRole(role);
    navigate(ROLE_HOME[role]);
  }

  const chip: Record<Role, string> = {
    CONTRACTOR: 'Demo Operator',
    OPERATIONS: 'M. King · Operations',
    CUSTOMER_INFORMATION: 'T. Reid · Customer Info',
  };

  return (
    <header className="topnav">
      <div className="wrap topnav-inner">
        <Link
          className="brand brand-link"
          to={ROLE_HOME[state.role]}
          aria-label="Go to role home"
        >
          <span className="brand-mark">AT</span> {CONTEXT_LABEL[state.role]}
        </Link>
        {state.role === 'OPERATIONS' && <span className="role-tag">Operations</span>}
        {state.role === 'CUSTOMER_INFORMATION' && (
          <span className="role-tag">Customer Information</span>
        )}
        <span className="user-chip">{chip[state.role]}</span>
        <label className="demo-role">
          Demo Role
          <select
            value={state.role}
            onChange={(e) => onRoleChange(e.target.value as Role)}
            title="Demonstration only — switches the prototype role, not a login."
            aria-label="Demo Role (prototype demonstration only)"
          >
            {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </label>
        <button
          className="demo-reset"
          type="button"
          onClick={() => setConfirmingReset(true)}
          title="Prototype only — restores the demo scenario without reloading."
        >
          ↺ Reset demo
        </button>
      </div>
      {confirmingReset && (
        <ConfirmDialog
          title="Reset demo scenario?"
          summary={[
            'This restores INC-1043 and related demo records to the starting presentation state.',
          ]}
          requireCheck={false}
          disclaimer="Prototype control only — not part of the operational workflow."
          confirmLabel="Reset Demo"
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

export function Footer({ role }: { role: Role }): React.JSX.Element {
  return (
    <footer className="footer">
      <div className="wrap footer-inner">
        <span>{FOOTER_CONTEXT[role]}</span>
        <span>Illustrative workflow only · All times NZDT · Not a live operational record</span>
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
