import React, { useState, useEffect } from 'react';
import { firebaseService } from '../../../services/firebaseService';
import '../MemberDashboard.css';

const MemberDirectory = () => {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadMembers();
    }, []);

    const loadMembers = async () => {
        try {
            console.log("Fetching members directory...");
            const data = await firebaseService.getUsers();
            console.log("Fetched members:", data);

            // Filter only active members
            // If data contains old mock structure, it might crash, so be safe
            const activeMembers = data.filter(u => u.status === 'active' || !u.status);
            setMembers(activeMembers);
        } catch (e) {
            console.error("Failed to load members:", e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading Directory...</div>;

    return (
        <div className="directory-grid">
            {members.map(member => (
                <div key={member.id} className="directory-card">
                    <div className="dir-avatar">
                        {member.profile?.fullName?.charAt(0) || member.username.charAt(0)}
                    </div>
                    <div className="dir-info">
                        <div className="dir-id">ID: {member.memberId || 'N/A'}</div>
                        <h3>{member.profile?.fullName || member.username}</h3>
                        <div className="dir-details">
                            <p>{member.profile?.designation || 'Member'}</p>
                            <p><a href={`mailto:${member.profile?.personalEmail}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                📧 {member.profile?.personalEmail || 'No email'}
                            </a></p>
                            <p>{member.profile?.bloodGroup && `🩸 ${member.profile.bloodGroup}`}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default MemberDirectory;
