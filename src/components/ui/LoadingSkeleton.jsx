import React from 'react';

const LoadingSkeleton = ({ type = 'page' }) => {
    if (type === 'page') {
        return (
            <div className="flex-1 p-6 space-y-8 animate-pulse bg-background-subtle">
                <div className="h-16 bg-white rounded-3xl w-1/3" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="h-24 bg-white rounded-2xl" />
                    <div className="h-24 bg-white rounded-2xl" />
                    <div className="h-24 bg-white rounded-2xl" />
                    <div className="h-24 bg-white rounded-2xl" />
                </div>
                <div className="h-64 bg-white rounded-3xl" />
                <div className="h-64 bg-white rounded-3xl" />
            </div>
        );
    }

    if (type === 'table') {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-10 bg-gray-100 rounded-lg w-full" />
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-12 bg-gray-50 rounded-lg w-full" />
                ))}
            </div>
        )
    }

    return null;
};

export default LoadingSkeleton;
