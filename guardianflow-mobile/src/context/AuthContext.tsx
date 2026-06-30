import React, { createContext, useState, useContext } from 'react';

interface AuthUser {
    id: string;
    email: string;
    name: string;
    vehiclePlate: string;
}

interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<boolean>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(false);

    // Mock sign in logic
    const signIn = async (email: string, password: string): Promise<boolean> => {
        setLoading(true);

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        if (email.toLowerCase() === 'driver@guardianflow.com' && password === 'password') {
            setUser({
                id: 'usr_mock_123',
                email: 'driver@guardianflow.com',
                name: 'James Driver',
                vehiclePlate: 'GF-908-TX',
            });
            setLoading(false);
            return true;
        }

        setLoading(false);
        return false;
    };

    const signOut = async () => {
        setLoading(true);
        await new Promise((resolve) => setTimeout(resolve, 500));
        setUser(null);
        setLoading(false);
    };

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};