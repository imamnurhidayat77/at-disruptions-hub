import { ROLE_LABELS, type Role } from '../domain/types.js';

/**
 * Per-role page configuration. Navigation and copy change by role;
 * the incident record rendered below never does (single shared store).
 * Items without an `href` are upcoming Phase 2–4 features, shown
 * disabled with an explicit phase tag — never dead links.
 */

export interface RoleNavItem {
  label: string;
  href?: string;
  phaseNote?: string;
}

export interface RolePageConfig {
  role: Role;
  path: string;
  title: string;
  need: string;
  nav: RoleNavItem[];
}

export const ROLE_PAGES: Record<Role, RolePageConfig> = {
  CONTRACTOR: {
    role: 'CONTRACTOR',
    path: '/contractor',
    title: 'Contractor overview',
    need: 'Report disruption quickly without completing unnecessary AT-internal work.',
    nav: [
      { label: 'My incidents', href: '#incidents' },
      { label: 'Shared incident record', href: '#incident' },
      { label: 'Timeline', href: '#timeline' },
      { label: 'Report disruption', phaseNote: 'Phase 2' },
      { label: 'Submission success view', phaseNote: 'Phase 2' },
    ],
  },
  OPERATIONS: {
    role: 'OPERATIONS',
    path: '/operations',
    title: 'Operations dashboard',
    need: 'Understand what happened, prioritise the incident, assign ownership and coordinate recovery.',
    nav: [
      { label: 'All incidents', href: '#incidents' },
      { label: 'Shared incident record', href: '#incident' },
      { label: 'Severity assessment', href: '#severity' },
      { label: 'Communication status', href: '#comms' },
      { label: 'Recovery workspace', phaseNote: 'Phase 3' },
    ],
  },
  CUSTOMER_INFORMATION: {
    role: 'CUSTOMER_INFORMATION',
    path: '/comms',
    title: 'Communications dashboard',
    need: 'Receive validated information early enough to communicate without waiting for recovery to finish.',
    nav: [
      { label: 'Communication queue', href: '#incidents' },
      { label: 'Shared incident record', href: '#incident' },
      { label: 'KPI and timer', href: '#comms' },
      { label: 'Message composer', phaseNote: 'Phase 4' },
      { label: 'Publish flow', phaseNote: 'Phase 4' },
    ],
  },
};

export function roleTitle(role: Role): string {
  return `${ROLE_LABELS[role]} — ${ROLE_PAGES[role].title}`;
}
