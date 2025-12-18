import React, { useState, useEffect } from 'react';
import { firebaseService } from '../../services/firebaseService';
import { useToast } from '../ui/Toast/ToastContext';
import * as XLSX from 'xlsx';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import AdminModal from './common/AdminModal';
import { AdminInput } from './common/FormComponents';
import './layout/AdminLayout.css';
import { Trash2, Edit, Plus, Calendar, Mail, History, Settings, Send, Edit3, Clock, Eye, Upload } from 'lucide-react';

/* Styled Components for Email Manager specific Needs reuse AdminLayout classes where possible */

const EmailManager = () => {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState('birthday');

    // --- STATE ---
    const [contacts, setContacts] = useState({ presidents: [], secretaries: [], council: [] });
    const [members, setMembers] = useState([]);
    const [upcomingMessages, setUpcomingMessages] = useState([]);
    const [sentLogs, setSentLogs] = useState([]);
    const [config, setConfig] = useState({});
    const [drafts, setDrafts] = useState([]); // Persistent Drafts

    // Compose State
    const [bulkRecipients, setBulkRecipients] = useState([]);
    const [bulkColumns, setBulkColumns] = useState([]); // Available placeholders
    const [bulkEventDate, setBulkEventDate] = useState(''); // Global event date
    const [composeSubject, setComposeSubject] = useState('');
    const [composeBody, setComposeBody] = useState('');
    const [isSending, setIsSending] = useState(false);

    // Scheduled / Outbox State
    const [scheduledEmails, setScheduledEmails] = useState([]);
    const [schedulingId, setSchedulingId] = useState(null); // If editing an existing scheduled item

    // Bulk List Management State
    const [isViewingList, setIsViewingList] = useState(false);
    const [editingBulkIdx, setEditingBulkIdx] = useState(-1);
    const [bulkEditForm, setBulkEditForm] = useState({});

    // Edit Schedule State
    const [editingMsg, setEditingMsg] = useState(null); // If set, modal is open
    const [editSubject, setEditSubject] = useState('');
    const [editBody, setEditBody] = useState('');

    // --- NEW: Contact Management State ---
    const [managingCategory, setManagingCategory] = useState(null); // 'presidents', 'secretaries', 'council'
    const [managedList, setManagedList] = useState([]); // Temporary list for editing
    const [contactForm, setContactForm] = useState({ name: '', email: '', dob: '' });
    const [editingIndex, setEditingIndex] = useState(-1);

    // --- NEW: Settings State ---
    const [isTesting, setIsTesting] = useState(false);
    const [isEditingConfig, setIsEditingConfig] = useState(false);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [contactsData, configData, logsData, scheduledData, draftsData] = await Promise.all([
                firebaseService.getBirthdayContacts(),
                firebaseService.getClubConfig(),
                firebaseService.getSentLogs(),
                firebaseService.getScheduledEmails(),
                firebaseService.getBirthdayDrafts()
            ]);

            setContacts(contactsData || {});
            setConfig(configData || {});
            setSentLogs((logsData || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
            setScheduledEmails(scheduledData || []);
            setDrafts(draftsData || []);

            // Members might be needed depending on usage, but for now focus on these
            // setMembers(...) logic was separate in original or I can re-add if needed but keeping minimal diff
            setMembers(((await firebaseService.getUsers()) || []).filter(u => u.type !== 'admin'));
        } catch (e) { console.error(e); }
    };

    // Trigger schedule calculation when contacts/logs/drafts change
    useEffect(() => {
        if (contacts) calculateUpcomingSchedule();
    }, [contacts, members, sentLogs, drafts]);

    // --- LOGIC HELPERS ---

    // Safely parse a date into YYYY-MM-DD string
    const formatDateKey = (dateish) => {
        if (!dateish) return null;
        const d = new Date(dateish);
        if (isNaN(d.getTime())) return null;
        // Use Sweden locale for YYYY-MM-DD formatting consistent locally
        return d.toLocaleDateString('sv-SE');
    };

    const calculateUpcomingSchedule = async () => {
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Local Midnight today
        const today = now;

        const logs = sentLogs;

        let all = [];
        const addC = (list, cat) => {
            if (!list) return;
            list.forEach(c => {
                if (!c.dob) return;

                let dobDate; // This should be a Date object representing the DOB

                // 1. Handle Excel Serial (Number > 20000)
                if (!isNaN(c.dob) && Number(c.dob) > 10000) {
                    const excelSerial = Number(c.dob);
                    const utc_days = Math.floor(excelSerial - 25569);
                    // Create date from serial (UTC) then adjust
                    dobDate = new Date(utc_days * 86400 * 1000);
                } else {
                    // 2. Handle String/Date
                    dobDate = new Date(c.dob);
                }

                if (isNaN(dobDate.getTime())) return;

                let bMonth = dobDate.getMonth();
                let bDate = dobDate.getDate();

                let nextB = new Date(today.getFullYear(), bMonth, bDate);

                if (nextB < today) {
                    nextB.setFullYear(today.getFullYear() + 1);
                }

                // Check difference
                const diffTime = nextB - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                // Only show if within 30 days
                if (diffDays >= 0 && diffDays <= 30) {

                    const nextBStr = nextB.toLocaleDateString('sv-SE'); // YYYY-MM-DD

                    // Status Check: Match email & date key
                    const isSent = logs.some(l =>
                        l.email === c.email &&
                        l.date === nextBStr &&
                        l.type === 'birthday'
                    );

                    // Check for Draft
                    const draft = drafts.find(d => d.email === c.email && d.category === cat);

                    all.push({
                        ...c,
                        nextBirthday: nextBStr,
                        daysAway: diffDays,
                        category: cat,
                        isSent,
                        subject: draft ? draft.subject : 'Happy Birthday!',
                        body: draft ? draft.body : `Happy Birthday ${c.name}!`
                    });
                }
            });
        };
        addC(contacts.presidents, 'Presidents');
        addC(contacts.secretaries, 'Secretaries');
        addC(contacts.council, 'Council');

        setUpcomingMessages(all.sort((a, b) => a.daysAway - b.daysAway));
    };

    const handleFileUpload = (e, category) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(ws);

            if (category === 'bulk') {
                // Dynamic Bulk Logic
                const firstRow = data[0];
                if (!firstRow) return;

                const keys = Object.keys(firstRow);
                const emailK = keys.find(k => /mail/i.test(k));
                const nameK = keys.find(k => /name/i.test(k));

                if (!emailK || !nameK) {
                    toast({ title: "Invalid Format", description: "Excel must contain 'Name' and 'Email' columns.", variant: "destructive" });
                    return;
                }

                // Extract all keys for placeholders
                setBulkColumns(keys);

                const cleanBulk = data.map(row => {
                    // We keep all data for templating, but ensure name/email are normalized
                    return {
                        ...row,
                        _normalizedName: row[nameK],
                        _normalizedEmail: row[emailK]
                    };
                });

                setBulkRecipients(cleanBulk);
                toast({ title: `Loaded ${cleanBulk.length} recipients`, description: "Available variables: " + keys.map(k => `{${k}}`).join(', ') });
            } else {
                // SMART MERGE LOGIC (Status Quo)
                const currentList = contacts[category] || [];
                const mergedMap = new Map();

                // 1. Add existing
                currentList.forEach(c => mergedMap.set(c.email.toLowerCase(), c));

                // 2. Merge new (overwrite if exists, add if new)
                let addedCount = 0;
                let updatedCount = 0;

                const clean = data.map(row => {
                    const keys = Object.keys(row);
                    // Flexible column finding
                    const emailK = keys.find(k => /mail/i.test(k));
                    const dobK = keys.find(k => /dob|date/i.test(k));
                    const nameK = keys.find(k => /name/i.test(k));

                    if (emailK && dobK) {
                        let rawDob = row[dobK];
                        let finalDob = rawDob;

                        // If it's Excel Serial
                        if (typeof rawDob === 'number' && rawDob > 20000) {
                            const utc_days = Math.floor(rawDob - 25569);
                            const jsDate = new Date(utc_days * 86400 * 1000);
                            // Save as YYYY-MM-DD for consistency
                            finalDob = jsDate.toLocaleDateString('sv-SE');
                        } else if (new Date(rawDob).toString() !== 'Invalid Date') {
                            // It's a string or other date format
                            finalDob = new Date(rawDob).toLocaleDateString('sv-SE');
                        }

                        return { name: row[nameK] || 'Unknown', email: row[emailK], dob: finalDob };
                    }
                    return null;
                }).filter(Boolean);

                clean.forEach(c => {
                    const key = c.email.toLowerCase();
                    if (mergedMap.has(key)) {
                        updatedCount++;
                        mergedMap.set(key, { ...mergedMap.get(key), ...c });
                    } else {
                        addedCount++;
                        mergedMap.set(key, c);
                    }
                });

                const mergedList = Array.from(mergedMap.values());

                const newContacts = { ...contacts, [category]: mergedList };
                setContacts(newContacts);
                firebaseService.saveBirthdayContacts(newContacts);
                toast({ title: "Import Successful", description: `Added ${addedCount}, Updated ${updatedCount}`, variant: "success" });

                // AUTO OPEN MANAGE MODAL
                openManageModal(category);
            }
        };
        reader.readAsBinaryString(file);
    };

    // --- CORE SENDING LOGIC (Reusable) ---
    const executeBulkSend = async (recipients, subjectTmpl, bodyTmpl, eventDate) => {
        let sentCount = 0;
        let failCount = 0;

        for (const recipient of recipients) {
            try {
                let content = bodyTmpl;
                let subject = subjectTmpl;

                // 1. Replace Global Date
                const eventDateStr = eventDate ? new Date(eventDate).toLocaleDateString('sv-SE') : '';
                content = content.replace(/{EventDate}/g, eventDateStr);
                subject = subject.replace(/{EventDate}/g, eventDateStr);

                // 2. Replace Columns
                Object.keys(recipient).forEach(key => {
                    const val = recipient[key] || '';
                    const regex = new RegExp(`{${key}}`, 'g');
                    content = content.replace(regex, val);
                    subject = subject.replace(regex, val);
                });

                await firebaseService.sendEmail(recipient._normalizedEmail, subject, content);

                // Log content
                await firebaseService.addSentLog({
                    date: new Date().toLocaleDateString('sv-SE'),
                    timestamp: new Date().toLocaleString(),
                    email: recipient._normalizedEmail,
                    subject: subject,
                    type: 'bulk',
                    status: 'success'
                });
                sentCount++;

            } catch (e) {
                console.error(e);
                failCount++;
            }
        }
        return { sentCount, failCount };
    };

    const handleSendBulk = async () => {
        if (!config.email || !config.apps_script_url) {
            toast({ title: "Configure Sender & URL first", variant: "destructive" });
            return;
        }

        setIsSending(true);
        const { sentCount, failCount } = await executeBulkSend(bulkRecipients, composeSubject, composeBody, bulkEventDate);
        setIsSending(false);

        toast({ title: "Bulk Sending Complete", description: `Sent: ${sentCount}, Failed: ${failCount}`, variant: sentCount > 0 ? "success" : "destructive" });
    };

    // --- SCHEDULING & OUTBOX ---
    const handleScheduleBulk = async () => {
        if (!composeSubject || !composeBody || bulkRecipients.length === 0) {
            toast({ title: "Missing Data", description: "Need recipients, subject, and body.", variant: "destructive" });
            return;
        }

        const payload = {
            subject: composeSubject,
            body: composeBody,
            recipients: bulkRecipients,
            columns: bulkColumns,
            eventDate: bulkEventDate,
            scheduledAt: new Date().toISOString(),
            status: 'pending',
            createdBy: 'admin' // could get current user
        };

        try {
            if (schedulingId) {
                await firebaseService.updateScheduledEmail(schedulingId, payload);
                setScheduledEmails(prev => prev.map(p => p.id === schedulingId ? { ...p, ...payload } : p));
                toast({ title: "Schedule Updated", variant: "success" });
                setSchedulingId(null);
            } else {
                const newDoc = await firebaseService.addScheduledEmail(payload);
                setScheduledEmails(prev => [newDoc, ...prev]);
                toast({ title: "Added to Schedule", description: "View in Scheduled tab", variant: "success" });
            }
            // Reset form
            setComposeSubject('');
            setComposeBody('');
            setBulkRecipients([]);
            setBulkColumns([]);
            setBulkEventDate('');
        } catch (e) {
            console.error(e);
            toast({ title: "Scheduling Failed", description: e.message, variant: "destructive" });
        }
    };

    const handleSendScheduled = async (item) => {
        if (!config.email) return toast({ title: "Configure Sender first", variant: "destructive" });

        const confirm = window.confirm(`Ready to send to ${item.recipients.length} people?`);
        if (!confirm) return;

        const tId = toast({ title: "Sending Scheduled Batch...", description: "Please wait." });

        try {
            const { sentCount, failCount } = await executeBulkSend(item.recipients, item.subject, item.body, item.eventDate);

            // Mark as completed
            await firebaseService.updateScheduledEmail(item.id, {
                status: 'completed',
                sentAt: new Date().toISOString(),
                stats: { sent: sentCount, failed: failCount }
            });

            // Update local list
            setScheduledEmails(prev => prev.map(p => p.id === item.id ? { ...p, status: 'completed', sentAt: new Date().toISOString() } : p));
            toast({ title: "Verified & Sent", description: `Sent: ${sentCount}`, variant: "success" });
        } catch (e) {
            toast({ title: "Sending Error", description: e.message, variant: "destructive" });
        }
    };

    const handleDeleteScheduled = async (id) => {
        if (!window.confirm("Remove this scheduled item?")) return;
        try {
            await firebaseService.deleteScheduledEmail(id);
            setScheduledEmails(prev => prev.filter(p => p.id !== id));
            toast({ title: "Removed", variant: "success" });
        } catch (e) {
            toast({ title: "Error", variant: "destructive" });
        }
    };

    const handleEditScheduled = (item) => {
        setComposeSubject(item.subject);
        setComposeBody(item.body);
        setBulkRecipients(item.recipients || []);
        setBulkColumns(item.columns || []);
        setBulkEventDate(item.eventDate || '');
        setSchedulingId(item.id);
        setActiveTab('compose');
    };

    // --- BULK LIST EDITING ---
    const updateRecipient = (idx, field, value) => {
        const updated = [...bulkRecipients];
        updated[idx] = { ...updated[idx], [field]: value };
        // If name/email changed, update normalized
        if (field.toLowerCase().includes('name')) updated[idx]._normalizedName = value;
        if (field.toLowerCase().includes('mail')) updated[idx]._normalizedEmail = value;
        setBulkRecipients(updated);
    };

    const removeRecipient = (idx) => {
        const updated = bulkRecipients.filter((_, i) => i !== idx);
        setBulkRecipients(updated);
    };

    // --- NEW: Start Managing Category ---
    const openManageModal = (category) => {
        setManagingCategory(category);
        setManagedList([...(contacts[category.toLowerCase()] || [])]);
        setContactForm({ name: '', email: '', dob: '' });
        setEditingIndex(-1);
    };

    // --- NEW: Add/Delete/Update Contacts in Manager ---
    const handleSaveContact = () => {
        if (!contactForm.name || !contactForm.email) {
            toast({ title: "Name and Email required", variant: "destructive" });
            return;
        }

        const newList = [...managedList];
        if (editingIndex >= 0) {
            newList[editingIndex] = { ...contactForm };
            setEditingIndex(-1);
            toast({ title: "Contact Updated" });
        } else {
            newList.push({ ...contactForm });
            toast({ title: "Contact Added" });
        }

        setManagedList(newList);
        setContactForm({ name: '', email: '', dob: '' });
    };

    const handleEditContact = (idx) => {
        setContactForm({ ...managedList[idx] });
        setEditingIndex(idx);
    };

    const handleDeleteContact = (idx) => {
        const updating = [...managedList];
        updating.splice(idx, 1);
        setManagedList(updating);
    };

    const saveManagedList = async () => {
        const newContacts = { ...contacts, [managingCategory.toLowerCase()]: managedList };
        setContacts(newContacts);
        await firebaseService.saveBirthdayContacts(newContacts);
        toast({ title: "List Updated", variant: "success" });
        setManagingCategory(null);
    };

    // --- NEW: Test Email ---
    const handleTestEmail = async () => {
        if (!config.email || !config.apps_script_url) {
            toast({ title: "Configure Sender & URL first", variant: "destructive" });
            return;
        }
        setIsTesting(true);
        try {
            await firebaseService.sendEmail(config.email, "Test Email from Rotaract", "This is a test email to verify your configuration.");
            toast({ title: "Test Email Sent", description: `Check inbox of ${config.email}`, variant: "success" });
        } catch (e) {
            toast({ title: "Test Failed", description: e.message, variant: "destructive" });
        } finally {
            setIsTesting(false);
        }
    };


    // --- NEW: Handle History Deletion ---
    const handleDeleteLog = async (id) => {
        if (!window.confirm("Delete this log entry?")) return;
        try {
            await firebaseService.deleteSentLog(id);
            setSentLogs(prev => prev.filter(l => l.id !== id));
            toast({ title: "Log Deleted", variant: "success" });
        } catch (e) {
            toast({ title: "Error", variant: "destructive" });
        }
    };

    const handleClearHistory = async () => {
        if (!window.confirm("Clear ENTIRE history? This cannot be undone.")) return;
        try {
            await firebaseService.clearSentLogs();
            setSentLogs([]);
            toast({ title: "History Cleared", variant: "success" });
        } catch (e) {
            toast({ title: "Error", variant: "destructive" });
        }
    };

    // --- NEW: Handle Drafts and Sending for Upcoming Messages ---
    const handleSaveDraft = async () => {
        if (!editingMsg) return;

        try {
            const draftPayload = {
                email: editingMsg.email,
                category: editingMsg.category,
                subject: editSubject,
                body: editBody,
                updatedAt: new Date().toISOString()
            };

            await firebaseService.saveBirthdayDraft(draftPayload);

            // Update local drafts state to trigger re-calc
            setDrafts(prev => {
                const filtered = prev.filter(d => !(d.email === editingMsg.email && d.category === editingMsg.category));
                return [...filtered, draftPayload];
            });

            setEditingMsg(null);
            toast({ title: "Draft Saved", description: "Changes saved to database.", variant: "success" });
        } catch (e) {
            console.error(e);
            toast({ title: "Save Failed", description: e.message, variant: "destructive" });
        }
    };

    const handleSendBirthdayWish = async (msg) => {
        if (!config.email || !config.apps_script_url) {
            toast({ title: "Configure Sender & URL first", variant: "destructive" });
            return;
        }

        const toastId = toast({ title: "Sending...", description: `Emailing ${msg.name}`, duration: 10000 });
        try {
            await firebaseService.sendEmail(msg.email, msg.subject, msg.body);

            // Log success
            const logEntry = {
                date: new Date().toLocaleDateString('sv-SE'), // Consistent YYYY-MM-DD
                timestamp: new Date().toLocaleString(),
                email: msg.email,
                subject: msg.subject,
                type: 'birthday',
                status: 'success'
            };
            await firebaseService.addSentLog(logEntry);

            // Clean up draft if exists
            await firebaseService.deleteBirthdayDraft(msg.email, msg.category);
            setDrafts(prev => prev.filter(d => !(d.email === msg.email && d.category === msg.category)));

            // Update UI
            setUpcomingMessages(prev => prev.map(p =>
                (p.email === msg.email && p.category === msg.category) ? { ...p, isSent: true } : p
            ));

            // Refresh logs
            setSentLogs(prev => [logEntry, ...prev]);

            toast({ title: "Sent Successfully", variant: "success" });

        } catch (error) {
            console.error(error);
            toast({ title: "Failed to Send", description: error.message, variant: "destructive" });
        }
    };

    // --- RENDER ---
    return (
        <div className="admin-view">
            <h2 className="view-title">Email Manager</h2>

            {/* TABS */}
            <div className="email-tabs">
                <button className={`email-tab ${activeTab === 'birthday' ? 'active' : ''}`} onClick={() => setActiveTab('birthday')}><Calendar size={16} /> Birthdays</button>
                <button className={`email-tab ${activeTab === 'compose' ? 'active' : ''}`} onClick={() => setActiveTab('compose')}>
                    <Edit3 size={18} /> Compose & Schedule
                </button>
                <button className={`email-tab ${activeTab === 'scheduled' ? 'active' : ''}`} onClick={() => setActiveTab('scheduled')}>
                    <Clock size={18} /> Scheduled ({scheduledEmails.length})
                </button>
                <button className={`email-tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
                    <History size={18} /> History
                </button>
                <button className={`email-tab ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}><Settings size={16} /> Settings</button>
            </div>

            {/* CONTENT */}
            <div className="email-content">

                {activeTab === 'birthday' && (
                    <div className="fade-in">
                        {/* Summary Cards */}
                        <div className="admin-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '2rem' }}>
                            {['Presidents', 'Secretaries', 'Council'].map(cat => (
                                <div key={cat} className="admin-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                                    <h4 style={{ margin: 0, color: 'var(--gray)' }}>{cat}</h4>
                                    <h2 style={{ fontSize: '2rem', margin: '0.5rem 0', color: 'var(--admin-primary)' }}>{contacts[cat.toLowerCase()]?.length || 0}</h2>
                                    <label className="action-btn view" style={{ display: 'inline-block', width: 'auto', margin: '0 auto', cursor: 'pointer' }}>
                                        <Upload size={14} style={{ marginRight: 5 }} /> Import XLSX
                                        <input type="file" accept=".xlsx,.csv" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, cat.toLowerCase())} />
                                    </label>
                                    <button onClick={() => openManageModal(cat)} className="admin-btn-secondary" style={{ width: '100%', marginTop: '0.5rem' }}>
                                        Manage List
                                    </button>
                                </div>
                            ))}
                        </div>

                        <h3 className="admin-section-title">Upcoming Birthdays (30 Days)</h3>
                        <div className="admin-table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Name</th>
                                        <th>Category</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {upcomingMessages.length === 0 ? <tr><td colSpan="5" className="empty-state">No upcoming birthdays</td></tr> :
                                        upcomingMessages.map((msg, idx) => (
                                            <tr key={idx}>
                                                <td> {msg.nextBirthday} <span className="admin-badge" style={{ fontSize: '0.7rem' }}>{msg.daysAway} days</span></td>
                                                <td>{msg.name}<br /><span style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>{msg.email}</span></td>
                                                <td>{msg.category}</td>
                                                <td>{msg.isSent ? <span className="status-badge status-active">Sent</span> : <span className="status-badge status-member">Pending</span>}</td>
                                                <td>
                                                    {!msg.isSent && <button onClick={() => { setEditingMsg(msg); setEditSubject(msg.subject); setEditBody(msg.body); }} className="action-btn edit">Edit</button>}
                                                    {!msg.isSent && msg.daysAway === 0 && <button onClick={() => handleSendBirthdayWish(msg)} className="action-btn view" style={{ color: 'var(--admin-success)', borderColor: 'var(--admin-success)' }}><Send size={14} /> Send</button>}
                                                    {msg.isSent && <span style={{ fontSize: '0.8rem', color: 'var(--admin-success)' }}>Done</span>}
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'compose' && (
                    <div className="fade-in" style={{ maxWidth: '800px' }}>
                        <div className="admin-card" style={{ padding: '2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ marginTop: 0 }}>{schedulingId ? 'Edit Scheduled Email' : 'Send Bulk Email'}</h3>
                                {schedulingId && <button onClick={() => { setSchedulingId(null); setComposeSubject(''); setComposeBody(''); setBulkRecipients([]); }} className="admin-btn-secondary" style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', height: 'auto' }}>Cancel Edit</button>}
                            </div>

                            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '2rem', alignItems: 'end' }}>
                                <div style={{ flex: 1 }}>
                                    <label className="admin-label">recipients (.xlsx)</label>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                        {/* Styled File Input */}
                                        <label className="admin-btn-secondary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Upload size={16} /> Choose Excel File
                                            <input type="file" accept=".xlsx" onChange={(e) => handleFileUpload(e, 'bulk')} style={{ display: 'none' }} />
                                        </label>

                                        {bulkRecipients.length > 0 && (
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.9rem', color: 'var(--admin-primary)' }}>{bulkRecipients.length} recipients</span>
                                                <button onClick={() => { setBulkRecipients([]); setBulkColumns([]); }} className="action-btn delete" title="Clear List">
                                                    <Trash2 size={16} />
                                                </button>
                                                <button onClick={() => setIsViewingList(true)} className="admin-btn-outline" style={{ display: 'flex', gap: '5px', padding: '6px 10px', fontSize: '0.8rem' }}>
                                                    <Eye size={14} /> View
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {bulkColumns.length > 0 && <p className="file-helper-text" style={{ marginTop: '0.5rem' }}>Variables: {bulkColumns.map(c => `{${c}}`).join(', ')}</p>}
                                </div>

                                <div style={{ flex: 1 }}>
                                    <AdminInput label="Event/Schedule Date" type="date" value={bulkEventDate} onChange={(e) => setBulkEventDate(e.target.value)} />
                                    <p className="file-helper-text">Use <code>{'{EventDate}'}</code> in your message</p>
                                </div>
                            </div>
                            <AdminInput label="Subject" value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} />
                            <div className="admin-form-group">
                                <label className="admin-label">Message Body</label>
                                <ReactQuill theme="snow" value={composeBody} onChange={setComposeBody} style={{ height: '200px', marginBottom: '3rem' }} />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button onClick={handleScheduleBulk} className="admin-btn-secondary" style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                    <Clock size={18} /> {schedulingId ? "Update Schedule" : "Schedule / Save Draft"}
                                </button>
                                <button onClick={handleSendBulk} disabled={isSending} className="admin-btn-primary" style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                    <Send size={18} /> {isSending ? "Sending..." : "Send Now"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'scheduled' && (
                    <div className="admin-table-container">
                        <table className="admin-table">
                            <thead><tr><th>Proposed Date</th><th>Subject</th><th>Recipients</th><th>Status</th><th>Action</th></tr></thead>
                            <tbody>
                                {scheduledEmails.map((item, i) => (
                                    <tr key={i}>
                                        <td>
                                            {item.eventDate || 'No Date'}
                                            <br /><span style={{ fontSize: '0.75rem', color: '#888' }}>Created: {new Date(item.scheduledAt).toLocaleDateString()}</span>
                                        </td>
                                        <td>{item.subject}</td>
                                        <td>{item.recipients?.length || 0}</td>
                                        <td>
                                            {item.status === 'completed' ? <span className="status-badge status-active">Sent</span> : <span className="status-badge status-member">Draft/Pending</span>}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                {item.status !== 'completed' && (
                                                    <>
                                                        <button onClick={() => handleEditScheduled(item)} className="action-btn edit" title="Edit"><Edit size={14} /></button>
                                                        <button onClick={() => handleSendScheduled(item)} className="action-btn view" title="Send Now"><Send size={14} /></button>
                                                    </>
                                                )}
                                                <button onClick={() => handleDeleteScheduled(item.id)} className="action-btn delete" title="Delete"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {scheduledEmails.length === 0 && <tr><td colSpan="5" className="empty-state">No scheduled emails</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="admin-table-container">
                        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '1rem' }}>
                            {sentLogs.length > 0 && (
                                <button onClick={handleClearHistory} className="admin-btn-destructive" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <Trash2 size={16} /> Clear All History
                                </button>
                            )}
                        </div>
                        <table className="admin-table">
                            <thead><tr><th>Time</th><th>To</th><th>Subject</th><th>Status</th><th>Action</th></tr></thead>
                            <tbody>
                                {sentLogs.map((log, i) => (
                                    <tr key={i}>
                                        <td>{log.timestamp || log.date}</td>
                                        <td>{log.email}</td>
                                        <td>{log.subject}</td>
                                        <td>{log.status}</td>
                                        <td>
                                            <button onClick={() => handleDeleteLog(log.id)} className="action-btn delete" title="Delete Log">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {sentLogs.length === 0 && <tr><td colSpan="5" className="empty-state">No history</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="admin-card" style={{ padding: '2rem', maxWidth: '600px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0 }}>Configuration</h3>
                            {!isEditingConfig && (
                                <button onClick={() => setIsEditingConfig(true)} className="admin-btn-outline" style={{ width: 'auto' }}>
                                    <Edit size={16} /> Edit Details
                                </button>
                            )}
                        </div>

                        <div className={!isEditingConfig ? 'form-readonly' : ''}>
                            <AdminInput label="Sender Name" value={config.name || ''} onChange={(e) => setConfig({ ...config, name: e.target.value })} disabled={!isEditingConfig} />
                            <AdminInput label="Sender Email" value={config.email || ''} onChange={(e) => setConfig({ ...config, email: e.target.value })} disabled={!isEditingConfig} />
                            <AdminInput label="App Script URL" value={config.apps_script_url || ''} onChange={(e) => setConfig({ ...config, apps_script_url: e.target.value })} disabled={!isEditingConfig} />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                            {isEditingConfig ? (
                                <>
                                    <button onClick={async () => {
                                        await firebaseService.saveClubConfig(config);
                                        setIsEditingConfig(false);
                                        toast({ title: "Configuration Updated", variant: "success" });
                                    }} className="admin-btn-primary">
                                        Update Configuration
                                    </button>
                                    <button onClick={() => { setIsEditingConfig(false); loadData(); }} className="admin-btn-secondary">
                                        Cancel
                                    </button>
                                </>
                            ) : (
                                <button onClick={handleTestEmail} disabled={isTesting} className="admin-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Send size={16} /> {isTesting ? "Sending..." : "Send Test Email"}
                                </button>
                            )}
                        </div>
                    </div>
                )}

            </div>

            {/* EDIT MODAL */}
            <AdminModal isOpen={!!editingMsg} onClose={() => setEditingMsg(null)} title="Customize Message">
                {editingMsg && (
                    <>
                        <AdminInput label="Subject" value={editSubject} onChange={(e) => setEditSubject(e.target.value)} />
                        <ReactQuill theme="snow" value={editBody} onChange={setEditBody} style={{ height: '200px', marginBottom: '3rem' }} />
                        <button onClick={handleSaveDraft} className="admin-btn-primary">Save Draft</button>
                    </>
                )}
            </AdminModal>

            {/* MANAGE CONTACTS MODAL */}
            <AdminModal isOpen={!!managingCategory} onClose={() => setManagingCategory(null)} title={`Manage ${managingCategory}`} size="large">
                <div className="manage-contacts-view">
                    {/* Add Form */}
                    <div className="add-contact-row" style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr auto', gap: '1rem', alignItems: 'end', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #eee' }}>
                        <AdminInput label="Name" value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} />
                        <AdminInput label="Email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} />
                        <AdminInput label="Birthday" type="date" value={contactForm.dob} onChange={(e) => setContactForm({ ...contactForm, dob: e.target.value })} />
                        <div style={{ display: 'flex', gap: '5px' }}>
                            {editingIndex >= 0 && <button onClick={() => { setEditingIndex(-1); setContactForm({ name: '', email: '', dob: '' }); }} className="admin-btn-secondary" style={{ height: '42px', width: 'auto' }}>Cancel</button>}
                            <button onClick={handleSaveContact} className="admin-btn-primary" style={{ height: '42px', width: 'auto' }}>{editingIndex >= 0 ? 'Update' : <Plus size={18} />}</button>
                        </div>
                    </div>

                    {/* List */}
                    <div className="admin-table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>DOB</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {managedList.map((c, idx) => (
                                    <tr key={idx}>
                                        <td>{c.name}</td>
                                        <td>{c.email}</td>
                                        <td>{c.dob}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button onClick={() => handleEditContact(idx)} className="action-btn edit"><Edit size={14} /></button>
                                                <button onClick={() => handleDeleteContact(idx)} className="action-btn delete"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {managedList.length === 0 && <tr><td colSpan="4" className="empty-state">No contacts yet</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="modal-actions" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button onClick={() => setManagingCategory(null)} className="admin-btn-secondary">Cancel</button>
                    <button onClick={saveManagedList} className="admin-btn-primary">Save Changes</button>
                </div>
            </AdminModal>

            {/* BULK LIST EDIT MODAL */}
            <AdminModal isOpen={isViewingList} onClose={() => setIsViewingList(false)} title={`Review Recipients (${bulkRecipients.length})`} size="large">
                <div className="admin-table-container" style={{ maxHeight: '500px', overflowY: 'auto', marginBottom: '1rem' }}>
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                {/* Try to show 1-2 extra columns if available */}
                                {bulkColumns.filter(c => !c.match(/name|mail/i)).slice(0, 2).map(c => <th key={c}>{c}</th>)}
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bulkRecipients.map((r, idx) => (
                                <tr key={idx}>
                                    <td>
                                        {/* Simple inline edit for name/email */}
                                        <input
                                            className="inline-edit-input"
                                            value={r._normalizedName || ''}
                                            onChange={(e) => updateRecipient(idx, '_normalizedName', e.target.value)}
                                            style={{ border: 'none', background: 'transparent', width: '100%' }}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            className="inline-edit-input"
                                            value={r._normalizedEmail || ''}
                                            onChange={(e) => updateRecipient(idx, '_normalizedEmail', e.target.value)}
                                            style={{ border: 'none', background: 'transparent', width: '100%' }}
                                        />
                                    </td>
                                    {bulkColumns.filter(c => !c.match(/name|mail/i)).slice(0, 2).map(c => (
                                        <td key={c} style={{ color: '#888', fontSize: '0.9rem' }}>{r[c]}</td>
                                    ))}
                                    <td>
                                        <button onClick={() => removeRecipient(idx)} className="action-btn delete" title="Remove"><Trash2 size={14} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <button onClick={() => setIsViewingList(false)} className="admin-btn-primary">Done</button>
                </div>
            </AdminModal>
        </div>
    );
};

export default EmailManager;
