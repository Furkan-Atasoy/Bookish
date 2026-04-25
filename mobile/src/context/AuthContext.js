import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [token, setToken] = useState(null);
    const [username, setUsername] = useState(null);
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const [t, u, r] = await Promise.all([
                    AsyncStorage.getItem('token'),
                    AsyncStorage.getItem('username'),
                    AsyncStorage.getItem('role'),
                ]);
                setToken(t);
                setUsername(u);
                setRole(r);
            } catch (_) {}
            setLoading(false);
        })();
    }, []);

    const login = async (tokenVal, usernameVal, roleVal) => {
        await AsyncStorage.multiSet([
            ['token', tokenVal],
            ['username', usernameVal],
            ['role', roleVal],
        ]);
        setToken(tokenVal);
        setUsername(usernameVal);
        setRole(roleVal);
    };

    const logout = async () => {
        await AsyncStorage.multiRemove(['token', 'username', 'role']);
        setToken(null);
        setUsername(null);
        setRole(null);
    };

    return (
        <AuthContext.Provider value={{ token, username, role, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
