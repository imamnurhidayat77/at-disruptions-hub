import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { DemoBar, Footer, TopNav } from './components/chrome.js';
import { RolePage } from './routes/RolePage.js';
import { AppStoreProvider, useAppStore } from './state/AppStore.js';

function Shell(): React.JSX.Element {
  const { state } = useAppStore();
  return (
    <>
      <TopNav role={state.role} />
      <DemoBar />
      <main className="container">
        <Routes>
          <Route path="/" element={<Navigate to="/contractor" replace />} />
          <Route path="/contractor" element={<RolePage role="CONTRACTOR" />} />
          <Route path="/operations" element={<RolePage role="OPERATIONS" />} />
          <Route path="/comms" element={<RolePage role="CUSTOMER_INFORMATION" />} />
          <Route path="*" element={<Navigate to="/contractor" replace />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}

export default function App(): React.JSX.Element {
  return (
    <BrowserRouter>
      <AppStoreProvider>
        <Shell />
      </AppStoreProvider>
    </BrowserRouter>
  );
}
