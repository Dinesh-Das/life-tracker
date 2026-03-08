import React from 'react'
import Modal from './Modal'

const EMOJIS = ['✨', '💪', '📚', '🧘', '💧', '🥗', '🚶', '😴', '💊', '🍎', '🍵', '🧠', '💻', '💰', '🌱', '🛁', '🕯️', '✍️', '🏀', '🎸']

const EmojiPicker = ({ isOpen, onClose, onSelect }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Choose Icon">
            <div className="grid grid-cols-5 gap-4">
                {EMOJIS.map(emoji => (
                    <button
                        key={emoji}
                        onClick={() => {
                            onSelect(emoji)
                            onClose()
                        }}
                        className="text-4xl p-4 hover:bg-gray-100 rounded-2xl transition-all hover:scale-110 active:scale-90"
                    >
                        {emoji}
                    </button>
                ))}
            </div>
        </Modal>
    )
}

export default EmojiPicker
