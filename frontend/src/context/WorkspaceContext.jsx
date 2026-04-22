import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const [workspaces, setWorkspaces] = useState([]);
  const [current, setCurrent] = useState(null); // { id, name, my_role }
  const [loading, setLoading] = useState(true);

  const loadWorkspaces = useCallback(async () => {
    try {
      const { data } = await api.get('/workspaces');
      setWorkspaces(data);
      return data;
    } catch {
      return [];
    }
  }, []);

  const selectWorkspace = useCallback((ws) => {
    setCurrent(ws);
    localStorage.setItem('workspace_id', ws.id);
    api.defaults.headers.common['X-Workspace-Id'] = ws.id;
  }, []);

  const init = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadWorkspaces();
      if (!data.length) { setLoading(false); return; }

      const savedId = parseInt(localStorage.getItem('workspace_id'));
      const saved = savedId ? data.find(w => w.id === savedId) : null;
      const ws = saved || data[0];
      selectWorkspace(ws);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [loadWorkspaces, selectWorkspace]);

  // Called after login
  const initAfterLogin = init;

  const clearWorkspace = useCallback(() => {
    setCurrent(null);
    setWorkspaces([]);
    localStorage.removeItem('workspace_id');
    delete api.defaults.headers.common['X-Workspace-Id'];
  }, []);

  return (
    <WorkspaceContext.Provider value={{
      workspaces, current, loading,
      loadWorkspaces, selectWorkspace, initAfterLogin, clearWorkspace,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() { return useContext(WorkspaceContext); }
