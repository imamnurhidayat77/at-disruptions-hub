import { NavLink } from 'react-router-dom';
import { SapNavChip } from '../../components/SapStatus.js';

/** AT Operations primary navigation — operations destinations only. */
export function OpsNav(): React.JSX.Element {
  const cls = ({ isActive }: { isActive: boolean }): string => (isActive ? 'active' : '');
  return (
    <nav className="subnav" aria-label="AT Operations navigation">
      <NavLink to="/operations" end className={cls}>
        Overview
      </NavLink>
      <NavLink to="/operations/incoming" className={cls}>
        Incoming
      </NavLink>
      <NavLink to="/operations/incidents" className={cls}>
        Incidents
      </NavLink>
      <NavLink to="/operations/recovery" className={cls}>
        Recovery
      </NavLink>
      <NavLink to="/operations/reviews" className={cls}>
        Reviews
      </NavLink>
      <NavLink to="/operations/analytics" className={cls}>
        Analytics
      </NavLink>
      <SapNavChip />
    </nav>
  );
}
