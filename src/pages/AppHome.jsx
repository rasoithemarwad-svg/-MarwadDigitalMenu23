import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Utensils, ChefHat, LogIn } from 'lucide-react';

const AppHome = () => {
    const navigate = useNavigate();
    const [tableInput, setTableInput] = useState('');
    const [isTableModalOpen, setIsTableModalOpen] = useState(false);

    const handleCustomerEnter = () => {
        if (tableInput.trim()) {
            navigate(`/table/${tableInput}`);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ textAlign: 'center', marginBottom: '50px' }}
            >
                <div style={{ fontSize: '3rem', fontWeight: 900, lineHeight: 1.1 }}>
                    <span style={{ color: 'var(--primary)', display: 'block' }}>THE MARWAD</span>
                    <span style={{ color: '#ff4d4d', fontFamily: "'Hind', sans-serif" }}>रसोई</span>
                </div>
                <p style={{ color: 'var(--text-secondary)', letterSpacing: '3px', marginTop: '10px', fontSize: '0.8rem', opacity: 0.8 }}>APP HOME</p>
            </motion.div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', width: '100%', maxWidth: '400px' }}>

                {/* Admin Button */}
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/admin')}
                    className="glass-card"
                    style={{ padding: '25px', display: 'flex', alignItems: 'center', gap: '20px', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                    <div style={{ background: 'rgba(212, 175, 55, 0.1)', padding: '15px', borderRadius: '15px', color: 'var(--primary)' }}>
                        <Shield size={32} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>Admin Dashboard</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Manage orders & menu</p>
                    </div>
                </motion.button>

                {/* Customer Button */}
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsTableModalOpen(true)}
                    className="glass-card"
                    style={{ padding: '25px', display: 'flex', alignItems: 'center', gap: '20px', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                    <div style={{ background: 'rgba(255, 77, 77, 0.1)', padding: '15px', borderRadius: '15px', color: '#ff4d4d' }}>
                        <Utensils size={32} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>Customer View</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>View menu as customer</p>
                    </div>
                </motion.button>

                {/* Kitchen Button (Optional shortcut) */}
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/admin')} // Assuming kitchen uses admin view for now
                    className="glass-card"
                    style={{ padding: '25px', display: 'flex', alignItems: 'center', gap: '20px', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                    <div style={{ background: 'rgba(76, 175, 80, 0.1)', padding: '15px', borderRadius: '15px', color: '#4caf50' }}>
                        <ChefHat size={32} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>Kitchen Display</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>For kitchen staff</p>
                    </div>
                </motion.button>

            </div>

            <p style={{ position: 'absolute', bottom: '20px', color: 'var(--text-secondary)', fontSize: '0.7rem', opacity: 0.5 }}>
                Version 1.0.0
            </p>

            {/* Table Number Modal */}
            {isTableModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 100 }}>
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="glass-card"
                        style={{ padding: '30px', width: '100%', maxWidth: '350px', position: 'relative' }}
                    >
                        <h3 className="gold-text" style={{ marginBottom: '20px', textAlign: 'center' }}>Enter Table Number</h3>
                        <input
                            type="text"
                            value={tableInput}
                            onChange={(e) => setTableInput(e.target.value)}
                            placeholder="e.g. 5, HUT, DELIVERY"
                            style={{ width: '100%', padding: '15px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white', marginBottom: '20px', fontSize: '1.1rem', textAlign: 'center' }}
                        />
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => setIsTableModalOpen(false)} style={{ flex: 1, padding: '15px', borderRadius: '12px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer' }}>Cancel</button>
                            <button onClick={handleCustomerEnter} className="btn-primary" style={{ flex: 1, padding: '15px' }}>Go</button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default AppHome;
