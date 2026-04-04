import React, { createContext, useContext, useState, useCallback } from 'react';
import api from '../services/api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [creditCards, setCreditCards] = useState([]);

  const loadCategories = useCallback(async () => {
    const { data } = await api.get('/categories');
    setCategories(data);
  }, []);

  const loadAccounts = useCallback(async () => {
    const { data } = await api.get('/accounts');
    setAccounts(data);
  }, []);

  const loadCreditCards = useCallback(async () => {
    const { data } = await api.get('/credit-cards');
    setCreditCards(data);
  }, []);

  return (
    <AppContext.Provider value={{ categories, accounts, creditCards, loadCategories, loadAccounts, loadCreditCards }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
