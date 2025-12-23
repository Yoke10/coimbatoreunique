import React, { useState, useEffect } from 'react'
import BulletinCard from '../components/bulletin/BulletinCard'
import { firebaseService } from '../services/firebaseService'

const Bulletin = () => {
    const [bulletins, setBulletins] = useState([])

    useEffect(() => {
        window.scrollTo(0, 0)
        const loadBulletins = async () => {
            try {
                const data = await firebaseService.getBulletins()
                setBulletins(data)
            } catch (error) {
                console.error("Failed to load bulletins", error)
            }
        }
        loadBulletins()
    }, [])

    return (
        <div className="bulletin-page" style={{ marginTop: '80px', padding: '2rem 5%', minHeight: '80vh', background: '#fdfbfd' }}>
            <h1 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                fontWeight: '900',
                textAlign: 'center',
                marginBottom: '3rem',
                background: 'var(--gradient-primary)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
            }}>
                Club Bulletins
            </h1>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '2rem',
                maxWidth: '1200px',
                margin: '0 auto'
            }}>
                {bulletins.length > 0 ? (
                    bulletins.map(bulletin => (
                        <BulletinCard
                            key={bulletin.id}
                            bulletin={bulletin}
                        />
                    ))
                ) : (
                    <p style={{ textAlign: 'center', fontSize: '1.2rem', color: 'var(--dark-gray)', gridColumn: '1/-1' }}>
                        No bulletins available yet.
                    </p>
                )}
            </div>

            {/* <FlipbookViewer /> Component Removed as per simplified requirement */}
        </div>
    )
}

export default Bulletin
