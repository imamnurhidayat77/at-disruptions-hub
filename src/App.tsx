import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Footer, MenuBar, TopNav } from './components/chrome.js';
import { ContractorOverview } from './routes/contractor/ContractorOverview.js';
import { ContractorHelp } from './routes/contractor/Help.js';
import { IncidentDetailPage } from './routes/contractor/IncidentDetailPage.js';
import { MyIncidents } from './routes/contractor/MyIncidents.js';
import { ReportPage } from './routes/contractor/ReportPage.js';
import { SentPage } from './routes/contractor/SentPage.js';
import { Composer } from './routes/comms/Composer.js';
import { AnalyticsPage } from './routes/comms/AnalyticsPage.js';
import { CommsOverview } from './routes/comms/CommsOverview.js';
import { PublishedPage } from './routes/comms/PublishedPage.js';
import { PublishedSuccess } from './routes/comms/PublishedSuccess.js';
import { QueuePage } from './routes/comms/QueuePage.js';
import { TemplatesPage } from './routes/comms/TemplatesPage.js';
import { CloseIncidentPage } from './routes/operations/CloseIncidentPage.js';
import { IncidentWorkspace } from './routes/operations/IncidentWorkspace.js';
import { IncomingDetailPage } from './routes/operations/IncomingDetailPage.js';
import { OwnerPage } from './routes/operations/OwnerPage.js';
import { SeverityPage } from './routes/operations/SeverityPage.js';
import { OperationsOverview } from './routes/operations/OperationsOverview.js';
import { Incoming } from './routes/operations/Incoming.js';
import { Incidents } from './routes/operations/Incidents.js';
import { Recovery } from './routes/operations/Recovery.js';
import { Reviews } from './routes/operations/Reviews.js';
import { Analytics } from './routes/operations/Analytics.js';
import { AppStoreProvider, useAppStore } from './state/AppStore.js';

function Shell(): React.JSX.Element {
  const { state } = useAppStore();
  return (
    <>
      <TopNav />
      <MenuBar role={state.role} />
      <div className="shell-content">
        <main className="container">
        <Routes>
          <Route path="/" element={<Navigate to="/contractor" replace />} />
          <Route path="/contractor" element={<ContractorOverview />} />
          <Route path="/contractor/report" element={<ReportPage />} />
          <Route path="/contractor/sent/:id" element={<SentPage />} />
          <Route path="/contractor/incidents" element={<MyIncidents />} />
          <Route path="/contractor/help" element={<ContractorHelp />} />
          <Route path="/contractor/incident/:id" element={<IncidentDetailPage />} />
          <Route path="/operations" element={<OperationsOverview />} />
          <Route path="/operations/incoming" element={<Incoming />} />
          <Route path="/operations/incidents" element={<Incidents />} />
          <Route path="/operations/recovery" element={<Recovery />} />
          <Route path="/operations/reviews" element={<Reviews />} />
          <Route path="/operations/analytics" element={<Analytics />} />
          <Route path="/operations/incident/:id" element={<IncidentWorkspace />} />
          <Route path="/operations/incident/:id/close" element={<CloseIncidentPage />} />
          <Route path="/operations/incident/:id/severity" element={<SeverityPage />} />
          <Route path="/operations/incident/:id/owner" element={<OwnerPage />} />
          <Route path="/operations/incoming/:id" element={<IncomingDetailPage />} />
          <Route path="/comms" element={<CommsOverview />} />
          <Route path="/comms/queue" element={<QueuePage />} />
          <Route path="/comms/published" element={<PublishedPage />} />
          <Route path="/comms/published/:id" element={<PublishedSuccess />} />
          <Route path="/comms/templates" element={<TemplatesPage />} />
          <Route path="/comms/analytics" element={<AnalyticsPage />} />
          <Route path="/comms/incident/:id" element={<Composer />} />
          <Route path="*" element={<Navigate to="/contractor" replace />} />
        </Routes>
          </main>
          <Footer />
      </div>
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
