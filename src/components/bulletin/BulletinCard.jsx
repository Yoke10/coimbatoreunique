import React from 'react'

const BulletinCard = ({ bulletin }) => {

    const handleCardClick = () => {
        if (bulletin.driveFileId) {
            window.open(`https://drive.google.com/file/d/${bulletin.driveFileId}/view`, '_blank');
        }
    };

    return (
        <div
            onClick={handleCardClick}
            style={{
                background: 'white',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 8px 20px rgba(0,0,0,0.05)',
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}
            className="bulletin-card"
        >
            <div style={{ width: '100%', aspectRatio: '3/4', overflow: 'hidden' }}>
                <img
                    src={bulletin.poster}
                    alt={bulletin.title}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.6s ease'
                    }}
                    className="bulletin-poster"
                />
            </div>
            <div style={{ padding: '1.2rem 1rem' }}>
                <span style={{
                    display: 'inline-block',
                    padding: '0.25rem 0.6rem',
                    background: 'rgba(237, 7, 117, 0.08)',
                    color: 'var(--primary-pink)',
                    borderRadius: '50px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    marginBottom: '0.4rem',
                    letterSpacing: '0.5px'
                }}>
                    {bulletin.month}
                </span>
                <h3 style={{
                    margin: '0',
                    color: 'var(--primary-magenta)',
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.1rem',
                    lineHeight: '1.3'
                }}>
                    {bulletin.title}
                </h3>
            </div>

            <style>{`
                .bulletin-card:hover {
                    transform: translateY(-8px);
                    box-shadow: 0 15px 30px rgba(0,0,0,0.12) !important;
                }
                .bulletin-card:hover .bulletin-poster {
                    transform: scale(1.08) !important;
                }
            `}</style>
        </div>
    )
}

export default BulletinCard
