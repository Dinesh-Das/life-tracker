/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getMonthName } from '../lib/dateUtils';
import { useAuth } from './AuthContext';

const AppContext = createContext();

export function AppProvider({ children }) {
    const { userGender } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState('daily');
    // Tracks whether the user is "live" (following today) vs browsing a historical month.
    // When true, the interval will auto-advance across day/month/year boundaries.
    const [isFollowingToday, setIsFollowingToday] = useState(true);

    const currentMonth = getMonthName(currentDate.getMonth());
    const currentYear = currentDate.getFullYear();
    const currentMonthIndex = currentDate.getMonth();

    const [hideFemaleData, setHideFemaleData] = useState(() => {
        return localStorage.getItem('hideFemaleData') === 'true';
    });

    // Auto-sync with real clock every 30s.
    // If the user is in "follow today" mode this catches day, month AND year rollovers.
    useEffect(() => {
        const interval = setInterval(() => {
            if (!isFollowingToday) return;
            const now = new Date();
            const sameDay =
                now.getFullYear() === currentDate.getFullYear() &&
                now.getMonth()    === currentDate.getMonth()    &&
                now.getDate()     === currentDate.getDate();
            if (!sameDay) {
                setCurrentDate(now);
            }
        }, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, [currentDate, isFollowingToday]);

    const toggleHideFemaleData = useCallback((val) => {
        setHideFemaleData(val);
        localStorage.setItem('hideFemaleData', val);
    }, []);

    // Gender comes from Auth context (Google profile / Settings sheet)
    // 'male' | 'female' | 'needs_selection' | null
    const gender = userGender || 'needs_selection';

    const selectDate = useCallback((value) => {
        if (!(value instanceof Date) || Number.isNaN(value.getTime())) return;
        const next = new Date(value.getFullYear(), value.getMonth(), value.getDate());
        const today = new Date();
        const followsToday =
            next.getFullYear() === today.getFullYear() &&
            next.getMonth() === today.getMonth() &&
            next.getDate() === today.getDate();
        setCurrentDate(followsToday ? today : next);
        setIsFollowingToday(followsToday);
    }, []);

    const goToToday = useCallback(() => {
        setCurrentDate(new Date());
        setIsFollowingToday(true);
    }, []);

    const setMonth = useCallback((monthIndex) => {
        const today = new Date();
        // Set day=1 first to prevent rollover bugs (e.g. March 31 → April 31 → May 1)
        const d = new Date(currentDate);
        d.setDate(1);
        d.setMonth(monthIndex);

        if (d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()) {
            // Navigating back to real today — resume live-following
            setCurrentDate(today);
            setIsFollowingToday(true);
        } else {
            setCurrentDate(d);
            setIsFollowingToday(false);
        }
    }, [currentDate]);

    // Multi-year support: jump to any year. Returning to the real current
    // year resumes live-following of today.
    const setYear = useCallback((year) => {
        const today = new Date();
        if (year === today.getFullYear()) {
            setCurrentDate(today);
            setIsFollowingToday(true);
        } else {
            const d = new Date(currentDate);
            d.setDate(1);
            d.setFullYear(year);
            setCurrentDate(d);
            setIsFollowingToday(false);
        }
    }, [currentDate]);
    const nextMonth = useCallback(() => {
        const next = new Date(currentDate);
        next.setDate(1);
        next.setMonth(next.getMonth() + 1);

        const today = new Date();
        if (next.getMonth() === today.getMonth() && next.getFullYear() === today.getFullYear()) {
            setCurrentDate(today);
            setIsFollowingToday(true);
        } else {
            setCurrentDate(next);
            setIsFollowingToday(false);
        }
    }, [currentDate]);

    const prevMonth = useCallback(() => {
        const prev = new Date(currentDate);
        prev.setDate(1);
        prev.setMonth(prev.getMonth() - 1);

        const today = new Date();
        if (prev.getMonth() === today.getMonth() && prev.getFullYear() === today.getFullYear()) {
            setCurrentDate(today);
            setIsFollowingToday(true);
        } else {
            setCurrentDate(prev);
            setIsFollowingToday(false);
        }
    }, [currentDate]);

    const value = useMemo(() => ({
            currentDate,
            currentMonth,
            currentYear,
            currentMonthIndex,
            gender,
            view,
            setView,
            setMonth,
            setYear,
            nextMonth,
            prevMonth,
            selectDate,
            goToToday,
            hideFemaleData,
            toggleHideFemaleData,
        }), [
            currentDate, currentMonth, currentYear, currentMonthIndex, gender, view,
            setMonth, setYear, nextMonth, prevMonth, selectDate, goToToday,
            hideFemaleData, toggleHideFemaleData,
        ]);

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
}

export const useAppContext = () => useContext(AppContext);
