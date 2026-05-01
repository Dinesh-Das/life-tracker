/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react';
import { useCycle } from '../hooks/useCycle';
import { useAuth } from './AuthContext';

/**
 * CycleContext — shared cycle state across FemaleTracker and Dashboard.
 * Without this, each consumer independently fires a Google Sheets API call.
 */
const CycleContext = createContext(null);

export function CycleProvider({ children }) {
    const { spreadsheetId } = useAuth();
    const cycleData = useCycle(spreadsheetId);

    return (
        <CycleContext.Provider value={cycleData}>
            {children}
        </CycleContext.Provider>
    );
}

export function useCycleContext() {
    const ctx = useContext(CycleContext);
    if (!ctx) throw new Error('useCycleContext must be used within a CycleProvider');
    return ctx;
}
