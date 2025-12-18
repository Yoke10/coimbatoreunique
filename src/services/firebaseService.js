
import { db, auth, storage } from '../firebase/config';
import {
    collection, getDocs, addDoc, deleteDoc, doc, updateDoc, getDoc,
    query, where, orderBy, setDoc, runTransaction
} from 'firebase/firestore';
import {
    signInWithEmailAndPassword, signOut, setPersistence, browserLocalPersistence,
    createUserWithEmailAndPassword, getAuth as getSecondaryAuth, signOut as signOutSecondary,
    updatePassword
} from 'firebase/auth';
import {
    ref, uploadBytes, getDownloadURL, deleteObject
} from 'firebase/storage';
import { initializeApp, deleteApp } from 'firebase/app';

const COLLECTIONS = {
    EVENTS: 'events',
    BULLETINS: 'bulletins',
    SCRAPBOOKS: 'scrapbooks',
    GALLERY: 'gallery',
    SUPPORT: 'support',
    JOIN_REQUESTS: 'join_requests',
    REPORTS: 'reports',
    USERS: 'members', // 'users' is often reserved or confusing with Auth
    CONFIG: 'club_config',
    SENT_LOGS: 'sent_logs',
    RESOURCES: 'resources',
    BOARD: 'board_members',
    TEMPLATES: 'email_templates'
};

// Helper to map doc snapshot to object
const mapDoc = (doc) => ({ id: doc.id, ...doc.data() });

export const firebaseService = {
    // --- AUTHENTICATION ---
    isAdmin: async (uid) => {
        try {
            const ref = doc(db, "admins", uid);
            const snap = await getDoc(ref);
            return snap.exists() && snap.data().active === true;
        } catch (error) {
            console.error("Error checking admin status:", error);
            return false;
        }
    },
    login: async (username, password) => {
        let email = username || '';
        if (!email.includes('@')) {
            if (email === 'admin') email = 'admin@rotaract.com';
            else if (email === 'member') email = 'member@rotaract.com';
            else email = `${email}@coimbatoreunique.club`;
        }

        try {
            await setPersistence(auth, browserLocalPersistence);
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            return userCredential.user;
        } catch (error) {
            console.error("Firebase Login Error:", error);
            if (error.code === 'auth/invalid-credential') {
                throw new Error("Invalid username or password.");
            }
            throw new Error(error.message);
        }
    },

    // GET SINGLE USER (by UID)
    getUser: async (uid) => {
        // Wait for auth to be ready involves checking existing auth state
        // In the context flow, we might have the user object already, but safe to keep check.
        const ref = doc(db, COLLECTIONS.USERS, uid);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
            console.warn("User document not found in Firestore:", uid);

            // Fallback: Check if the request is for the currently logged-in user
            const currentUser = auth.currentUser;
            if (currentUser && currentUser.uid === uid) {
                console.log("Returning fallback user from Auth state");
                return {
                    id: uid,
                    email: currentUser.email,
                    username: currentUser.email ? currentUser.email.split('@')[0] : 'User',
                    role: 'member', // Default safety role
                    profile: {
                        fullName: currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'Unknown User'),
                        email: currentUser.email
                    }
                };
            }

            return null;
        }

        return mapDoc(snap);
    },

    logout: async () => {
        await signOut(auth);
    },

    // --- HELPERS ---
    waitForAuth: () => {
        return new Promise((resolve) => {
            if (auth.currentUser) {
                // Already loaded
                resolve(auth.currentUser);
                return;
            }

            console.log("[waitForAuth] Auth not ready, listening for restore...");

            const unsubscribe = auth.onAuthStateChanged((user) => {
                if (user) {
                    // Got a user!
                    console.log("[waitForAuth] User restored:", user.uid);
                    unsubscribe();
                    resolve(user);
                } else {
                    // Got null (still initializing or truly logged out). 
                    // We wait, hoping for a user, until the timeout hits.
                    console.log("[waitForAuth] Intermediate null state, waiting...");
                }
            });

            // Timeout - if we still have no user after 4s, we assume logged out.
            setTimeout(() => {
                console.warn("[waitForAuth] Timeout waiting for user.");
                unsubscribe();
                resolve(auth.currentUser);
            }, 4000);
        });
    },

    // --- GENERIC CRUD HELPERS ---
    getAll: async (collectionName) => {
        await firebaseService.waitForAuth();
        const querySnapshot = await getDocs(collection(db, collectionName));
        return querySnapshot.docs.map(mapDoc);
    },

    add: async (collectionName, data) => {
        await firebaseService.waitForAuth();
        const docRef = await addDoc(collection(db, collectionName), data);
        return { id: docRef.id, ...data };
    },

    delete: async (collectionName, id) => {
        await firebaseService.waitForAuth();
        await deleteDoc(doc(db, collectionName, id));
    },

    update: async (collectionName, id, data) => {
        const authUser = await firebaseService.waitForAuth();

        if (!authUser) {
            throw new Error("Security check failed: Session not found. Please logout and login again.");
        }

        try {
            await updateDoc(doc(db, collectionName, id), data);
            return { id, ...data };
        } catch (e) {
            console.error("[Firebase Update] Failed:", e);
            if (e.code === 'permission-denied') {
                throw new Error("Permission Denied: You do not have access to modify this record.");
            }
            throw e;
        }
    },

    // --- SPECIFIC METHODS (Mapping mockDataService) ---

    // EVENTS
    getEvents: () => firebaseService.getAll(COLLECTIONS.EVENTS),
    addEvent: (event) => firebaseService.add(COLLECTIONS.EVENTS, event),
    deleteEvent: (id) => firebaseService.delete(COLLECTIONS.EVENTS, id),
    updateEvent: (id, updates) => firebaseService.update(COLLECTIONS.EVENTS, id, updates),

    // BULLETINS
    getBulletins: () => firebaseService.getAll(COLLECTIONS.BULLETINS),
    addBulletin: (item) => firebaseService.add(COLLECTIONS.BULLETINS, item),
    deleteBulletin: (id) => firebaseService.delete(COLLECTIONS.BULLETINS, id),
    updateBulletin: (id, updates) => firebaseService.update(COLLECTIONS.BULLETINS, id, updates),

    // SCRAPBOOKS
    getScrapbooks: () => firebaseService.getAll(COLLECTIONS.SCRAPBOOKS),
    addScrapbook: (item) => firebaseService.add(COLLECTIONS.SCRAPBOOKS, item),
    deleteScrapbook: (id) => firebaseService.delete(COLLECTIONS.SCRAPBOOKS, id),
    updateScrapbook: (id, updates) => firebaseService.update(COLLECTIONS.SCRAPBOOKS, id, updates),

    // GALLERY (With Storage Support)
    getGallery: () => firebaseService.getAll(COLLECTIONS.GALLERY),

    // Custom upload logic needed for Gallery? 
    // The current mock service just stores URLs. 
    // If we want real file upload, we need a new method `uploadImage`
    addGalleryItem: (item) => firebaseService.add(COLLECTIONS.GALLERY, item),
    deleteGalleryItem: (id) => firebaseService.delete(COLLECTIONS.GALLERY, id),
    updateGalleryItem: (id, updates) => firebaseService.update(COLLECTIONS.GALLERY, id, updates),

    // SUPPORT
    getSupportMessages: () => firebaseService.getAll(COLLECTIONS.SUPPORT),
    addSupportMessage: (msg) => firebaseService.add(COLLECTIONS.SUPPORT, msg),
    deleteSupportMessage: (id) => firebaseService.delete(COLLECTIONS.SUPPORT, id),

    // JOIN REQUESTS
    getJoinRequests: () => firebaseService.getAll(COLLECTIONS.JOIN_REQUESTS),
    addJoinRequest: (req) => firebaseService.add(COLLECTIONS.JOIN_REQUESTS, req),
    deleteJoinRequest: (id) => firebaseService.delete(COLLECTIONS.JOIN_REQUESTS, id),
    updateJoinRequest: (id, updates) => firebaseService.update(COLLECTIONS.JOIN_REQUESTS, id, updates),

    // REPORTS
    getReports: () => firebaseService.getAll(COLLECTIONS.REPORTS),
    addReport: (report) => firebaseService.add(COLLECTIONS.REPORTS, report),
    deleteReport: (id) => firebaseService.delete(COLLECTIONS.REPORTS, id),
    updateReport: (id, updates) => firebaseService.update(COLLECTIONS.REPORTS, id, updates),

    // USERS / MEMBERS
    getUsers: () => firebaseService.getAll(COLLECTIONS.USERS),

    generateMemberId: async () => {
        const counterRef = doc(db, COLLECTIONS.CONFIG, 'member_id_counter');

        try {
            const newId = await runTransaction(db, async (transaction) => {
                const sfDoc = await transaction.get(counterRef);

                let currentId;
                if (!sfDoc.exists()) {
                    currentId = 50295000;
                } else {
                    currentId = sfDoc.data().current;
                }

                const nextId = currentId + 1;
                transaction.set(counterRef, { current: nextId });
                return nextId;
            });

            return newId;
        } catch (e) {
            console.error("Member ID Generation Error: ", e);
            throw new Error("Failed to generate Member ID");
        }
    },

    addUser: async (usernameOrEmail, password, memberId) => {
        // 1. Prepare Email
        let email = usernameOrEmail;
        if (!email.includes('@')) {
            email = `${usernameOrEmail}@coimbatoreunique.club`;
        }

        // 2. Initialize Secondary App for User Creation (Admin stays logged in)
        // We reuse the config from the default app by extracting it (hacky but standard)
        // Or we just re-import the object if exported. Ideally, we just assume standard config.
        const firebaseConfig = {
            apiKey: "AIzaSyC71HTePW6ir1Nk-AlMsUW-pyuDkfFTWXo",
            authDomain: "coimbatoreuniquebackend.firebaseapp.com",
            projectId: "coimbatoreuniquebackend",
            storageBucket: "coimbatoreuniquebackend.firebasestorage.app",
            messagingSenderId: "185302419552",
            appId: "1:185302419552:web:4aca100cd3c8784b7e5b05"
        };

        const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
        const secondaryAuth = getSecondaryAuth(secondaryApp);

        try {
            // 3. Create Auth User
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
            const user = userCredential.user;

            // 4. Create Firestore Document
            // IMPORTANT: Doc ID = Auth UID
            const userData = {
                id: user.uid,
                memberId: memberId,
                username: email.split('@')[0],
                email: email,
                role: 'member',
                status: 'active',
                isLocked: false,
                createdAt: new Date().toISOString(),
                profile: {
                    fullName: email.split('@')[0], // Default name
                    email: email,
                    // Empty profile fields for user to fill
                    contact: '',
                    dob: '',
                    bloodGroup: '',
                    addressLine1: '',
                    riId: ''
                }
            };

            await setDoc(doc(db, COLLECTIONS.USERS, user.uid), userData);

            // 5. Cleanup
            await signOutSecondary(secondaryAuth);

            return userData;

        } catch (error) {
            console.error("Add User Error:", error);
            throw error;
        } finally {
            // Always delete the app instance
            await deleteApp(secondaryApp);
        }
    },

    deleteUser: (id) => firebaseService.delete(COLLECTIONS.USERS, id), // Note: This doesn't delete Auth user
    updateUser: (id, updates) => firebaseService.update(COLLECTIONS.USERS, id, updates),

    // RESOURCES
    getResources: () => firebaseService.getAll(COLLECTIONS.RESOURCES),
    addResource: (res) => firebaseService.add(COLLECTIONS.RESOURCES, res),
    deleteResource: (id) => firebaseService.delete(COLLECTIONS.RESOURCES, id),
    updateResource: (id, updates) => firebaseService.update(COLLECTIONS.RESOURCES, id, updates),

    // BOARD MEMBERS
    getBoardMembers: () => firebaseService.getAll(COLLECTIONS.BOARD),
    addBoardMember: (member) => firebaseService.add(COLLECTIONS.BOARD, member),
    deleteBoardMember: (id) => firebaseService.delete(COLLECTIONS.BOARD, id),
    updateBoardMember: (id, updates) => firebaseService.update(COLLECTIONS.BOARD, id, updates),

    // STORAGE HELPERS (New)
    uploadFile: async (file, path) => {
        if (!file) return null;
        const storageRef = ref(storage, path || `uploads/${file.name}`);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
    },

    // --- EMAIL MANAGER SUPPORT ---
    getBirthdayContacts: async () => {
        try {
            const ref = doc(db, 'birthday_contacts', 'data');
            const snap = await getDoc(ref);
            return snap.exists() ? snap.data() : { presidents: [], secretaries: [], council: [] };
        } catch (e) {
            console.error("Error fetching birthday contacts:", e);
            return { presidents: [], secretaries: [], council: [] };
        }
    },
    saveBirthdayContacts: async (data) => {
        await firebaseService.waitForAuth();
        await setDoc(doc(db, 'birthday_contacts', 'data'), data);
    },

    getSentLogs: () => firebaseService.getAll(COLLECTIONS.SENT_LOGS),
    // For logging sent emails, we might need addSentLog
    addSentLog: (log) => firebaseService.add(COLLECTIONS.SENT_LOGS, log),

    getClubConfig: async () => {
        // Return object from 'config' doc
        const docs = await firebaseService.getAll(COLLECTIONS.CONFIG);
        return docs.find(d => d.id === 'config') || {};
    },
    saveClubConfig: async (config) => {
        await firebaseService.waitForAuth();
        // we use setDoc to overwrite/merge 'config' doc
        await setDoc(doc(db, COLLECTIONS.CONFIG, 'config'), config);
    },

    getEmailTemplates: () => firebaseService.getAll(COLLECTIONS.TEMPLATES),
    saveEmailTemplate: (template) => firebaseService.add(COLLECTIONS.TEMPLATES, template),
    updateEmailTemplate: (id, updates) => firebaseService.update(COLLECTIONS.TEMPLATES, id, updates),
    deleteEmailTemplate: (id) => firebaseService.delete(COLLECTIONS.TEMPLATES, id),

    // --- USER MANAGEMENT ---
    updateUser: (uid, data) => firebaseService.update(COLLECTIONS.USERS, uid, data),

    generateMemberId: async () => {
        const counterRef = doc(db, 'config', 'member_counter');
        try {
            return await runTransaction(db, async (transaction) => {
                const sfDoc = await transaction.get(counterRef);
                let currentId = 50295000;
                if (sfDoc.exists()) {
                    currentId = sfDoc.data().current;
                }
                const nextId = currentId + 1;
                transaction.set(counterRef, { current: nextId });
                return nextId.toString();
            });
        } catch (e) {
            console.error("ID Generation failed: ", e);
            throw e;
        }
    },

    changePassword: async (uid, newPassword) => {
        // Note: This only works if the user is currently signed in and re-authenticated recently.
        // We assume the user passed to FirstTimeSetup is the currently signed-in user.
        const user = auth.currentUser;
        if (user && user.uid === uid) {
            await updatePassword(user, newPassword);
        } else {
            throw new Error("User must be logged in to change password");
        }
    },

    // --- SCHEDULED EMAILS (OUTBOX) ---
    getScheduledEmails: () => firebaseService.getAll('scheduled_emails'),
    addScheduledEmail: (emailData) => firebaseService.add('scheduled_emails', emailData),
    updateScheduledEmail: (id, updates) => firebaseService.update('scheduled_emails', id, updates),
    deleteScheduledEmail: (id) => firebaseService.delete('scheduled_emails', id),

    // --- EMAIL SERVICE ---
    sendEmail: async (to, subject, body) => {
        console.log(`[EMAIL SERVICE] Initiating send to ${to}...`)
        try {
            // 1. Validate Payload
            if (!to || !to.includes('@')) {
                console.error("[EMAIL SERVICE] Invalid recipient:", to)
                // alert("Error: Invalid Email Address") // Silent fail preferred in service
                throw new Error("Invalid Email Address");
            }
            if (!body || body.trim() === '') {
                console.error("[EMAIL SERVICE] Empty body")
                throw new Error("Email body is empty");
            }

            // 2. Get Config (Internal call)
            // We use generic getAll lookup for config
            const configDocs = await firebaseService.getAll(COLLECTIONS.CONFIG);
            const config = configDocs.find(d => d.id === 'config');

            const appScriptUrl = config?.apps_script_url;

            if (!appScriptUrl) {
                console.warn("[EMAIL SERVICE] No App Script URL configured.")
                return false
            }

            const payload = {
                to: to,
                subject: subject,
                body: body,
                name: config?.name || 'Rotaract Club'
            }
            console.log("[EMAIL SERVICE] Sending Payload:", payload)

            // 3. Send Request
            const response = await fetch(appScriptUrl, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify(payload)
            })

            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`)
            }

            const result = await response.text()
            console.log(`[EMAIL SERVICE] Success:`, result)
            return true

        } catch (error) {
            console.error("[EMAIL SERVICE] Failed to send:", error)
            throw error; // Re-throw so UI can catch and alert
        }
    }
};
