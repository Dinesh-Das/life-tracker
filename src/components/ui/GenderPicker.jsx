import { useAuth } from '../../context/AuthContext';

function GenderPicker() {
    const { updateUserGender } = useAuth();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl animate-fade-up">
                <div className="text-center mb-8">
                    <div className="text-5xl mb-4">👋</div>
                    <h2 className="text-2xl font-serif font-bold text-gray-900 mb-2">Welcome!</h2>
                    <p className="text-sm text-gray-500">
                        Select your gender to personalize your experience.
                        <br />
                        <span className="text-xs text-gray-400">This determines which tracking features you see.</span>
                    </p>
                </div>

                <div className="space-y-3">
                    <button
                        onClick={() => updateUserGender('male')}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-blue-100 bg-blue-50 hover:border-blue-400 hover:bg-blue-100 transition-all group"
                    >
                        <span className="text-3xl">♂</span>
                        <div className="text-left">
                            <span className="text-sm font-bold text-blue-800 block">Male</span>
                            <span className="text-[10px] text-blue-500 uppercase tracking-widest font-bold">Habits · Tasks · Dashboard</span>
                        </div>
                    </button>

                    <button
                        onClick={() => updateUserGender('female')}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-rose-100 bg-rose-50 hover:border-rose-400 hover:bg-rose-100 transition-all group"
                    >
                        <span className="text-3xl">♀</span>
                        <div className="text-left">
                            <span className="text-sm font-bold text-rose-800 block">Female</span>
                            <span className="text-[10px] text-rose-500 uppercase tracking-widest font-bold">All features + Cycle Tracker</span>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default GenderPicker;
