import { Navigate, useParams } from 'react-router-dom';

/**
 * Owner Assignment — redirect stub.
 * The former standalone owner page is merged into the SeverityPage intake
 * wizard (Step 2); this route redirects there so deep links stay valid.
 */
export function OwnerPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/operations/incident/${id}/severity`} replace />;
}
