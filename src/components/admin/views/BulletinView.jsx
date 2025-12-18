import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Eye, FileText } from 'lucide-react';
import { firebaseService } from '../../../services/firebaseService';
import { useToast } from '../../ui/Toast/ToastContext';
import AdminModal from '../common/AdminModal';
import { AdminInput, AdminFile } from '../common/FormComponents';
import { fileToBase64, validateFile, formatDriveLink } from '../../../utils/fileHelpers';
import '../layout/AdminLayout.css';

const BulletinView = () => {
    const { toast } = useToast();
    const [bulletins, setBulletins] = useState([]);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    const [formData, setFormData] = useState({ title: '', month: '', poster: '', pdfUrl: '' });

    const [filesToUpload, setFilesToUpload] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => { loadBulletins(); }, []);

    const loadBulletins = async () => {
        setBulletins(await firebaseService.getBulletins());
    };

    const handleInputChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleFileChange = async (e, field, type) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validation
        const validation = validateFile(file, type);
        if (!validation.valid) {
            toast({ title: "Invalid File", description: validation.error || "Check file type", variant: "destructive" });
            return;
        }

        // IMAGE: Base64 (Database)
        if (type === 'image') {
            if (file.size > 500 * 1024) {
                toast({ title: "File too large", description: "Poster must be under 500KB", variant: "destructive" });
                return;
            }
            try {
                const base64 = await fileToBase64(file);
                setFormData(prev => ({ ...prev, [field]: base64 }));
            } catch { }
        }

        // PDF: Chunk Upload (Database)
        // Store raw file for later chunking in handleSubmit
        if (type === 'pdf') {
            setFilesToUpload(prev => ({ ...prev, [field]: file }));
            setFormData(prev => ({ ...prev, [field]: file.name })); // Visual Feedback
        }
    };

    const openAdd = () => {
        setFormData({ title: '', month: '', poster: '', pdfUrl: '' });
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
            let docId = selectedItem?.id;

            // 1. Create/Update Base Doc
            if (isEditing) {
                await firebaseService.updateBulletin(docId, updatedData);
            } else {
                const docRef = await firebaseService.addBulletin(updatedData);
                docId = docRef.id;
            }

            // 2. Upload Chunks (If PDF selected)
            if (filesToUpload.pdfUrl) {
                toast({ title: "Uploading PDF...", description: "Optimizing and saving to database..." });
                await firebaseService.uploadPdfChunks(docId, filesToUpload.pdfUrl);
            }

            toast({ title: "Success", description: "Bulletin saved successfully", variant: "success" });
            setIsFormModalOpen(false);
            loadBulletins();
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: error.message || "Failed to save bulletin.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Delete this bulletin?")) {
            await firebaseService.deleteBulletin(id);
            loadBulletins();
        }
    };

    return (
        <div className="admin-view">
            <div className="view-header">
                <h2 className="view-title">Bulletins</h2>
                <button onClick={openAdd} className="btn-add-new"><Plus size={18} /> Add Bulletin</button>
            </div>

            <div className="admin-list-container">
                {bulletins.map(item => (
                    <div key={item.id} className="list-row-card">
                        <div className="row-content">
                            <h3 className="row-title">{item.title}</h3>
                            <p className="row-subtitle">Edition: {item.month}</p>
                        </div>
                        <div className="row-actions">
                            <button onClick={() => { setSelectedItem(item); setIsDetailModalOpen(true); }} className="action-btn view"><Eye size={18} /></button>
                            <button onClick={() => openEdit(item)} className="action-btn edit"><Edit size={18} /></button>
                            <button onClick={() => handleDelete(item.id)} className="action-btn delete"><Trash2 size={18} /></button>
                        </div>
                    </div>
                ))}
            </div>

            <AdminModal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} title={isEditing ? "Edit Bulletin" : "Add Bulletin"}>
                <form onSubmit={handleSubmit}>
                    <AdminInput label="Title" name="title" value={formData.title} onChange={handleInputChange} required />
                    <AdminInput label="Month/Edition" name="month" value={formData.month} onChange={handleInputChange} required />
                    <AdminFile label="Cover Image" accept="image/webp" onChange={(e) => handleFileChange(e, 'poster', 'image')} />
                    {/* CHANGED: File Input for PDF (Chunk Strategy) */}
                    <AdminFile label="Bulletin PDF (Upload)" accept="application/pdf" onChange={(e) => handleFileChange(e, 'pdfUrl', 'pdf')} />

                    {/* Visual Feedback for selected file */}
                    {formData.pdfUrl && !formData.pdfUrl.startsWith('http') && (
                        <p style={{ fontSize: '0.8rem', marginTop: '-10px', color: '#666' }}>Selected: {formData.pdfUrl}</p>
                    )}
                    <button type="submit" className="admin-btn-primary" style={{ marginTop: '1.5rem' }} disabled={isSubmitting}>
                        {isSubmitting ? "Uploading..." : (isEditing ? "Update" : "Create")}
                    </button>
                </form>
            </AdminModal>

            <AdminModal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="Bulletin Details">
                {selectedItem && (
                    <div className="detail-view">
                        <img src={selectedItem.poster} alt="Cover" style={{ width: '150px', borderRadius: '8px', marginBottom: '1rem' }} />
                        <h3>{selectedItem.title}</h3>
                        <p><strong>Month:</strong> {selectedItem.month}</p>
                        <a href={selectedItem.pdfUrl} target="_blank" rel="noreferrer" className="admin-btn-primary" style={{ display: 'inline-block', width: 'auto', textDecoration: 'none' }}>View PDF</a>
                    </div>
                )}
            </AdminModal>
        </div>
    );
};


export default BulletinView;
