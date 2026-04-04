import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { AppProvider } from './context/AppContext';
import Sidebar from './components/shared/Sidebar';
import Dashboard from './pages/Dashboard';
import CalendarPage from './pages/CalendarPage';
import TransactionsPage from './pages/TransactionsPage';
import CreditCardsPage from './pages/CreditCardsPage';
import BudgetPage from './pages/BudgetPage';
import SavingsPage from './pages/SavingsPage';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <BrowserRouter>
      <AppProvider>
        <div className="flex h-screen overflow-hidden bg-slate-50">
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Mobile topbar */}
            <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-100">
              <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-slate-100">
                <Menu size={20} className="text-slate-600" />
              </button>
              <span className="text-lg font-bold text-blue-600">financeiro</span>
            </header>

            {/* Main content */}
            <main className="flex-1 overflow-y-auto p-6">
              <div className="max-w-5xl mx-auto">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route path="/transactions" element={<TransactionsPage />} />
                  <Route path="/credit-cards" element={<CreditCardsPage />} />
                  <Route path="/budget" element={<BudgetPage />} />
                  <Route path="/savings" element={<SavingsPage />} />
                </Routes>
              </div>
            </main>
          </div>
        </div>
      </AppProvider>
    </BrowserRouter>
  );
}
