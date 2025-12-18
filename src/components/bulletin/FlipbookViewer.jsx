import React, { useEffect, useRef, useState } from 'react'
import { PageFlip } from 'page-flip'
import * as pdfjsLib from 'pdfjs-dist'
import { firebaseService } from '../../services/firebaseService'

// Set worker source
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

const FlipbookViewer = ({ pdfUrl, bulletinId, onClose }) => {
    const bookRef = useRef(null)
    const containerRef = useRef(null)
    const [pageFlip, setPageFlip] = useState(null)
    const [pdfDoc, setPdfDoc] = useState(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(0)
    const [currentZoom, setCurrentZoom] = useState(1)
    const [error, setError] = useState(null)

    // Styles matching reference CSS
    const styles = {
        overlay: {
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.50)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2000
        },
        flipContainer: {
            position: 'relative',
            maxWidth: '85vw',
            maxHeight: '85vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            transformOrigin: 'center',
            transition: 'transform 0.3s ease'
        },
        flipBook: {
            width: '900px', // Force spread width (2 * 450)
            height: '600px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
            backgroundColor: 'transparent',
            transition: 'transform 0.8s ease'
        },
        page: {
            backgroundColor: 'white',
            overflow: 'hidden'
        },
        closeBtn: {
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '45px',
            height: '45px',
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(0, 0, 0, 0.6)',
            color: 'white',
            fontSize: '22px',
            cursor: 'pointer',
            zIndex: 3000
        },
        navBtn: {
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(0, 0, 0, 0.4)',
            border: 'none',
            color: 'white',
            fontSize: '35px',
            padding: '12px',
            cursor: 'pointer',
            zIndex: 3000,
            transition: '0.2s'
        },
        pageCount: {
            position: 'absolute',
            top: '20px',
            left: '20px',
            background: 'rgba(0, 0, 0, 0.6)',
            padding: '8px 16px',
            borderRadius: '4px',
            fontSize: '14px',
            zIndex: 3000,
            color: 'white'
        },
        zoomControls: {
            position: 'absolute',
            bottom: '30px',
            right: '40px',
            display: 'flex',
            gap: '10px',
            zIndex: 3000
        },
        zoomBtn: {
            padding: '10px 20px',
            background: 'rgba(0, 0, 0, 0.6)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '18px',
            cursor: 'pointer'
        }
    }

    useEffect(() => {
        let activeFlip = null;

        const renderPage = async (pageNum, pdf) => {
            const page = await pdf.getPage(pageNum)

            const div = document.createElement("div")
            div.className = "page"
            div.style.backgroundColor = "white"
            div.style.overflow = "hidden"

            const canvas = document.createElement("canvas")
            const viewport = page.getViewport({ scale: 2 })
            canvas.width = viewport.width
            canvas.height = viewport.height
            // Force !important matching reference CSS
            canvas.style.setProperty('width', '100%', 'important')
            canvas.style.setProperty('height', '100%', 'important')
            canvas.style.display = 'block'

            const renderContext = {
                canvasContext: canvas.getContext("2d"),
                viewport
            }
            await page.render(renderContext).promise

            div.appendChild(canvas)
            return div
        }

        const loadPdf = async () => {
            if (!bookRef.current) return

            try {
                // Lock body scroll
                document.body.style.overflow = 'hidden'

                setError(null)
                bookRef.current.innerHTML = ""

                let source = null;

                // 1. Check if URL exists and is valid (not empty)
                if (pdfUrl && (pdfUrl.startsWith('http') || pdfUrl.startsWith('data:'))) {
                    const isBinary = pdfUrl.startsWith('data:');
                    if (isBinary) {
                        const base64 = pdfUrl.split(',')[1];
                        const binaryString = window.atob(base64);
                        const len = binaryString.length;
                        const bytes = new Uint8Array(len);
                        for (let i = 0; i < len; i++) {
                            bytes[i] = binaryString.charCodeAt(i);
                        }
                        source = bytes;
                    } else {
                        source = pdfUrl;
                    }
                }

                // 2. Fallback: Fetch from Firestore Chunks
                if (!source && bulletinId) {
                    // setLoadingMessage("Downloading from Database (Chunks)...") // This line was commented out in the original instruction
                    let base64chunks = await firebaseService.getPdfChunks(bulletinId);

                    if (base64chunks) {
                        console.log("Chunks fetched. Length:", base64chunks.length);
                        try {
                            // Detect if clean base64 or has prefix
                            if (base64chunks.includes('base64,')) {
                                base64chunks = base64chunks.split('base64,')[1];
                            }

                            const binaryString = window.atob(base64chunks);
                            const len = binaryString.length;
                            const bytes = new Uint8Array(len);
                            for (let i = 0; i < len; i++) {
                                bytes[i] = binaryString.charCodeAt(i);
                            }
                            source = bytes;
                        } catch (e) {
                            console.error("Base64 Decode Error:", e);
                            throw new Error("Corrupted PDF data in database.");
                        }
                    }
                }

                if (!source) throw new Error("PDF source not found (No URL and No Chunks).");

                // Get Document
                const loadingTask = pdfjsLib.getDocument(source)
                const pdf = await loadingTask.promise
                setPdfDoc(pdf)
                setTotalPages(pdf.numPages)
                setCurrentPage(1)

                // Render Pages Loop - Exact structure from reference
                const pages = []
                for (let i = 1; i <= pdf.numPages; i++) {
                    const p = await renderPage(i, pdf)
                    pages.push(p)
                }

                pages.forEach(p => bookRef.current.appendChild(p))

                // Init FlipBook
                const flip = new PageFlip(bookRef.current, {
                    width: 450,
                    height: 600,

                    size: "stretch",
                    autoSize: true,

                    minWidth: 450,
                    maxWidth: 1200,
                    minHeight: 550,
                    maxHeight: 1400,

                    showCover: true,
                    usePortrait: false,

                    maxShadowOpacity: 0.20,
                    flippingTime: 1400,

                    mobileScrollSupport: false,
                    startPage: 0
                })

                // Use querySelectorAll scoped to bookRef if possible, or document
                // Reference used document.querySelectorAll(".page")
                flip.loadFromHTML(bookRef.current.querySelectorAll(".page"))

                activeFlip = flip
                setPageFlip(flip)

                // Events
                flip.on("flip", (e) => {
                    setCurrentPage(e.data + 1)
                    updateAlignment(e.data, flip, pdf.numPages)
                })

                updateAlignment(0, flip, pdf.numPages)

            } catch (error) {
                console.error("Error loading PDF:", error)
                setError(`Failed to load PDF: ${error.message}`)
            }
        }

        if (pdfUrl) {
            loadPdf()
        }

        return () => {
            if (activeFlip) activeFlip.destroy()
            document.body.style.overflow = '' // Restore scroll
        }
    }, [pdfUrl])

    const updateAlignment = (index, flipInstance, total) => {
        if (!bookRef.current) return

        bookRef.current.style.transform = "translateX(0)"
        bookRef.current.style.clipPath = "none"

        if (index === 0) {
            bookRef.current.style.transform = "translateX(-30%)"
            bookRef.current.style.clipPath = "inset(-100px -100px -100px 50%)"
        } else if (index === total - 1 && total % 2 === 0) {
            bookRef.current.style.transform = "translateX(30%)"
            bookRef.current.style.clipPath = "inset(-100px 50% -100px -100px)"
        }
    }

    const handleZoom = (change) => {
        let newZoom = currentZoom + change
        if (newZoom < 0.4) newZoom = 0.4 // Logic from reference zoomOut check > 0.4
        // Reference didn't check max for zoomIn, but let's keep it reasonable
        if (newZoom > 3) newZoom = 3

        setCurrentZoom(newZoom)

        if (containerRef.current) {
            containerRef.current.style.transform = `scale(${newZoom})`
        }
    }

    return (
        <div style={styles.overlay}>
            {error ? (
                <div style={{ color: 'white', textAlign: 'center' }}>
                    <h2>Error</h2>
                    <p>{error}</p>
                    <button onClick={onClose} style={styles.zoomBtn}>Close</button>
                </div>
            ) : (
                <>
                    {/* Page Count */}
                    <div style={styles.pageCount}>
                        {currentPage} / {totalPages}
                    </div>

                    {/* Close Button */}
                    <button onClick={onClose} style={styles.closeBtn}>
                        ✕
                    </button>

                    {/* Prev Button */}
                    <button
                        onClick={() => pageFlip?.flipPrev()}
                        style={{ ...styles.navBtn, left: '25px' }}
                    >
                        ❮
                    </button>

                    {/* Flip Container */}
                    <div ref={containerRef} style={styles.flipContainer}>
                        <div
                            ref={bookRef}
                            className="flip-book"
                            style={styles.flipBook}
                        >
                            {/* Pages injected via JS */}
                        </div>
                    </div>

                    {/* Next Button */}
                    <button
                        onClick={() => pageFlip?.flipNext()}
                        style={{ ...styles.navBtn, right: '25px' }}
                    >
                        ❯
                    </button>

                    {/* Zoom Buttons */}
                    <div style={styles.zoomControls}>
                        <button onClick={() => handleZoom(0.1)} style={styles.zoomBtn}>＋</button>
                        <button onClick={() => handleZoom(-0.1)} style={styles.zoomBtn}>－</button>
                    </div>
                </>
            )}
        </div>
    )
}

export default FlipbookViewer
