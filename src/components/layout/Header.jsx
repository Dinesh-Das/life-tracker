import SavingIndicator from '../ui/SavingIndicator'

/**
 * Page Header — Digital Sanctuary style
 * Renders the page title in Newsreader serif over the green-mist background.
 * On mobile it also renders a compact top bar with a back indicator.
 */
function Header({ title, subtitle, saving }) {
    return (
        <div style={{ padding: '36px 40px 0', paddingBottom: 0 }}>
            {title && (
                <h1 className="page-title" style={{ marginBottom: subtitle ? '6px' : '28px' }}>
                    {title}
                </h1>
            )}
            {subtitle && (
                <p className="page-subtitle" style={{ marginBottom: '28px' }}>
                    {subtitle}
                </p>
            )}
            {saving !== undefined && (
                <div style={{ marginTop: '-20px', marginBottom: '12px' }}>
                    <SavingIndicator saving={saving} />
                </div>
            )}
        </div>
    );
}

export default Header;
