import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <View style={{ flex: 1, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <Text style={{ color: '#ef4444', fontSize: 24, fontWeight: 'bold', marginBottom: 10 }}>Oops!</Text>
                    <Text style={{ color: '#fff', textAlign: 'center', marginBottom: 20 }}>{this.state.error?.toString()}</Text>
                    <TouchableOpacity
                        onPress={() => this.setState({ hasError: false })}
                        style={{ backgroundColor: '#eab308', padding: 15, borderRadius: 10 }}
                    >
                        <Text style={{ color: '#000', fontWeight: 'bold' }}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
