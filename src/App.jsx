import React, { Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation, Outlet } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'

import { ToastProvider, Toaster } from './components/ui/Toast/ToastContext'
import ScrollToTop from './components/common/ScrollToTop'

// Lazy Load Pages
import Home from './pages/Home'
// const Home = React.lazy(() => import('./pages/Home'))
const About = React.lazy(() => import('./pages/About'))
const Team = React.lazy(() => import('./pages/Team'))
const Events = React.lazy(() => import('./pages/Events'))
const Bulletin = React.lazy(() => import('./pages/Bulletin'))
const Gallery = React.lazy(() => import('./pages/Gallery'))
const Scrapbook = React.lazy(() => import('./pages/Scrapbook'))
const MemberSpace = React.lazy(() => import('./pages/MemberSpace'))
const Contact = React.lazy(() => import('./pages/Contact'))
const JoinUs = React.lazy(() => import('./pages/JoinUs'))
const FAQ = React.lazy(() => import('./pages/FAQ'))
const Terms = React.lazy(() => import('./pages/Terms'))
const Resources = React.lazy(() => import('./components/member/Resources'))
const NotFound = React.lazy(() => import('./components/404/NotFound'))


const SmokeyCursor = React.lazy(() => import('./components/SmokeyCursor'))

import { AnimatePresence, motion } from 'framer-motion'

// Animation Variants
const pageVariants = {
    initial: { opacity: 0 },
    in: {
        opacity: 1,
        transition: { duration: 0.3, ease: "easeOut" }
    },
    out: {
        opacity: 0,
        transition: { duration: 0.1, ease: "easeIn" } // Fast exit to reduce "loading" feel
    }
}

const pageTransition = {
    type: "tween",
    ease: "easeInOut",
    duration: 0.3
}

const PageWrapper = ({ children }) => (
    <motion.div
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        style={{ width: '100%' }}
    >
        {children}
    </motion.div>
)

const AnimatedRoutes = () => {
    const location = useLocation()
    return (
        <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
                <Route element={<MainLayout />}>
                    <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
                    <Route path="/about" element={<PageWrapper><About /></PageWrapper>} />
                    <Route path="/team" element={<PageWrapper><Team /></PageWrapper>} />
                    <Route path="/events" element={<PageWrapper><Events /></PageWrapper>} />
                    <Route path="/bulletin" element={<PageWrapper><Bulletin /></PageWrapper>} />
                    <Route path="/gallery" element={<PageWrapper><Gallery /></PageWrapper>} />
                    <Route path="/scrapbook" element={<PageWrapper><Scrapbook /></PageWrapper>} />
                    <Route path="/resources" element={<PageWrapper><Resources /></PageWrapper>} />
                    <Route path="/memberspace" element={<PageWrapper><MemberSpace /></PageWrapper>} />
                    <Route path="/contact" element={<PageWrapper><Contact /></PageWrapper>} />
                    <Route path="/join" element={<PageWrapper><JoinUs /></PageWrapper>} />
                    <Route path="/faq" element={<PageWrapper><FAQ /></PageWrapper>} />
                    <Route path="/terms" element={<PageWrapper><Terms /></PageWrapper>} />
                </Route>
                <Route path="*" element={<PageWrapper><NotFound /></PageWrapper>} />
            </Routes>
        </AnimatePresence>
    )
}

const App = () => {
    return (
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ToastProvider>
                <ScrollToTop />
                <div className="app">
                    <SmokeyCursorWrapper />
                    <Toaster />
                    <AnimatedRoutes />
                </div>
            </ToastProvider>
        </Router>
    )
}

const MainLayout = () => {
    return (
        <>
            <HeaderWrapper />
            <main>
                <Suspense fallback={
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100vh',
                        color: 'var(--primary-purple)',
                        fontSize: '1.2rem',
                        fontWeight: '600'
                    }}>
                        Loading...
                    </div>
                }>
                    <Outlet />
                </Suspense>
            </main>
            <FooterWrapper />
        </>
    )
}

const SmokeyCursorWrapper = () => {
    const location = useLocation()
    const [isEnabled, setIsEnabled] = React.useState(true)
    const [isReady, setIsReady] = React.useState(false) // Defer loading
    const isExcluded = location.pathname.startsWith('/memberspace')

    React.useEffect(() => {
        const timer = setTimeout(() => {
            setIsReady(true)
        }, 2500) // 2.5s delay to allow LCP to finish
        return () => clearTimeout(timer)
    }, [])

    if (isExcluded || !isReady) return null

    return (
        <>
            {isEnabled && (
                <React.Suspense fallback={null}>
                    <SmokeyCursor
                        simulationResolution={128}
                        dyeResolution={1024}
                        densityDissipation={2.5}
                        curl={5}
                        splatForce={3000}
                        splatRadius={0.1}
                        enableShading={true}
                    />
                </React.Suspense>
            )}
            <button
                onClick={() => setIsEnabled(!isEnabled)}
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 9999,
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    backgroundColor: isEnabled ? 'rgba(237, 7, 117, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(4px)',
                    cursor: 'pointer',
                    opacity: 0.3,
                    transition: 'all 0.3s ease',
                    boxShadow: '0 0 10px rgba(0,0,0,0.1)'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '1';
                    e.currentTarget.style.transform = 'translateX(-50%) scale(1.5)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '0.3';
                    e.currentTarget.style.transform = 'translateX(-50%) scale(1)';
                }}
                title={isEnabled ? "Disable Smoke Effect" : "Enable Smoke Effect"}
            />
        </>
    )
}

const HeaderWrapper = () => {
    const location = useLocation()
    return location.pathname !== '/memberspace' ? <Header /> : null
}

const FooterWrapper = () => {
    const location = useLocation()
    const hiddenPaths = ['/contact', '/join', '/memberspace']
    return !hiddenPaths.includes(location.pathname) ? <Footer /> : null
}

export default App
