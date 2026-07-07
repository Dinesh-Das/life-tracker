import React from 'react';

/** Skeleton block driven by theme tokens so placeholders match dark mode. */
const Block = ({ className, subtle = false }) => (
    <div
        className={className}
        style={{ background: subtle ? 'var(--surface-inner)' : 'var(--surface-inner-strong)' }}
    />
);

const LoadingSkeleton = ({ type = 'page' }) => {
    if (type === 'page') {
        return (
            <div className="flex-1 p-6 space-y-8 animate-pulse">
                <Block className="h-16 rounded-3xl w-1/3" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Block className="h-24 rounded-2xl" />
                    <Block className="h-24 rounded-2xl" />
                    <Block className="h-24 rounded-2xl" />
                    <Block className="h-24 rounded-2xl" />
                </div>
                <Block className="h-64 rounded-3xl" />
                <Block className="h-64 rounded-3xl" />
            </div>
        );
    }

    if (type === 'table') {
        return (
            <div className="space-y-4 animate-pulse">
                <Block className="h-10 rounded-lg w-full" />s
                {[1, 2, 3, 4, 5].map(i => (
                    <Block key={i} subtle className="h-12 rounded-lg w-full" />
                ))}
            </div>
        );
    }

    return null;
};

export default LoadingSkeleton;
