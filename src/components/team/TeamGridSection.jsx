import React from 'react'
import TeamMemberCard from './TeamMemberCard'
import Loading from '../common/Loading'
import './TeamGridSection.css'

import { firebaseService } from '../../services/firebaseService'

const TeamGridSection = () => {
    const [members, setMembers] = React.useState([])
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
        const fetchMembers = async () => {
            try {
                const data = await firebaseService.getBoardMembers()
                setMembers(data)
            } catch (error) {
                console.error("Failed to fetch team members", error)
            } finally {
                setLoading(false)
            }
        }
        fetchMembers()
    }, [])


    return (
        <section className="team-grid-section">
            <h1 className="team-grid-title">Meet Our Team</h1>
            {loading ? (
                <Loading fullScreen={false} />
            ) : members.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>No team members added yet.</div>
            ) : (
                <div className="team-grid-container">
                    {members.map(member => (
                        <TeamMemberCard
                            key={member.id}
                            name={member.name}
                            role={member.role}
                            image={member.image}
                            message={member.message}
                        />
                    ))}
                </div>
            )}
        </section>
    )
}

export default TeamGridSection
