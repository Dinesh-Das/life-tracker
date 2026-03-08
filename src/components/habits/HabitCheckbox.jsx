function HabitCheckbox({ done, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`
        w-4 h-4 rounded-[3px] border transition-all duration-150 flex items-center justify-center
        ${done
                    ? 'bg-primary border-primary-dark shadow-sm text-white animate-checkPop'
                    : 'bg-white border-gray-300 hover:bg-primary/10 hover:border-primary cursor-pointer'}
      `}
        >
            {done && <span className="text-[10px] font-black leading-none mt-[1px]">✓</span>}
        </button>
    );
}

export default HabitCheckbox;
