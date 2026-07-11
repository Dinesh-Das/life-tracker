import { useCallback, useEffect, useState } from 'react';
import { loadProductSettings, saveProductSetting } from '../lib/productSettings';

export function useProductSettings(spreadsheetId) {
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const reload = useCallback(async () => {
        if (!spreadsheetId) return;
        setLoading(true);
        try { setSettings(await loadProductSettings(spreadsheetId)); }
        finally { setLoading(false); }
    }, [spreadsheetId]);
    useEffect(() => { void reload(); }, [reload]);
    const save = useCallback(async (key, value) => {
        await saveProductSetting(spreadsheetId, key, value);
        setSettings(current => ({ ...current, [key]: String(value) }));
    }, [spreadsheetId]);
    return { settings, loading, save, reload };
}
