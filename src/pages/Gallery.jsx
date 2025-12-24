import React, { useState, useEffect, useRef } from 'react'
import { firebaseService } from '../services/firebaseService'
import Loading from '../components/common/Loading'
import './Gallery.css'

const Gallery = () => {
    const [galleryItems, setGalleryItems] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadGallery = async () => {
            try {
                const data = await firebaseService.getGallery()
                setGalleryItems(data)
            } finally {
                setLoading(false)
            }
        }
        loadGallery()
    }, [])

    // Function to calculate row span for each image
    const handleImageLoad = (e) => {
        const img = e.target
        const item = img.closest(".carousel-item")

        if (!item) return

        const rowHeight = 10   // same as CSS grid-auto-rows
        const gap = 20         // same as CSS gap

        const imgHeight = img.getBoundingClientRect().height
        const rowSpan = Math.ceil((imgHeight + gap) / (rowHeight + gap))

        item.style.setProperty("--row-span", rowSpan)
    }

    return (
        <div className="gallery-page" style={{ marginTop: '80px', padding: '2rem 0', minHeight: '80vh', background: '#fff' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem', padding: '0 2rem' }}>
                <h1 style={{
                    color: 'var(--primary-magenta)',
                    fontFamily: 'var(--font-display)',
                    fontSize: '3rem',
                    marginBottom: '1rem'
                }}>
                    Our Gallery
                </h1>
                <p style={{ color: 'var(--dark-gray)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>
                    Capturing moments of service, fellowship, and impact.
                </p>
            </div>

            <section className="gallery-carousel">
                {loading ? (
                    <Loading fullScreen={false} />
                ) : (
                    <div className="carousel__container">
                        {galleryItems.map((item) => (
                            <div key={item.id} className="carousel-item">
                                <img
                                    className="carousel-item__img"
                                    src={item.image}
                                    alt={item.eventName}
                                    onLoad={handleImageLoad}
                                />
                                <div className="carousel-item__details">
                                    <h5 className="carousel-item__details--title">{item.eventName}</h5>
                                </div>
                            </div>
                        ))}

                        {galleryItems.length === 0 && (
                            <div style={{ color: 'var(--dark-gray)', textAlign: 'center', width: '100%', padding: '20px' }}>
                                No images in gallery yet.
                            </div>
                        )}
                    </div>
                )}
            </section>
        </div>
    )
}

export default Gallery
