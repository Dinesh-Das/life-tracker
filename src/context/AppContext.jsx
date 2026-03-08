import React, { createContext, useContext, useState } from 'react';
import { getMonthName } from '../lib/dateUtils';
import { useAuth } from './AuthContext';

const AppContext = createContext();

export function AppProvider({ children }) {
    const { userGender } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState('daily');

    const currentMonth = getMonthName(currentDate.getMonth());
    const currentYear = currentDate.getFullYear();
    const currentMonthIndex = currentDate.getMonth();

    const [hideFemaleData, setHideFemaleData] = useState(() => {
        return localStorage.getItem('hideFemaleData') === 'true';
    });

    const toggleHideFemaleData = (val) => {
        setHideFemaleData(val);
        localStorage.setItem('hideFemaleData', val);
    };

    // Gender comes from Auth context (Google profile / Settings sheet)
    // 'male' | 'female' | 'needs_selection' | null
    const gender = userGender || 'needs_selection';

    const setMonth = (monthIndex) => {
        const d = new Date(currentDate);
        d.setMonth(monthIndex);
        setCurrentDate(d);
    };

    const nextMonth = () => {
        const next = new Date(currentDate);
        next.setMonth(next.getMonth() + 1);
        setCurrentDate(next);
    };

    const prevMonth = () => {
        const prev = new Date(currentDate);
        prev.setMonth(prev.getMonth() - 1);
        setCurrentDate(prev);
    };

    return (
        <AppContext.Provider value={{
            currentDate,
            currentMonth,
            currentYear,
            currentMonthIndex,
            gender,
            view,
            setView,
            setMonth,
            nextMonth,
            prevMonth,
            hideFemaleData,
            toggleHideFemaleData,
        }}>
            {children}
        </AppContext.Provider>
    );
}

export const useAppContext = () => useContext(AppContext);
