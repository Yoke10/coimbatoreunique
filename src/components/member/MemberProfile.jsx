import React, { useState, useEffect } from 'react'
import { firebaseService } from '../../services/firebaseService'
import { useToast } from '../ui/Toast/ToastContext'
import { Edit2, Check, X, Shield, Lock } from 'lucide-react'

// Constants
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
const GENDERS = ['Male', 'Female', 'Other']
const PROFESSIONS = ['Student', 'Working', 'Business', 'Other']

const InfoRow = ({ label, value, field, isEditing, formData, onChange, type = 'text', options = [], required = false, rows = 1 }) => {
    return (
        <div style={{ marginBottom: '1.2rem', position: 'relative' }}>
            <label style={{
                display: 'block',
                fontSize: '0.85rem',
                color: '#666',
                marginBottom: '0.3rem',
                fontWeight: '500'
            }}>
                {label} {required && <span style={{ color: 'red' }}>*</span>}
            </label>

            {isEditing ? (
                type === 'select' ? (
                    <select
                        name={field}
                        value={formData[field] || ''}
                        onChange={onChange}
                        style={inputStyle}
                        required={required}
                    >
                        <option value="">Select {label}</option>
                        {options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                ) : type === 'textarea' ? (
                    <textarea
                        name={field}
                        value={formData[field] || ''}
                        onChange={onChange}
                        style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
                        rows={rows}
                    />
                ) : (
                    <input
                        type={type}
                        name={field}
                        value={formData[field] || ''}
                        onChange={onChange}
                        style={inputStyle}
                        required={required}
                        placeholder={type === 'date' ? '' : `Enter ${label}`}
                    />
                )
            ) : (
                <div style={{
                    fontWeight: '500',
                    color: value ? '#333' : '#aaa',
                    fontSize: '1rem',
                    minHeight: '1.5rem',
                    borderBottom: '1px solid transparent'
                }}>
                    {value || '-'}
                </div>
            )}
        </div>
    )
}

const MemberProfile = ({ user, onUpdate }) => {
    const { toast } = useToast()
    const [isEditing, setIsEditing] = useState(false)
    const [authStatus, setAuthStatus] = useState('Checking...')

    // Password Change State
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
    const [pwData, setPwData] = useState({ newPassword: '', confirmPassword: '' })
    const [pwLoading, setPwLoading] = useState(false)
    const [pwError, setPwError] = useState('')

    // Auth Listener
    React.useEffect(() => {
        import('../../firebase/config').then(({ auth }) => {
            auth.onAuthStateChanged(u => {
                setAuthStatus(u ? 'Connected' : 'Disconnected')
            })
        })
    }, [])

    // Ensure nested profile object exists
    const getInitialData = (u) => ({
        ...u.profile,
        // Ensure defaults if missing
        addressLine1: u.profile?.addressLine1 || '',
        addressLine2: u.profile?.addressLine2 || '',
        personalEmail: u.profile?.personalEmail || u.email || '', // Default to login email if missing
        gender: u.profile?.gender || '',
        bloodGroup: u.profile?.bloodGroup || '',
        profession: u.profile?.profession || 'Student',
    })

    const [formData, setFormData] = useState(getInitialData(user))

    // SYNC FORM DATA WHEN USER PROP UPDATES
    useEffect(() => {
        setFormData(getInitialData(user))
    }, [user])

    const [loading, setLoading] = useState(false)

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSave = async () => {
        setLoading(true)
        try {
            const updatedUser = await firebaseService.updateUser(user.id, {
                profile: { ...formData }
            })
            onUpdate({ ...user, profile: formData })
            toast({ title: "Profile Updated", description: "Your details have been saved successfully.", variant: "success" })
            setIsEditing(false)
        } catch (err) {
            console.error(err)
            toast({ title: "Update Failed", description: "Failed to update profile.", variant: "destructive" })
        } finally {
            setLoading(false)
        }
    }

    // Password Handlers
    const handlePwChange = (e) => setPwData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const submitPassword = async (e) => {
        e.preventDefault();
        setPwError('');
        if (pwData.newPassword.length < 6) {
            setPwError('Password must be at least 6 characters');
            return;
        }
        if (pwData.newPassword !== pwData.confirmPassword) {
            setPwError('Passwords do not match');
            return;
        }

        setPwLoading(true);
        try {
            await firebaseService.changePassword(user.id, pwData.newPassword);
            toast({ title: "Success", description: "Password changed successfully.", variant: "success" });
            setIsPasswordModalOpen(false);
            setPwData({ newPassword: '', confirmPassword: '' });
        } catch (error) {
            console.error("Password Change Error:", error);
            setPwError(error.message);
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setPwLoading(false);
        }
    };

    const initials = formData.fullName
        ? formData.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        : 'U';

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
            <div className="profile-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '2rem' }}>

                {/* LEFT COLUMN: Identity Card */}
                <div style={{ background: 'white', padding: '2rem', borderRadius: '20px', height: 'fit-content', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                    <div style={{
                        width: '120px', height: '120px',
                        background: 'linear-gradient(135deg, var(--primary-magenta), var(--primary-purple))',
                        borderRadius: '50%', margin: '0 auto 1.5rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontSize: '3rem', fontWeight: 'bold',
                        boxShadow: '0 8px 16px rgba(237, 7, 117, 0.3)'
                    }}>
                        {initials}
                    </div>

                    <h2 style={{ margin: '0.5rem 0', color: '#2d3748', fontSize: '1.5rem' }}>
                        {formData.fullName || 'Member Name'}
                    </h2>

                    <div className="badge" style={{
                        background: 'rgba(237, 7, 117, 0.1)', color: 'var(--primary-magenta)',
                        padding: '0.4rem 1rem', borderRadius: '50px',
                        display: 'inline-block', fontWeight: '600', fontSize: '0.9rem',
                        marginBottom: '1.5rem'
                    }}>
                        {user.memberId}
                    </div>

                    <div style={{ textAlign: 'left', background: '#f7fafc', padding: '1.5rem', borderRadius: '15px' }}>
                        <div style={{ marginBottom: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#718096', fontSize: '0.9rem' }}>Membership Status</span>
                            <span style={{ color: 'var(--success-green)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Shield size={14} /> Active
                            </span>
                        </div>
                        <div style={{ marginBottom: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#718096', fontSize: '0.9rem' }}>Member Since</span>
                            <span style={{ color: '#4a5568', fontWeight: '600' }}>2024</span>
                        </div>
                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '0.75rem', color: '#a0aec0', marginBottom: '0.2rem' }}>LOGIN ID</div>
                            <div style={{ fontSize: '0.9rem', color: '#4a5568', wordBreak: 'break-all' }}>{user.email} <Lock size={12} style={{ display: 'inline', marginLeft: '4px' }} /></div>
                        </div>
                    </div>

                    {/* Security Section (New) */}
                    <div style={{ marginTop: '2rem', textAlign: 'left' }}>
                        <h4 style={{ ...sectionHeaderStyle, marginBottom: '1rem' }}>Security Settings</h4>
                        <button
                            onClick={() => setIsPasswordModalOpen(true)}
                            style={{
                                width: '100%',
                                padding: '0.8rem',
                                background: 'white',
                                color: 'var(--primary-purple)',
                                border: '2px solid var(--primary-purple)',
                                borderRadius: '10px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                            }}
                        >
                            <Lock size={16} /> Change Password
                        </button>
                        <p style={{ fontSize: '0.75rem', color: '#718096', marginTop: '0.5rem', textAlign: 'center' }}>
                            Limit: 2 changes per 15 days
                        </p>
                    </div>
                </div>

                {/* RIGHT COLUMN: Details Form */}
                <div style={{ background: 'white', padding: '2.5rem', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '2px solid #f7fafc', paddingBottom: '1.5rem' }}>
                        <div>
                            <h2 style={{ color: 'var(--primary-magenta)', margin: 0, fontSize: '1.8rem' }}>Profile Details</h2>
                            <p style={{ color: '#718096', margin: '0.5rem 0 0', fontSize: '0.95rem' }}>Manage your personal information</p>
                        </div>

                        {!isEditing ? (
                            <button onClick={() => setIsEditing(true)} style={actionBtnStyle}>
                                <Edit2 size={18} /> Edit Profile
                            </button>
                        ) : (
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button onClick={() => setIsEditing(false)} style={cancelBtnStyle}>
                                    <X size={18} /> Cancel
                                </button>
                                <button onClick={handleSave} style={saveBtnStyle} disabled={loading}>
                                    {loading ? 'Saving...' : <><Check size={18} /> Save Changes</>}
                                </button>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

                        {/* Personal Info Group */}
                        <div style={{ gridColumn: '1 / -1' }}>
                            <h4 style={sectionHeaderStyle}>Personal Information</h4>
                        </div>

                        <InfoRow label="Full Name" field="fullName" value={formData.fullName} isEditing={isEditing} formData={formData} onChange={handleChange} required />
                        <InfoRow label="Date of Birth" field="dob" value={formData.dob} isEditing={isEditing} formData={formData} onChange={handleChange} type="date" />

                        <InfoRow label="Gender" field="gender" value={formData.gender} isEditing={isEditing} formData={formData} onChange={handleChange} type="select" options={GENDERS} />
                        <InfoRow label="Blood Group" field="bloodGroup" value={formData.bloodGroup} isEditing={isEditing} formData={formData} onChange={handleChange} type="select" options={BLOOD_GROUPS} />

                        {/* Contact Info Group */}
                        <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
                            <h4 style={sectionHeaderStyle}>Contact Information</h4>
                        </div>

                        <InfoRow label="Personal Email" field="personalEmail" value={formData.personalEmail} isEditing={isEditing} formData={formData} onChange={handleChange} type="email" />
                        <InfoRow label="Phone Number" field="contact" value={formData.contact} isEditing={isEditing} formData={formData} onChange={handleChange} type="tel" />

                        {/* Address: Full Width */}
                        <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                            <InfoRow label="Address Line 1" field="addressLine1" value={formData.addressLine1} isEditing={isEditing} formData={formData} onChange={handleChange} type="text" />
                            <InfoRow label="Address Line 2" field="addressLine2" value={formData.addressLine2} isEditing={isEditing} formData={formData} onChange={handleChange} type="text" />
                        </div>

                        <InfoRow label="Emergency Contact" field="emergencyContact" value={formData.emergencyContact} isEditing={isEditing} formData={formData} onChange={handleChange} />

                        {/* Professional & Extra */}
                        <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
                            <h4 style={sectionHeaderStyle}>Additional Details</h4>
                        </div>

                        <InfoRow label="Profession" field="profession" value={formData.profession} isEditing={isEditing} formData={formData} onChange={handleChange} type="select" options={PROFESSIONS} />
                        <InfoRow label="RI ID" field="riId" value={formData.riId} isEditing={isEditing} formData={formData} onChange={handleChange} />
                        <div style={{ gridColumn: '1 / -1' }}>
                            <InfoRow label="Hobbies / Interests" field="hobbies" value={formData.hobbies} isEditing={isEditing} formData={formData} onChange={handleChange} type="textarea" rows={2} />
                        </div>

                    </div>
                </div>
            </div>

            {/* Password Modal */}
            {isPasswordModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{ background: 'white', padding: '2rem', borderRadius: '15px', width: '90%', maxWidth: '400px' }}>
                        <h3 style={{ marginTop: 0, color: 'var(--primary-magenta)' }}>Change Password</h3>
                        <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                            Enter your new password below.
                        </p>

                        {pwError && (
                            <div style={{ padding: '0.8rem', background: '#fff5f5', color: '#c53030', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
                                {pwError}
                            </div>
                        )}

                        <form onSubmit={submitPassword}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>New Password</label>
                                <input
                                    type="password" name="newPassword"
                                    value={pwData.newPassword} onChange={handlePwChange}
                                    style={inputStyle} required
                                />
                            </div>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>Confirm Password</label>
                                <input
                                    type="password" name="confirmPassword"
                                    value={pwData.confirmPassword} onChange={handlePwChange}
                                    style={inputStyle} required
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setIsPasswordModalOpen(false)} style={cancelBtnStyle}>Cancel</button>
                                <button type="submit" style={saveBtnStyle} disabled={pwLoading}>
                                    {pwLoading ? 'Updating...' : 'Update Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

// Styles
const sectionHeaderStyle = {
    color: '#a0aec0',
    fontSize: '0.85rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: '0.5rem',
    marginBottom: '1rem'
}

const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '0.95rem',
    backgroundColor: '#fff',
    transition: 'all 0.2s',
    outline: 'none'
}

const actionBtnStyle = {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    padding: '0.6rem 1.2rem',
    background: 'white',
    color: 'var(--primary-magenta)',
    border: '2px solid var(--primary-magenta)',
    borderRadius: '10px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
}

const saveBtnStyle = {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    padding: '0.6rem 1.5rem',
    background: 'var(--primary-magenta)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(237, 7, 117, 0.3)'
}

const cancelBtnStyle = {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    padding: '0.6rem 1.2rem',
    background: '#edf2f7',
    color: '#4a5568',
    border: 'none',
    borderRadius: '10px',
    fontWeight: '600',
    cursor: 'pointer'
}

export default MemberProfile