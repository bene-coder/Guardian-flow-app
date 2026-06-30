import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
    const { signIn, loading } = useAuth();
    const [email, setEmail] = useState('driver@guardianflow.com'); // Pre-filled demo data
    const [password, setPassword] = useState('password'); // Pre-filled demo data

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        const success = await signIn(email, password);
        if (!success) {
            Alert.alert('Login Failed', 'Invalid email or password. Use demo credentials:\n\nEmail: driver@guardianflow.com\nPassword: password');
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.card}>
                <Text style={styles.logoText}>GuardianFlow</Text>
                <Text style={styles.subtitle}>Fleet Management & Active Security</Text>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Driver Email</Text>
                    <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="driver@example.com"
                        placeholderTextColor="#888"
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Password</Text>
                    <TextInput
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="••••••••"
                        placeholderTextColor="#888"
                        secureTextEntry
                        autoCapitalize="none"
                    />
                </View>

                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleLogin}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Access Fleet Console</Text>
                    )}
                </TouchableOpacity>

                <Text style={styles.demoNote}>* Running in demo mode with prefilled credentials</Text>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0E1A', // Dark navy brand background
        justifyContent: 'center',
        padding: 20,
    },
    card: {
        backgroundColor: '#13192B',
        borderRadius: 16,
        padding: 24,
        borderWidth: 1,
        borderColor: '#1E294B',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
    },
    logoText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center',
        letterSpacing: 1,
    },
    subtitle: {
        fontSize: 14,
        color: '#3B82F6', // Guardian blueaccent
        textAlign: 'center',
        marginBottom: 32,
        fontWeight: '500',
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 12,
        color: '#94A3B8',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    input: {
        backgroundColor: '#0F172A',
        borderColor: '#1E294B',
        borderWidth: 1,
        borderRadius: 8,
        padding: 14,
        color: '#FFFFFF',
        fontSize: 16,
    },
    button: {
        backgroundColor: '#2563EB',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonDisabled: {
        backgroundColor: '#1E3A8A',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    demoNote: {
        color: '#64748B',
        fontSize: 11,
        textAlign: 'center',
        marginTop: 16,
        fontStyle: 'italic',
    }
});