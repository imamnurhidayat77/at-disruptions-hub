import { NavLink } from 'react-router-dom';

/** Customer Information sub-navigation: only comms-relevant destinations. */
export function CommsNav(): React.JSX.Element {
  const cls = ({ isActive }: { isActive: boolean }): string => (isActive ? 'active' : '');
  return (
    <nav className="subnav" aria-label="Customer Information navigation">
      <NavLink to="/comms" end className={cls}>
        Overview
      </NavLink>
      <NavLink to="/comms/queue" className={cls}>
        Communication Queue
      </NavLink>
      <NavLink to="/comms/published" className={cls}>
        Published Updates
      </NavLink>
      <NavLink to="/comms/templates" className={cls}>
        Templates
      </NavLink>
      <NavLink to="/comms/analytics" className={cls}>
        Analytics
      </NavLink>
    </nav>
  );
}
