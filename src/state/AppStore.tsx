import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import type { ReactNode } from 'react';
import type { Incident, Role } from '../domain/types.js';
import {
  clearDemoState,
  freshDemoState,
  loadDemoState,
  saveDemoState,
} from '../services/incidentRepository.js';

/**
 * Shared application store — ONE incident record set for all roles.
 * Role switching changes `role` only; `incidents` are untouched, so every
 * role always sees the same record. Persisted to localStorage as a demo
 * convenience; Reset restores the canonical seed.
 */

export interface AppState {
  role: Role;
  incidents: Incident[];
}

export type AppAction =
  | { type: 'SET_ROLE'; role: Role }
  | { type: 'RESET_DEMO' };

function initState(initialRole: Role): AppState {
  return { role: initialRole, incidents: loadDemoState() ?? freshDemoState() };
}

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_ROLE':
      // No-op when the role is unchanged (deep links re-assert it on mount).
      return state.role === action.role ? state : { ...state, role: action.role };
    case 'RESET_DEMO': {
      clearDemoState();
      return { ...state, incidents: freshDemoState() };
    }
  }
}

interface Store {
  state: AppState;
  setRole: (role: Role) => void;
  resetDemo: () => void;
  getIncident: (id: string) => Incident | undefined;
}

const AppStoreContext = createContext<Store | null>(null);

export function AppStoreProvider({
  initialRole = 'CONTRACTOR',
  children,
}: {
  initialRole?: Role;
  children: ReactNode;
}): React.JSX.Element {
  const [state, dispatch] = useReducer(reducer, initialRole, initState);

  // Persist the shared record (demo convenience only).
  useEffect(() => {
    saveDemoState(state.incidents);
  }, [state.incidents]);

  const store = useMemo<Store>(
    () => ({
      state,
      setRole: (role: Role) => dispatch({ type: 'SET_ROLE', role }),
      resetDemo: () => dispatch({ type: 'RESET_DEMO' }),
      getIncident: (id: string) => state.incidents.find((i) => i.id === id),
    }),
    [state],
  );

  return <AppStoreContext.Provider value={store}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): Store {
  const store = useContext(AppStoreContext);
  if (!store) throw new Error('useAppStore must be used inside <AppStoreProvider>');
  return store;
}
