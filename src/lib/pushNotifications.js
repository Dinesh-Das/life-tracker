function decodeKey(value) {
    const padding = '='.repeat((4 - value.length % 4) % 4);
    const raw = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from([...raw].map(char => char.charCodeAt(0)));
}

export function pushConfiguration() {
    return {
        supported: 'serviceWorker' in navigator && 'PushManager' in window,
        configured: Boolean(import.meta.env.VITE_PUSH_PUBLIC_KEY && import.meta.env.VITE_PUSH_SUBSCRIBE_URL),
    };
}

export async function subscribeToPush() {
    const config = pushConfiguration();
    if (!config.supported) throw new Error('Push notifications are not supported by this browser.');
    if (!config.configured) throw new Error('Push service is not configured. Add VITE_PUSH_PUBLIC_KEY and VITE_PUSH_SUBSCRIBE_URL.');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('Notification permission was not granted.');
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeKey(import.meta.env.VITE_PUSH_PUBLIC_KEY) });
    const response = await fetch(import.meta.env.VITE_PUSH_SUBSCRIBE_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(subscription),
    });
    if (!response.ok) throw new Error('The push subscription service rejected the request.');
    return subscription;
}
