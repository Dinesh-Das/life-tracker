import React, { createContext, useContext, useState, useEffect } from 'react';
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

    // Auto-update to "Today" if the date changes while the app is open,
    // but only if the user is currently looking at "Today's" month.
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const today = new Date();
            const isLookingAtToday = currentDate.getMonth() === today.getMonth() && 
                                   currentDate.getFullYear() === today.getFullYear();

            if (isLookingAtToday && now.getDate() !== currentDate.getDate()) {
                setCurrentDate(now);
            }
        }, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, [currentDate]);

    const toggleHideFemaleData = (val) => {
        setHideFemaleData(val);
        localStorage.setItem('hideFemaleData', val);
    };

    // Gender comes from Auth context (Google profile / Settings sheet)
    // 'male' | 'female' | 'needs_selection' | null
    const gender = userGender || 'needs_selection';

    const setMonth = (monthIndex) => {
        const d = new Date(currentDate);
        // Fix: Set day to 1 first to avoid rollover bugs (e.g. March 31 -> April 31 = May 1)
        d.setDate(1);
        d.setMonth(monthIndex);
        
        // If we are moving to the current real-world month, set it to the real "today"
        const today = new Date();
        if (d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()) {
            setCurrentDate(today);
        } else {
            setCurrentDate(d);
        }
    };

    const nextMonth = () => {
        const next = new Date(currentDate);
        next.setDate(1);
        next.setMonth(next.getMonth() + 1);
        
        const today = new Date();
        if (next.getMonth() === today.getMonth() && next.getFullYear() === today.getFullYear()) {
            setCurrentDate(today);
        } else {
            setCurrentDate(next);
        }
    };

    const prevMonth = () => {
        const prev = new Date(currentDate);
        prev.setDate(1);
        prev.setMonth(prev.getMonth() - 1);

        const today = new Date();
        if (prev.getMonth() === today.getMonth() && prev.getFullYear() === today.getFullYear()) {
            setCurrentDate(today);
        } else {
            setCurrentDate(prev);
        }
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
