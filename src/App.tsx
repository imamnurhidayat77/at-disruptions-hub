import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { DemoBar, Footer, TopNav } from './components/chrome.js';
import { ContractorOverview } from './routes/contractor/ContractorOverview.js';
import { IncidentDetailPage } from './routes/contractor/IncidentDetailPage.js';
import { ReportPage } from './routes/contractor/ReportPage.js';
import { Composer } from './routes/comms/Composer.js';
import { CommsOverview } from './routes/comms/CommsOverview.js';
import { IncidentWorkspace } from './routes/operations/IncidentWorkspace.js';
import { OperationsOverview } from './routes/operations/OperationsOverview.js';
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
          <Route path="/contractor" element={<ContractorOverview />} />
          <Route path="/contractor/report" element={<ReportPage />} />
          <Route path="/contractor/incident/:id" element={<IncidentDetailPage />} />
          <Route path="/operations" element={<OperationsOverview />} />
          <Route path="/operations/incident/:id" element={<IncidentWorkspace />} />
          <Route path="/comms" element={<CommsOverview />} />
          <Route path="/comms/incident/:id" element={<Composer />} />
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
