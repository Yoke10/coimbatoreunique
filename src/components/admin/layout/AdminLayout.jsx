import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';
import './AdminLayout.css';

const AdminLayout = ({
    children,
    activeSection,
    onNavigate,
    user,
    onLogout,
    storageUsage,
    onClearData
}) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="admin-layout">
            {/* Mobile Header */}
            <div className="mobile-header">
                <button
                    className="mobile-menu-btn"
                    onClick={() => setSidebarOpen(true)}
                >
                    <Menu size={24} />
                </button>
                <div className="mobile-title">Admin Panel</div>
            </div>

            {/* Sidebar Navigation */}
            <Sidebar
                activeSection={activeSection}
                onNavigate={(section) => {
                    onNavigate(section);
                    setSidebarOpen(false); // Close on mobile selection
                }}
                user={user}
                onLogout={onLogout}
                storageUsage={storageUsage}
                onClearData={onClearData}
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            {/* Main Content Area */}
            <main className="admin-main-content">
                <div className="content-container">
                    {children}
                </div>
            </main>

            {/* Mobile Overlay for Sidebar */}
            {sidebarOpen && (
                <div
                    className="admin-modal-overlay"
                    style={{ zIndex: 9, background: 'rgba(0,0,0,0.5)' }}
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    );
};

export default AdminLayout;
