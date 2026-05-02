import React from 'react';
import { Link } from 'react-router-dom';

function PrivacyPolicy() {
    return (
        <div style={{ minHeight: '100vh', background: 'var(--background)', color: 'var(--text-heading)', padding: '40px 24px', fontFamily: 'var(--font-body)' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto', background: 'rgba(255,255,255,0.6)', padding: '40px', borderRadius: '24px', backdropFilter: 'blur(20px)' }}>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', marginBottom: '24px' }}>Privacy Policy for LifeTracker</h1>
                <p style={{ marginBottom: '16px' }}>Last updated: {new Date().toLocaleDateString()}</p>
                
                <h2 style={{ fontSize: '20px', marginTop: '24px', marginBottom: '12px' }}>1. Introduction</h2>
                <p style={{ marginBottom: '16px', lineHeight: 1.6 }}>Welcome to LifeTracker. This Privacy Policy explains how we collect, use, and protect your information when you use our application.</p>

                <h2 style={{ fontSize: '20px', marginTop: '24px', marginBottom: '12px' }}>2. Data We Collect</h2>
                <p style={{ marginBottom: '16px', lineHeight: 1.6 }}>LifeTracker uses Google OAuth to authenticate users. We collect and store:</p>
                <ul style={{ paddingLeft: '24px', marginBottom: '16px', lineHeight: 1.6 }}>
                    <li>Your Google email address (for identification)</li>
                    <li>Basic profile information (name, avatar)</li>
                </ul>

                <h2 style={{ fontSize: '20px', marginTop: '24px', marginBottom: '12px' }}>3. Google Sheets & Drive Integration</h2>
                <p style={{ marginBottom: '16px', lineHeight: 1.6 }}>LifeTracker requires specific permissions to access your Google Drive to create and manage a spreadsheet named &quot;LifeTracker Data&quot;. We ONLY read and write to this specific file.</p>
                <p style={{ marginBottom: '16px', lineHeight: 1.6, fontWeight: 600, fontStyle: 'italic', background: 'rgba(0,0,0,0.05)', padding: '12px', borderRadius: '8px' }}>
                    LifeTracker&apos;s use and transfer to any other app of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy#limited-use-requirements" target="_blank" rel="noreferrer" style={{ color: '#2d4f41' }}>Google API Services User Data Policy</a>, including the Limited Use requirements.
                </p>

                <h2 style={{ fontSize: '20px', marginTop: '24px', marginBottom: '12px' }}>4. Data Storage & Sharing</h2>
                <p style={{ marginBottom: '16px', lineHeight: 1.6 }}>All your habit tracking data, journal entries, and personal statistics are stored directly in your own Google Sheet. LifeTracker does not store your personal data on external servers, nor do we sell or share your data with any third parties.</p>

                <h2 style={{ fontSize: '20px', marginTop: '24px', marginBottom: '12px' }}>5. Contact Us</h2>
                <p style={{ marginBottom: '24px', lineHeight: 1.6 }}>If you have any questions about this Privacy Policy, please contact the developer.</p>

                <Link to="/login" style={{ display: 'inline-block', padding: '10px 20px', background: '#2d4f41', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}>Return to Login</Link>
            </div>
        </div>
    );
}

export default PrivacyPolicy;
