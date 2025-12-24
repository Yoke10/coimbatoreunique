import React, { useState, useEffect } from 'react'
import EventCard from '../components/events/EventCard'
import Loading from '../components/common/Loading'
import { firebaseService } from '../services/firebaseService'

const Events = () => {
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        window.scrollTo(0, 0)
        const loadEvents = async () => {
            try {
                const data = await firebaseService.getEvents()
                setEvents(data)
            } finally {
                setLoading(false)
            }
        }
        loadEvents()
    }, [])

    return (
        <div className="events-page" style={{ marginTop: '80px', padding: '2rem 5%', minHeight: '80vh', background: '#fdfbfd' }}>
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
                Upcoming Events
            </h1>

            <div className="events-list-container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
                {loading ? (
                    <Loading fullScreen={false} />
                ) : events.length > 0 ? (
                    events.map((event, index) => (
                        <EventCard key={event.id} event={event} index={index} />
                    ))
                ) : (
                    <p style={{ textAlign: 'center', fontSize: '1.2rem', color: 'var(--dark-gray)' }}>
                        No upcoming events at the moment. Stay tuned!
                    </p>
                )}
            </div>
        </div>
    )
}

export default Events
