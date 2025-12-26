import React, { useState } from 'react'
import { firebaseService } from '../../services/firebaseService'
import { useToast } from '../ui/Toast/ToastContext'
import { Eye, EyeOff } from 'lucide-react'
import './MemberLogin.css'

const Login = ({ onLogin }) => {
    const { toast } = useToast()
    const [isActive, setIsActive] = useState(false)
    const [loading, setLoading] = useState(false)

    const [memberUsername, setMemberUsername] = useState('')
    const [memberPassword, setMemberPassword] = useState('')
    const [adminUsername, setAdminUsername] = useState('')
    const [adminPassword, setAdminPassword] = useState('')

    const [showMemberPass, setShowMemberPass] = useState(false)
    const [showAdminPass, setShowAdminPass] = useState(false)

    const handleToggle = (status) => {
        setIsActive(status)
        setMemberUsername('')
        setMemberPassword('')
        setAdminUsername('')
        setAdminPassword('')
    }

    const validate = (username, password) => {
        if (!username.trim()) {
            toast({ title: 'Username is required', variant: 'destructive' })
            return false
        }
        if (password.length < 5) {
            toast({
                title: 'Invalid Password',
                description: 'Password must be at least 5 characters',
                variant: 'destructive'
            })
            return false
        }
        return true
    }

    const performLogin = async (username, password, type) => {
        if (!validate(username, password)) return

        setLoading(true)
        try {
            // Login now only returns Auth User
            const userAuth = await firebaseService.login(username, password)

            toast({
                title: 'Login Successful',
                description: `Welcome back! Redirecting...`,
                variant: 'success'
            })

            // Notify parent (though AuthContext will trigger re-render)
            onLogin(userAuth)
        } catch (err) {
            toast({
                title: 'Login Failed',
                description: err.message || 'Invalid credentials',
                variant: 'destructive'
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="login-page">
            <div className={`login-container ${isActive ? 'active' : ''}`}>

                <div className="curved-shape"></div>
                <div className="curved-shape2"></div>

                {/* MEMBER */}
                <div className="form-box Member">
                    <h2 className="animation">Member Space</h2>
                    <form onSubmit={(e) => {
                        e.preventDefault()
                        performLogin(memberUsername, memberPassword, 'member')
                    }}>
                        <div className="input-box animation">
                            <input
                                type="text"
                                value={memberUsername}
                                onChange={(e) => setMemberUsername(e.target.value)}
                            />
                            <label>Username</label>
                        </div>

                        <div className="input-box animation">
                            <input
                                type={showMemberPass ? "text" : "password"}
                                value={memberPassword}
                                onChange={(e) => setMemberPassword(e.target.value)}
                            />
                            <label>Password</label>
                            <span
                                className="password-toggle-icon"
                                onClick={() => setShowMemberPass(!showMemberPass)}
                            >
                                {showMemberPass ? <EyeOff size={20} /> : <Eye size={20} />}
                            </span>
                        </div>

                        <button className="login-btn animation" disabled={loading}>
                            {loading ? 'Logging in...' : 'Login'}
                        </button>

                        <p className="regi-link animation">
                            <span onClick={() => handleToggle(true)}>Access Admin Space</span>
                        </p>
                    </form>
                </div>

                {/* ADMIN */}
                <div className="form-box Admin">
                    <h2 className="animation">Admin Space</h2>
                    <form onSubmit={(e) => {
                        e.preventDefault()
                        performLogin(adminUsername, adminPassword, 'admin')
                    }}>
                        <div className="input-box animation">
                            <input
                                type="text"
                                value={adminUsername}
                                onChange={(e) => setAdminUsername(e.target.value)}
                            />
                            <label>Username</label>
                        </div>

                        <div className="input-box animation">
                            <input
                                type={showAdminPass ? "text" : "password"}
                                value={adminPassword}
                                onChange={(e) => setAdminPassword(e.target.value)}
                            />
                            <label>Password</label>
                            <span
                                className="password-toggle-icon"
                                onClick={() => setShowAdminPass(!showAdminPass)}
                            >
                                {showAdminPass ? <EyeOff size={20} /> : <Eye size={20} />}
                            </span>
                        </div>

                        <button className="login-btn animation" disabled={loading}>
                            {loading ? 'Logging in...' : 'Login'}
                        </button>

                        <p className="regi-link animation">
                            <span onClick={() => handleToggle(false)}>Access Member Space</span>
                        </p>
                    </form>
                </div>

                {/* INFO PANELS – unchanged animation */}
                <div className="info-content Member">
                    <h2 className="animation">WELCOME MEMBERS</h2>
                    <p className="animation">
                        Access your dashboard, activities and resources.
                    </p>
                </div>

                <div className="info-content Admin">
                    <h2 className="animation">WELCOME ADMIN</h2>
                    <p className="animation">
                        Manage members, events and club data securely.
                    </p>
                </div>
            </div>
        </div>
    )
}

export default Login
