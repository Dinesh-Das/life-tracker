function HabitCheckbox({ status, label, disabled = false, onClick }) {
    const done = status === true;
    const frozen = status === 'skip';
    const state = disabled ? 'future, unavailable' : done ? 'completed' : frozen ? 'frozen, neutral' : 'not completed';

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={`${label}: ${state}`}
            aria-pressed={done}
            title={disabled ? 'Future dates cannot be edited' : frozen ? 'Frozen day (neutral)' : undefined}
            className={`
                w-4 h-4 rounded-[3px] border transition-all duration-150 flex items-center justify-center
                ${done
                    ? 'bg-primary border-primary-dark shadow-sm text-white animate-checkPop'
                    : frozen
                        ? 'border-sky-300 bg-sky-50 text-sky-600'
                        : 'bg-white border-gray-300 hover:bg-primary/10 hover:border-primary cursor-pointer'}
                ${disabled ? 'cursor-not-allowed opacity-40' : ''}
            `}
        >
            {done && <span aria-hidden="true" className="text-[10px] font-black leading-none mt-[1px]">✓</span>}
            {frozen && <span aria-hidden="true" className="text-[8px] leading-none">❄</span>}
        </button>
    );
}

export default HabitCheckbox;
