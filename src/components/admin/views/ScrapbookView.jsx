import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Eye, BookOpen } from 'lucide-react';
import { firebaseService } from '../../../services/firebaseService';
import { useToast } from '../../ui/Toast/ToastContext';
import AdminModal from '../common/AdminModal';
import { AdminInput, AdminFile } from '../common/FormComponents';
import { fileToBase64, validateFile, formatDriveLink, extractDriveId } from '../../../utils/fileHelpers';
import '../layout/AdminLayout.css';


const ScrapbookView = () => {
    const { toast } = useToast();
    const [items, setItems] = useState([]);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    const [formData, setFormData] = useState({ title: '', date: '', poster: '', driveFileId: '' });
    const [filesToUpload, setFilesToUpload] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => { load(); }, []);
    const load = async () => setItems(await firebaseService.getScrapbooks());

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'driveFileId') {
            const extracted = extractDriveId(value);
            setFormData(prev => ({ ...prev, [name]: extracted || value }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleFileChange = async (e, field, type) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!validateFile(file, type).valid) {
            toast({ title: "Invalid File", description: `Please select a valid ${type} file`, variant: "destructive" });
            return;
        }

        // Store raw file for upload
        setFilesToUpload(prev => ({ ...prev, [field]: file }));

        // Preview logic
        if (type === 'image') {
            try {
                const base64 = await fileToBase64(file);
                setFormData(prev => ({ ...prev, [field]: base64 }));
            } catch { }
        } else {
            // For PDF, show name as placeholder
            setFormData(prev => ({ ...prev, [field]: file.name }));
        }
    };

    const openAdd = () => {
        setFormData({ title: '', date: '', poster: '', driveFileId: '' });
        setFilesToUpload({});
        setIsEditing(false);
        setIsFormModalOpen(true);
    };

    const openEdit = (item) => {
        setFormData({ ...item });
        setFilesToUpload({});
        setSelectedItem(item);
        setIsEditing(true);
        setIsFormModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            let updatedData = { ...formData };

            // Upload files first
            if (Object.keys(filesToUpload).length > 0) {
                toast({ title: "Uploading...", description: "Please wait while files are being uploaded." });

                for (const [key, file] of Object.entries(filesToUpload)) {
                    if (file) {
                        try {
                            const path = `scrapbooks/${Date.now()}_${file.name}`;
                            const url = await firebaseService.uploadFile(file, path);
                            updatedData[key] = url;
                        } catch (uploadError) {
                            console.error(`Failed to upload ${key}`, uploadError);
                            toast({ title: "Upload Failed", description: `Failed to upload ${key}. Check console.`, variant: "destructive" });
                            setIsSubmitting(false);
                            return; // Stop submission
                        }
                    }
                }
            }

            if (isEditing) await firebaseService.updateScrapbook(selectedItem.id, updatedData);
            else await firebaseService.addScrapbook(updatedData);

            toast({ title: "Success", description: "Scrapbook saved successfully", variant: "success" });
            setIsFormModalOpen(false);
            load();
        } catch (error) {
            console.error("Save Error:", error);
            toast({ title: "Error", description: "Failed to save scrapbook.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Delete?")) { await firebaseService.deleteScrapbook(id); load(); }
    };

    return (
        <div className="admin-view">
            <div className="view-header">
                <h2 className="view-title">Scrapbooks</h2>
                <button onClick={openAdd} className="btn-add-new"><Plus size={18} /> Add Scrapbook</button>
            </div>

            <div className="admin-list-container">
                {items.map(item => (
                    <div key={item.id} className="list-row-card">
                        <div className="row-content">
                            <h3 className="row-title">{item.title}</h3>
                            <p className="row-subtitle">Date: {item.date}</p>
                        </div>
                        <div className="row-actions">
                            <button onClick={() => { setSelectedItem(item); setIsDetailModalOpen(true); }} className="action-btn view"><Eye size={18} /></button>
                            <button onClick={() => openEdit(item)} className="action-btn edit"><Edit size={18} /></button>
                            <button onClick={() => handleDelete(item.id)} className="action-btn delete"><Trash2 size={18} /></button>
                        </div>
                    </div>
                ))}
            </div>

            <AdminModal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} title={isEditing ? "Edit Scrapbook" : "Add Scrapbook"}>
                <form onSubmit={handleSubmit}>
                    <AdminInput label="Title" name="title" value={formData.title} onChange={handleInputChange} required />
                    <AdminInput label="Year/Date" name="date" value={formData.date} onChange={handleInputChange} required />
                    <AdminFile label="Cover Image" accept="image/webp" onChange={(e) => handleFileChange(e, 'poster', 'image')} />
                    <AdminInput label="Google Drive Link (or ID)" name="driveFileId" value={formData.driveFileId} onChange={handleInputChange} placeholder="Paste full Drive Link here..." required />
                    <button type="submit" className="admin-btn-primary" style={{ marginTop: '1.5rem' }} disabled={isSubmitting}>
                        {isSubmitting ? "Uploading..." : (isEditing ? "Update" : "Create")}
                    </button>
                </form>
            </AdminModal>

            <AdminModal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="Scrapbook Details">
                {selectedItem && (
                    <div className="detail-view">
                        <img src={selectedItem.poster} alt="Cover" style={{ width: '150px', borderRadius: '8px', marginBottom: '1rem' }} />
                        <h3>{selectedItem.title}</h3>
                        <p><strong>Date:</strong> {selectedItem.date}</p>
                        <p><strong>Drive ID:</strong> {selectedItem.driveFileId}</p>
                        <a href={`https://drive.google.com/file/d/${selectedItem.driveFileId}/view`} target="_blank" rel="noreferrer" className="admin-btn-primary" style={{ display: 'inline-block', width: 'auto', textDecoration: 'none' }}>Open in Drive</a>
                    </div>
                )}
            </AdminModal>
        </div>
    );
};

export default ScrapbookView;
