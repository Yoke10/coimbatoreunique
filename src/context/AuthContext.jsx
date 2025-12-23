import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/config";
import { firebaseService } from "../services/firebaseService";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    // 🔥 Fetch real Firestore user
                    const profile = await firebaseService.getUser(user.uid, user);
                    if (profile) {
                        const isAdmin = await firebaseService.isAdmin(user.uid);
                        profile.role = isAdmin ? 'admin' : (profile.role || 'member');
                        setCurrentUser(profile);
                    } else {
                        // Check if Admin even if no profile doc
                        const isAdmin = await firebaseService.isAdmin(user.uid);
                        if (isAdmin) {
                            setCurrentUser({
                                id: user.uid,
                                role: 'admin',
                                email: user.email,
                                profile: { fullName: "Administrator" }
                            });
                        } else {
                            console.warn("Auth exists but no Firestore profile");
                            setCurrentUser(null);
                        }
                    }
                } catch (err) {
                    console.error("Error fetching user profile in context:", err);
                    setCurrentUser(null);
                }
            } else {
                setCurrentUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ currentUser, loading }}>
            {loading ? (
                <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    Loading Auth...
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
