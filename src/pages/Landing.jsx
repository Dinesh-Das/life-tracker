import { ArrowRight, BarChart3, CheckSquare2, Database, LayoutDashboard, ShieldCheck, Sparkles } from 'lucide-react';
import { Navigate } from 'react-router';
import PublicShell from '../components/layout/PublicShell';
import { useAuth } from '../context/AuthContext';

function Landing() {
    const { user, signIn } = useAuth();
    if (user) return <Navigate to="/hub" />;

    const navActions = (
        <>
            <button onClick={signIn} className="public-secondary-button hidden sm:inline-flex">Sign in</button>
            <button onClick={signIn} className="public-primary-button">Get started</button>
        </>
    );

    const features = [
        {
            icon: CheckSquare2,
            title: 'Daily clarity',
            copy: 'Habits, wins, sleep, water and reflections follow one selected date across the app.',
        },
        {
            icon: LayoutDashboard,
            title: 'Gentle structure',
            copy: 'Plan the week, check in daily and keep long-term goals visible without turning life into admin.',
        },
        {
            icon: BarChart3,
            title: 'Useful patterns',
            copy: 'Streaks, trends and correlations turn your own records into practical feedback.',
        },
    ];

    return (
        <PublicShell actions={navActions}>
            <section className="grid grid-cols-1 lg:grid-cols-[1.08fr_0.92fr] items-center gap-10 lg:gap-16">
                <div>
                    <span className="public-eyebrow"><Sparkles size={14} /> A calmer way to track progress</span>
                    <h1 className="public-title mt-5">Your days,<br /><span style={{ color: 'var(--accent-ink)' }}>made visible.</span></h1>
                    <p className="public-copy mt-7 max-w-2xl">
                        LifeTracker brings your habits, daily wins, reflections, sleep and personal metrics into one private rhythm—powered by the Google Sheet you own.
                    </p>
                    <div className="mt-9 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <button onClick={signIn} className="public-primary-button" style={{ minHeight: '50px', paddingInline: '24px', fontSize: '12px' }}>
                            Start tracking <ArrowRight size={16} />
                        </button>
                        <span className="text-xs font-semibold text-center sm:text-left" style={{ color: 'var(--text-muted)' }}>Free • Private Sheet storage • No habit limit</span>
                    </div>
                </div>

                <div className="public-glass p-5 sm:p-7 rotate-0 lg:rotate-[1deg]">
                    <div className="rounded-2xl p-5 sm:p-6" style={{ background: 'var(--surface-inner)', border: '1px solid var(--control-border)' }}>
                        <div className="flex items-center justify-between gap-4 mb-6">
                            <div>
                                <p className="public-eyebrow">Today</p>
                                <h2 className="mt-1 text-3xl font-semibold" style={{ color: 'var(--text-heading)' }}>Daily rhythm</h2>
                            </div>
                            <div className="w-14 h-14 rounded-full flex items-center justify-center font-serif text-lg font-bold" style={{ background: 'var(--primary-container)', color: '#d9efe3' }}>72%</div>
                        </div>
                        <div className="space-y-3">
                            {[
                                ['Morning movement', true],
                                ['Drink 2.5 L water', true],
                                ['Focused work', true],
                                ['Evening reflection', false],
                            ].map(([label, done]) => (
                                <div key={label} className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: 'var(--surface-inner-strong)' }}>
                                    <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: done ? 'var(--primary-container)' : 'var(--disabled-bg)', color: done ? '#d9efe3' : 'var(--disabled-ink)' }}>
                                        {done && <CheckSquare2 size={14} />}
                                    </div>
                                    <span className="text-sm font-semibold" style={{ color: done ? 'var(--text-muted)' : 'var(--text-heading)', textDecoration: done ? 'line-through' : 'none' }}>{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="mt-20 lg:mt-28">
                <div className="mb-8 max-w-2xl">
                    <p className="public-eyebrow">Built around real life</p>
                    <h2 className="mt-3 text-4xl sm:text-5xl font-semibold tracking-[-0.035em]" style={{ color: 'var(--text-heading)' }}>One system, from check-in to insight.</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {features.map(({ icon: Icon, title, copy }) => (
                        <article key={title} className="public-glass p-6 sm:p-7">
                            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'var(--primary-container)', color: '#cbe6d7' }}><Icon size={21} /></div>
                            <h3 className="mt-5 text-2xl font-semibold" style={{ color: 'var(--text-heading)' }}>{title}</h3>
                            <p className="mt-3 text-sm leading-7" style={{ color: 'var(--text-muted)' }}>{copy}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="public-glass mt-20 lg:mt-28 p-7 sm:p-10 lg:p-14 grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-10 items-center">
                <div>
                    <span className="public-eyebrow"><ShieldCheck size={14} /> Privacy first</span>
                    <h2 className="mt-4 text-4xl sm:text-5xl font-semibold tracking-[-0.035em]" style={{ color: 'var(--text-heading)' }}>Your data remains yours.</h2>
                    <p className="mt-5 text-sm sm:text-base leading-7" style={{ color: 'var(--text-muted)' }}>
                        LifeTracker is a visual interface for a spreadsheet stored in your Google Drive. We do not maintain a separate database of your personal habit logs.
                    </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                        [Database, 'Your Google Sheet', 'Inspect, export or edit your records whenever you choose.'],
                        [ShieldCheck, 'Scoped access', 'OAuth access is limited to files created and used by LifeTracker.'],
                    ].map(([Icon, title, copy]) => (
                        <div key={title} className="rounded-2xl p-5" style={{ background: 'var(--surface-inner)', border: '1px solid var(--control-border)' }}>
                            <Icon size={22} style={{ color: 'var(--accent-ink)' }} />
                            <h3 className="mt-4 text-xl font-semibold" style={{ color: 'var(--text-heading)' }}>{title}</h3>
                            <p className="mt-2 text-xs leading-6" style={{ color: 'var(--text-muted)' }}>{copy}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="text-center mt-20 lg:mt-28 pb-4">
                <p className="public-eyebrow"><Sparkles size={14} /> Start where you are</p>
                <h2 className="mt-4 text-4xl sm:text-5xl font-semibold" style={{ color: 'var(--text-heading)' }}>Build a clearer picture, one day at a time.</h2>
                <button onClick={signIn} className="public-primary-button mt-8" style={{ minHeight: '50px', paddingInline: '26px' }}>Continue with Google <ArrowRight size={16} /></button>
                <p className="mt-6 text-[11px] leading-5" style={{ color: 'var(--text-muted)' }}>
                    LifeTracker adheres to the Google API Services User Data Policy, including Limited Use requirements.
                </p>
            </section>
        </PublicShell>
    );
}

export default Landing;
