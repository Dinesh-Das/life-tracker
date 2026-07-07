import React from 'react'

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Content — themed surface so modals match light & dark mode */}
            <div
                className="relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
                style={{ background: 'var(--card-solid-bg)', border: '1px solid var(--card-solid-border)' }}
            >
                <div className="p-6 flex justify-between items-center" style={{ borderBottom: '1px solid var(--card-solid-border)' }}>
                    <h3 className="text-xl font-serif font-black" style={{ color: 'var(--text-heading)' }}>{title}</h3>
                    <button
                        onClick={onClose}
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
