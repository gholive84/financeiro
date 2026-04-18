import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import Sidebar from './components/shared/Sidebar';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import CalendarPage from './pages/CalendarPage';
import TransactionsPage from './pages/TransactionsPage';
import AccountsPage from './pages/AccountsPage';
import CreditCardsPage from './pages/CreditCardsPage';
import CategoriesPage from './pages/CategoriesPage';
import BudgetPage from './pages/BudgetPage';
import SavingsPage from './pages/SavingsPage';
import AILaunchPage from './pages/AILaunchPage';
import UsersPage from './pages/UsersPage';
import ImportPage from './pages/ImportPage';
import TagsPage from './pages/TagsPage';
import FlowPage from './pages/FlowPage';

function AppLayout() {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <AppProvider>
      <div className="flex h-screen overflow-hidden bg-slate-50">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-100">
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-slate-100">
              <Menu size={20} className="text-slate-600" />
            </button>
            <span className="text-lg font-bold text-blue-600">financeiro</span>
          </header>
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-5xl mx-auto">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/ai" element={<AILaunchPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/transactions" element={<TransactionsPage />} />
                <Route path="/accounts" element={<AccountsPage />} />
                <Route path="/credit-cards" element={<CreditCardsPage />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/budget" element={<BudgetPage />} />
                <Route path="/savings" element={<SavingsPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/import" element={<ImportPage />} />
                <Route path="/tags" element={<TagsPage />} />
                <Route path="/flow" element={<FlowPage />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </AppProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  );
}
