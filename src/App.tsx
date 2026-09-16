import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { DataProvider } from './context/DataContext'
import { ToastProvider } from './context/ToastContext'
import { AppShell } from './components/AppShell'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import CustomerProfile from './pages/CustomerProfile'
import QuotationList from './pages/QuotationList'
import QuotationEditor from './pages/QuotationEditor'
import QuotationView from './pages/QuotationView'
import JobList from './pages/JobList'
import JobView from './pages/JobView'
import ServiceReportList from './pages/ServiceReportList'
import ServiceReportEditor from './pages/ServiceReportEditor'
import ServiceReportView from './pages/ServiceReportView'
import InvoiceList from './pages/InvoiceList'
import InvoiceEditor from './pages/InvoiceEditor'
import InvoiceView from './pages/InvoiceView'
import Payments from './pages/Payments'
import StatementList from './pages/StatementList'
import StatementView from './pages/StatementView'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import { EmptyState } from './components/ui'

/**
 * JREC Stainless Steel Fabrication — Business Management System.
 * Direct-access application: no login, no auth — opens straight to the Dashboard.
 */
export default function App() {
  return (
    <DataProvider>
      <ToastProvider>
        <BrowserRouter>
          <AppShell>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/customers/:id" element={<CustomerProfile />} />
              <Route path="/quotations" element={<QuotationList />} />
              <Route path="/quotations/new" element={<QuotationEditor />} />
              <Route path="/quotations/:id" element={<QuotationView />} />
              <Route path="/quotations/:id/edit" element={<QuotationEditor />} />
              <Route path="/jobs" element={<JobList />} />
              <Route path="/jobs/:id" element={<JobView />} />
              <Route path="/service-reports" element={<ServiceReportList />} />
              <Route path="/service-reports/new" element={<ServiceReportEditor />} />
              <Route path="/service-reports/:id" element={<ServiceReportView />} />
              <Route path="/service-reports/:id/edit" element={<ServiceReportEditor />} />
              <Route path="/invoices" element={<InvoiceList />} />
              <Route path="/invoices/new" element={<InvoiceEditor />} />
              <Route path="/invoices/:id" element={<InvoiceView />} />
              <Route path="/invoices/:id/edit" element={<InvoiceEditor />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/billing-statements" element={<StatementList />} />
              <Route path="/billing-statements/:id" element={<StatementView />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
              <Route
                path="*"
                element={
                  <div className="page">
                    <EmptyState title="Page not found" hint="The page you are looking for does not exist." />
                  </div>
                }
              />
            </Routes>
          </AppShell>
        </BrowserRouter>
      </ToastProvider>
    </DataProvider>
  )
}
