import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { Shield } from 'lucide-react';

export default function AuthScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAuth = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (isSignUp) {
                await createUserWithEmailAndPassword(auth, email, password);
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (err) {
            setError(err.message.replace('Firebase: ', ''));
        }
        setLoading(false);
    };

    return (
        <div className="flex items-center justify-center h-screen bg-slate-900 text-slate-200 p-4">
            <div className="w-full max-w-sm bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-xl">
                <div className="text-center mb-6">
                    <Shield className="w-12 h-12 mx-auto mb-2 text-amber-600" />
                    <h1 className="text-2xl font-bold text-slate-100">Iron & Oil</h1>
                    <p className="text-slate-500 text-sm">Mercenary Guild Access</p>
                </div>
                
                <form onSubmit={handleAuth} className="space-y-4">
                    <input 
                        type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm focus:border-amber-500 outline-none"
                        placeholder="Email" required 
                    />
                    <input 
                        type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm focus:border-amber-500 outline-none"
                        placeholder="Password" required 
                    />

                    {error && <div className="text-red-400 text-xs bg-red-900/20 p-2 rounded border border-red-900/50">{error}</div>}

                    <button 
                        type="submit" disabled={loading}
                        className="w-full bg-amber-700 hover:bg-amber-600 text-white font-bold py-2 rounded transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
                    </button>
                </form>

                <div className="mt-4 text-center">
                    <button onClick={() => { setIsSignUp(!isSignUp); setError(''); }} className="text-xs text-slate-400 hover:text-white underline">
                        {isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up"}
                    </button>
                </div>
            </div>
        </div>
    );
}
