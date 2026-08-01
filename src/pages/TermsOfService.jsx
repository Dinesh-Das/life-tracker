import React from 'react';
import { Link } from 'react-router';

function TermsOfService() {
    return (
        <div style={{ minHeight: '100vh', background: 'var(--background)', color: 'var(--text-heading)', padding: '40px 24px', fontFamily: 'var(--font-body)' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto', background: 'rgba(255,255,255,0.6)', padding: '40px', borderRadius: '24px', backdropFilter: 'blur(20px)' }}>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', marginBottom: '24px' }}>Terms of Service</h1>
                <p style={{ marginBottom: '16px' }}>Last updated: {new Date().toLocaleDateString()}</p>
                
                <h2 style={{ fontSize: '20px', marginTop: '24px', marginBottom: '12px' }}>1. Acceptance of Terms</h2>
                <p style={{ marginBottom: '16px', lineHeight: 1.6 }}>By accessing and using LifeTracker, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the application.</p>

                <h2 style={{ fontSize: '20px', marginTop: '24px', marginBottom: '12px' }}>2. Description of Service</h2>
                <p style={{ marginBottom: '16px', lineHeight: 1.6 }}>LifeTracker is a personal productivity and habit tracking application that stores its data exclusively within a Google Sheet owned by the user.</p>

                <h2 style={{ fontSize: '20px', marginTop: '24px', marginBottom: '12px' }}>3. User Responsibilities</h2>
                <p style={{ marginBottom: '16px', lineHeight: 1.6 }}>You are responsible for maintaining the security of your Google account. Because LifeTracker stores data in your personal Google Drive, you are solely responsible for the content you store and generate using this service.</p>

                <h2 style={{ fontSize: '20px', marginTop: '24px', marginBottom: '12px' }}>4. Disclaimer of Warranties</h2>
                <p style={{ marginBottom: '16px', lineHeight: 1.6 }}>LifeTracker is provided &quot;as is&quot; without warranty of any kind. We do not guarantee that the service will be uninterrupted or error-free. We are not responsible for any data loss that may occur within your Google Sheets.</p>

                <h2 style={{ fontSize: '20px', marginTop: '24px', marginBottom: '12px' }}>5. Changes to Terms</h2>
                <p style={{ marginBottom: '24px', lineHeight: 1.6 }}>We reserve the right to modify these terms at any time. Continued use of the application constitutes your acceptance of the revised terms.</p>

                <Link to="/login" style={{ display: 'inline-block', padding: '10px 20px', background: '#2d4f41', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}>Return to Login</Link>
            </div>
        </div>
    );
}

export default TermsOfService;
