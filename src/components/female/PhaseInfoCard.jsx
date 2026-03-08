/**
 * PhaseInfoCard — displays rich information about the current cycle phase.
 * Shown below the phase banner on the FemaleTracker page.
 */

const PHASE_DATA = {
    Menstrual: {
        emoji: '🔴',
        days: 'Days 1–5',
        description: 'Your uterine lining is shedding. Estrogen and progesterone are at their lowest. This is the reset phase — your body deserves deep rest and nourishment.',
        body: [
            'Uterine lining sheds',
            'Estrogen & progesterone at lowest',
            'Immune function slightly lowered',
            'Blood loss — iron levels may dip',
        ],
        symptoms: ['Cramps · Lower back pain', 'Fatigue · Headaches', 'Bloating · Mood dips', 'Breast sensitivity'],
        foods: ['🥩 Iron-rich: spinach, lentils, red meat', '🍫 Dark chocolate (magnesium)', '🫚 Omega-3: salmon, walnuts', '🍵 Ginger & chamomile tea', '🍲 Warm soups & stews'],
        activities: ['🧘 Gentle yoga & stretching', '🚶 Light walks', '😴 Extra sleep & rest', '🛁 Warm baths for cramp relief'],
        avoid: ['Heavy high-intensity workouts', 'Cold & raw foods', 'Excess caffeine & alcohol', 'Salty processed foods'],
        tip: 'Track your flow intensity each day — heavy, medium, light, or spotting. This helps identify patterns over time.',
        bgGradient: 'from-rose-50 to-pink-50',
        accent: 'rose',
        textColor: 'text-rose-700',
        borderColor: 'border-rose-200',
        tagColor: 'bg-rose-100 text-rose-700',
    },
    Follicular: {
        emoji: '🌱',
        days: 'Days 6–13',
        description: 'Estrogen rises as follicles develop in the ovary. Energy, creativity, confidence, and mood start climbing — this is a great time to start new things.',
        body: [
            'Estrogen gradually rises',
            'One follicle becomes dominant',
            'Uterine lining begins to rebuild',
            'Metabolism slightly faster',
        ],
        symptoms: ['Rising energy & optimism', 'Sharper focus & memory', 'Clearer skin', 'Better sleep quality'],
        foods: ['🥦 Leafy greens & cruciferous veggies', '🌰 Seeds: flaxseed, pumpkin seeds', '🥚 Eggs & lean protein', '🫙 Fermented foods (yoghurt, kimchi)', '🫐 Antioxidant-rich berries'],
        activities: ['💪 Strength training & HIIT', '🏃 High-intensity cardio', '🎨 Creative projects', '💬 Social plans & networking'],
        avoid: ['Sedentary long days', 'Skipping breakfast'],
        tip: 'You\'ll feel your best energy here. Channel it into workouts, big projects, or social commitments you usually put off.',
        bgGradient: 'from-violet-50 to-purple-50',
        accent: 'violet',
        textColor: 'text-violet-700',
        borderColor: 'border-violet-200',
        tagColor: 'bg-violet-100 text-violet-700',
    },
    Ovulatory: {
        emoji: '🌸',
        days: 'Day 14 (± 2 days)',
        description: 'Estrogen peaks and LH (luteinizing hormone) triggers egg release. This is your peak fertility window — highest energy, confidence, and libido.',
        body: [
            'LH surge triggers ovulation',
            'Egg released from dominant follicle',
            'Cervical mucus becomes clear & stretchy',
            'Body temperature rises slightly',
        ],
        symptoms: ['Mid-cycle pelvic ache (Mittelschmerz)', 'Clear egg-white discharge', 'Peak energy & confidence', 'Heightened libido'],
        foods: ['🫐 Antioxidants: berries, leafy greens', '🐟 Light proteins: fish, tofu', '🫒 Healthy fats: avocado, olive oil', '💧 Extra hydration'],
        activities: ['🏆 Peak performance workouts', '🎤 Public speaking & presentations', '💑 Intimacy & date nights', '🌟 Important meetings or events'],
        avoid: ['Excessive caffeine', 'Missing fertile window if trying to conceive'],
        tip: 'Ovulation lasts 12–36 hours, but the fertile window spans 5 days before to 1 day after. Track discharge texture — it becomes clear and stretchy like egg whites.',
        bgGradient: 'from-emerald-50 to-teal-50',
        accent: 'emerald',
        textColor: 'text-emerald-700',
        borderColor: 'border-emerald-200',
        tagColor: 'bg-emerald-100 text-emerald-700',
    },
    Luteal: {
        emoji: '🍂',
        days: 'Days 15–28',
        description: 'Progesterone rises as the corpus luteum forms. If no pregnancy occurs, hormone levels drop, triggering PMS symptoms and eventually your next period.',
        body: [
            'Progesterone rises & dominates',
            'Corpus luteum forms from empty follicle',
            'If no pregnancy: progesterone drops → period begins',
            'Body temperature remains slightly elevated',
        ],
        symptoms: ['Bloating & water retention', 'Breast tenderness', 'Mood swings & irritability', 'Food cravings (especially sweet/salty)', 'Fatigue in later days'],
        foods: ['🥬 Magnesium: dark leafy greens, dark chocolate', '🍠 Complex carbs: sweet potato, oats', '🐠 B6 vitamins: salmon, bananas', '🍵 Chamomile tea (calming)', '🫘 Fibre-rich legumes'],
        activities: ['🧘 Yoga & Pilates', '✍️ Journaling & reflection', '🎨 Creative & calming hobbies', '🚶 Light walks', '🫁 Breathwork & meditation'],
        avoid: ['High sodium foods (worsens bloating)', 'Excess alcohol & caffeine', 'Excessive sugar', 'Overcommitting socially'],
        tip: 'PMS symptoms are strongest in the last 3–5 days. Track your mood and cravings here — patterns help predict and prepare for next cycle.',
        bgGradient: 'from-amber-50 to-orange-50',
        accent: 'amber',
        textColor: 'text-amber-700',
        borderColor: 'border-amber-200',
        tagColor: 'bg-amber-100 text-amber-700',
    },
};

function PhaseInfoCard({ phase }) {
    const info = PHASE_DATA[phase];
    if (!info) return null;

    return (
        <div className={`bg-gradient-to-br ${info.bgGradient} border ${info.borderColor} rounded-3xl p-6 shadow-sm animate-fade-up`}>
            <div className="flex items-center gap-3 mb-5">
                <span className="text-3xl">{info.emoji}</span>
                <div>
                    <h3 className={`text-base font-black ${info.textColor}`}>{phase} Phase</h3>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${info.tagColor}`}>{info.days}</span>
                </div>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed mb-5">{info.description}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* What's Happening */}
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2.5">🔬 What's Happening</h4>
                    <ul className="space-y-1.5">
                        {info.body.map((item, i) => (
                            <li key={i} className="text-xs text-gray-700 font-medium flex items-start gap-1.5">
                                <span className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 bg-${info.accent}-400`} />
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Symptoms to Expect */}
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2.5">💬 Common Symptoms</h4>
                    <ul className="space-y-1.5">
                        {info.symptoms.map((s, i) => (
                            <li key={i} className="text-xs text-gray-700 font-medium">{s}</li>
                        ))}
                    </ul>
                </div>

                {/* Recommended Foods */}
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2.5">🍽️ Best Foods</h4>
                    <ul className="space-y-1.5">
                        {info.foods.map((f, i) => (
                            <li key={i} className="text-xs text-gray-700 font-medium leading-snug">{f}</li>
                        ))}
                    </ul>
                </div>

                {/* Activities */}
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2.5">🏃 Best Activities</h4>
                    <ul className="space-y-1.5">
                        {info.activities.map((a, i) => (
                            <li key={i} className="text-xs text-gray-700 font-medium">{a}</li>
                        ))}
                    </ul>
                    <div className="mt-3 pt-3 border-t border-white/50">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">⛔ Avoid</h4>
                        <ul className="space-y-1">
                            {info.avoid.map((a, i) => (
                                <li key={i} className="text-xs text-gray-500 font-medium">{a}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Tip */}
            <div className={`mt-4 flex items-start gap-2.5 bg-white/60 rounded-2xl p-3 border ${info.borderColor}`}>
                <span className="text-lg shrink-0">💡</span>
                <p className="text-xs font-bold text-gray-700 leading-snug">{info.tip}</p>
            </div>
        </div>
    );
}

export default PhaseInfoCard;
