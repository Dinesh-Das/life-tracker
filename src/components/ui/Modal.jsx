import { useEffect, useId, useRef } from 'react'

const Modal = ({ isOpen, onClose, title, children }) => {
    const titleId = useId()
    const dialogRef = useRef(null)
    useEffect(() => {
        if (!isOpen) return undefined
        const previous = document.activeElement
        const dialog = dialogRef.current
        dialog?.focus()
        const onKeyDown = (event) => {
            if (event.key === 'Escape') onClose()
            if (event.key !== 'Tab' || !dialog) return
            const focusable = [...dialog.querySelectorAll('button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])')]
                .filter(element => !element.disabled)
            if (!focusable.length) return
            const first = focusable[0]
            const last = focusable[focusable.length - 1]
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
            if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
        }
        document.addEventListener('keydown', onKeyDown)
        return () => { document.removeEventListener('keydown', onKeyDown); previous?.focus?.() }
    }, [isOpen, onClose])
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Content — themed surface so modals match light & dark mode */}
            <div
                className="relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
                style={{ background: 'var(--card-solid-bg)', border: '1px solid var(--card-solid-border)' }}
            >
                <div className="p-6 flex justify-between items-center" style={{ borderBottom: '1px solid var(--card-solid-border)' }}>
                    <h3 id={titleId} className="text-xl font-serif font-black" style={{ color: 'var(--text-heading)' }}>{title}</h3>
                    <button
                        onClick={onClose}
                        aria-label="Close dialog"
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:opacity-70 transition-opacity"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        ✕
                    </button>
                </div>
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    )
}

export default Modal
