import React, { useState, useEffect } from 'react'
// Lazy load sub-components
const FirstTimeSetup = React.lazy(() => import('./FirstTimeSetup'))
const MemberProfile = React.lazy(() => import('./MemberProfile'))
const Resources = React.lazy(() => import('./Resources'))
const ReportGenerator = React.lazy(() => import('../reports/ReportGenerator'))
import { firebaseService } from '../../services/firebaseService'
import './MemberDashboard.css'
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from "../ui/AlertDialog/AlertDialog"

import { useAuth } from "../../context/AuthContext"
import { useQuery, useQueryClient } from '@tanstack/react-query'

const MemberDashboard = ({ user, onLogout }) => {
    // Default to Directory as Profile is now in modal
    const [activeTab, setActiveTab] = useState('directory')
    const [viewingReport, setViewingReport] = useState(null)

    // 🔥 USE CONTEXT INSTEAD OF PROPS/LOCAL STATE
    const { currentUser } = useAuth()
    const queryClient = useQueryClient()

    const [alertConfig, setAlertConfig] = useState({ open: false, title: '', description: '', action: null })

    const showAlert = (title, description, action) => {
        setAlertConfig({ open: true, title, description, action })
    }

    const handleConfirmAction = () => {
        if (alertConfig.action) {
            alertConfig.action()
        }
        setAlertConfig({ ...alertConfig, open: false })
    }

    // Directory & Profile Modal State
    const [showProfileModal, setShowProfileModal] = useState(false)
    const [selectedMember, setSelectedMember] = useState(null)

    // --- TANSTACK QUERIES ---

    // 1. Fetch Reports
    const { data: reports = [] } = useQuery({
        queryKey: ['reports'],
        queryFn: firebaseService.getReports,
        staleTime: 5 * 60 * 1000
    })

    // 2. Fetch Members (only when tab is directory)
    const { data: members = [] } = useQuery({
        queryKey: ['members'],
        queryFn: async () => {
            const allUsers = await firebaseService.getUsers()
            // Filter: Must be 'member' AND not have 'admin' in email/username
            return allUsers.filter(u =>
                u.role === 'member' &&
                !u.email.toLowerCase().includes('admin') &&
                !u.username?.toLowerCase().includes('admin')
            )
        },
        enabled: activeTab === 'directory', // Lazy fetch
        staleTime: 5 * 60 * 1000
    })


    const handleSaveReport = async (reportData) => {
        const userId = currentUser?.id
        if (!userId) {
            alert("Error: User session missing. Please logout and login again.")
            return
        }

        try {
            // Helper to convert data URL to Blob
            const dataURLtoBlob = async (dataUrl) => {
                const res = await fetch(dataUrl);
                return await res.blob();
            }

            // Upload helper
            const uploadImage = async (data, pathPrefix) => {
                if (!data || typeof data !== 'string' || !data.startsWith('data:')) return data; // Return as is if URL or null

                const blob = await dataURLtoBlob(data);
                // Random filename
                const filename = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.webp`;
                // Path: reports/{userId}/{filename}
                const path = `reports/${userId}/${pathPrefix}_${filename}`;
                return await firebaseService.uploadFile(blob, path);
            }

            // 1. Upload Poster
            let posterUrl = reportData.poster;
            if (posterUrl && posterUrl.startsWith('data:')) {
                posterUrl = await uploadImage(posterUrl, 'poster');
            }

            // 2. Upload Gallery
            const galleryUrls = await Promise.all((reportData.images || []).map((img, idx) =>
                uploadImage(img, `gallery_${idx}`)
            ));

            // 3. Upload Logos
            const logoUrls = await Promise.all((reportData.logos || []).map((logo, idx) =>
                uploadImage(logo, `logo_${idx}`)
            ));

            // 4. Construct Clean Data
            const cleanData = {
                ...reportData,
                poster: posterUrl || null,
                images: galleryUrls,
                logos: logoUrls,
                createdBy: userId, // Ensure ownership
                updatedAt: new Date().toISOString()
            };

            if (reportData.id) {
                await firebaseService.updateReport(reportData.id, cleanData)
            } else {
                // Ensure createdAt is present for new reports
                cleanData.createdAt = new Date().toISOString();
                await firebaseService.addReport(cleanData)
            }

            // Refetch reports
            queryClient.invalidateQueries({ queryKey: ['reports'] })
            setViewingReport(null)
            alert("Report Saved Successfully!")
        } catch (e) {
            console.error("Save Report Error:", e)
            alert("Failed to save report: " + e.message)
        }
    }

    const handleUpdateUser = () => {
        // Since we use AuthContext, we reload to fetch fresh data
        window.location.reload();
    }

    return (
        <div className="member-container">
            <div className="member-header">
                <div className="member-nav-group">
                    <button
                        onClick={() => setActiveTab('directory')}
                        className={`member-nav-btn ${activeTab === 'directory' ? 'active' : ''}`}
                    >
                        Members
                    </button>
                    <button
                        onClick={() => setActiveTab('reports')}
                        className={`member-nav-btn ${activeTab === 'reports' ? 'active' : ''}`}
                    >
                        Project Reports
                    </button>
                    <button
                        onClick={() => setActiveTab('resources')}
                        className={`member-nav-btn ${activeTab === 'resources' ? 'active' : ''}`}
                    >
                        Resources
                    </button>
                </div>

                {/* Profile Icon */}
                <div
                    className="member-profile-icon"
                    onClick={() => setShowProfileModal(true)}
                    title="View My Details"
                >
                    {currentUser?.profile?.fullName ? currentUser.profile.fullName.charAt(0).toUpperCase() : 'U'}
                </div>
            </div>

            {currentUser?.isFirstLogin ? (
                <React.Suspense fallback={<div>Loading Setup...</div>}>
                    <FirstTimeSetup user={currentUser} onComplete={handleUpdateUser} />
                </React.Suspense>
            ) : (
                <>
                    <React.Suspense fallback={<div className="p-4 text-center">Loading...</div>}>
                        {activeTab === 'resources' && <Resources />}

                        {activeTab === 'directory' && (
                            <div className="directory-container">
                                <h2 style={{ color: 'var(--primary-magenta)', marginBottom: '1.5rem' }}>Member Directory</h2>
                                <div className="directory-grid">
                                    {members.map(member => (
                                        <div key={member.id} className="directory-card">
                                            <div className="dir-avatar">
                                                {member.profile?.fullName ? member.profile.fullName.charAt(0) : 'M'}
                                            </div>
                                            <div className="dir-info">
                                                <h3>{member.profile?.fullName || member.username}</h3>
                                                <div className="dir-details">
                                                    <p><strong>Email:</strong> {member.profile?.personalEmail || '-'}</p>
                                                    <p><strong>Contact:</strong> {member.profile?.contact || '-'}</p>
                                                </div>
                                                <button
                                                    className="view-details-btn"
                                                    onClick={() => setSelectedMember(member)}
                                                >
                                                    View Details
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'reports' && (
                            <div>
                                {!viewingReport ? (
                                    <div>
                                        <div className="report-action-bar">
                                            <button onClick={() => setViewingReport('new')} className="create-report-btn">+ Create New Report</button>
                                        </div>

                                        <div className="report-grid">
                                            {reports.filter(r => r.createdBy === currentUser.id).length === 0 && <p className="no-reports-msg">No reports found.</p>}
                                            {reports.filter(r => r.createdBy === currentUser.id).map(report => (
                                                <div key={report.id} className="report-item">
                                                    <div>
                                                        <h4 className="report-title">{report.eventName}</h4>
                                                        <span className="report-date">{report.eventDate} | {report.avenue}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <button onClick={() => setViewingReport(report)} className="edit-btn">Edit</button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <ReportGenerator
                                        user={currentUser}
                                        reportData={viewingReport === 'new' ? null : viewingReport}
                                        onSave={handleSaveReport}
                                        onCancel={() => setViewingReport(null)}
                                    />
                                )}
                            </div>
                        )}
                    </React.Suspense>
                </>
            )}

            {/* Profile Modal (My Account) */}
            {showProfileModal && (
                <div className="modal-overlay">
                    <div className="modal-box large" style={{ maxWidth: '1100px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
                        <button onClick={() => setShowProfileModal(false)} className="modal-close-btn">✕</button>
                        <React.Suspense fallback={<div>Loading Profile...</div>}>
                            <MemberProfile
                                user={currentUser}
                                onUpdate={handleUpdateUser}
                                onLogout={() => showAlert("Logout?", "Are you sure you want to log out?", onLogout)}
                            />
                        </React.Suspense>
                    </div>
                </div>
            )}

            {selectedMember && (
                <div className="modal-overlay">
                    <div className="member-detail-card">
                        {/* Close button at top right of the whole card */}
                        <button onClick={() => setSelectedMember(null)} className="modal-close-btn">✕</button>

                        <div className="card-header-gradient">
                            <div className="card-avatar-large">
                                {selectedMember.profile?.fullName ? selectedMember.profile.fullName.charAt(0) : 'M'}
                            </div>
                            <h2>{selectedMember.profile?.fullName || selectedMember.username}</h2>
                            <p>RI ID: {selectedMember.profile?.riId || 'N/A'}</p>
                            <span className="member-badge">Active Member</span>
                        </div>

                        <div className="card-body">
                            <h3 style={{ marginBottom: '1.5rem', color: '#333', fontSize: '1.2rem', borderBottom: '2px solid var(--primary-pink)', display: 'inline-block', paddingBottom: '0.5rem' }}>Member Details</h3>

                            <div className="detail-row">
                                <span className="detail-label">Member ID</span>
                                <span className="detail-value" style={{ color: 'var(--primary-magenta)' }}>{selectedMember.memberId || '-'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Email</span>
                                <span className="detail-value">{selectedMember.profile?.personalEmail || '-'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Contact</span>
                                <span className="detail-value">{selectedMember.profile?.contact || '-'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Date of Birth</span>
                                <span className="detail-value">{selectedMember.profile?.dob || '-'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Blood Group</span>
                                <span className="detail-value">{selectedMember.profile?.bloodGroup || '-'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Address</span>
                                <span className="detail-value" style={{ maxWidth: '100%', textAlign: 'left' }}>
                                    {selectedMember.profile?.addressLine1}
                                    {selectedMember.profile?.addressLine2 && <><br />{selectedMember.profile.addressLine2}</>}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ALERT DIALOG */}
            <AlertDialog open={alertConfig.open} onOpenChange={(open) => setAlertConfig(prev => ({ ...prev, open }))}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{alertConfig.title}</AlertDialogTitle>
                        <AlertDialogDescription>{alertConfig.description}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmAction}>Confirm</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

export default MemberDashboard