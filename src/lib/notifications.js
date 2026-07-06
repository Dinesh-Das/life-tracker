/**
 * Local notifications — evening check-in reminder / streak-at-risk nudge.
 * Runs while the app (or its tab) is open; uses the service worker
 * registration when available so notifications work on installed PWAs.
 */

let timerId = null;

export async function ensureNotificationPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const res = await Notification.requestPermission();
    return res === 'granted';
}

export function showNotification(title, body) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const opts = { body, icon: '/logo.png', badge: '/logo.png' };
    try {
        if (navigator.serviceWorker) {
            navigator.serviceWorker.ready
                .then(reg => reg.showNotification(title, opts))
                .catch(() => { new Notification(title, opts); });
        } else {
            new Notification(title, opts);
        }
    } catch (e) {
        console.error('Notification failed', e);
    }
}

/** Schedule a repeating reminder at the given hour (default 20:00 local). */
export function scheduleEveningReminder(hour = 20) {
    cancelReminder();
    const now = new Date();
    const next = new Date(now);
    next.setHours(hour, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    timerId = setTimeout(() => {
        showNotification(
            'LifeTracker check-in 🌿',
            "Evening reminder: log today's habits before the day ends — streaks at risk!"
        );
        scheduleEveningReminder(hour);
    }, next.getTime() - now.getTime());
}

export function cancelReminder() {
    if (timerId) {
        clearTimeout(timerId);
        timerId = null;
    }
}