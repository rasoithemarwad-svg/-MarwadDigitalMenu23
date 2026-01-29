import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

const PrintQRs = () => {
    const tables = Array.from({ length: 20 }, (_, i) => (i + 1).toString());
    const specialQrs = ['delivery', 'testing'];
    const allQrs = [...tables, ...specialQrs];

    // Use the current origin or a default
    const baseUrl = window.location.origin;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div style={{ background: 'white', minHeight: '100vh', padding: '40px', color: 'black' }}>
            <div className="no-print" style={{
                marginBottom: '40px',
                padding: '20px',
                background: '#f0f0f0',
                borderRadius: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'sticky',
                top: '20px',
                zIndex: 100,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
                <div>
                    <h2 style={{ margin: 0 }}>QR Code Print Layout</h2>
                    <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem', color: '#666' }}>
                        Optimized for A4 paper. To Download: Click Button -> Select "Save as PDF".
                    </p>
                </div>
                <button
                    onClick={handlePrint}
                    style={{
                        padding: '12px 24px',
                        background: '#d4af37',
                        color: 'black',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                    }}
                >
                    Print All QR Codes
                </button>
            </div>

            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; padding: 0 !important; }
                    .qr-grid { gap: 0 !important; }
                    .qr-item { 
                        break-inside: avoid; 
                        border: 1px solid #eee !important;
                        margin-bottom: 20px !important;
                    }
                }
                .qr-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                    gap: 30px;
                }
                .qr-item {
                    border: 2px solid #d4af37;
                    padding: 20px;
                    border-radius: 15px;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    alignItems: center;
                    background: white;
                }
                .marwad-title {
                    color: #8b0000;
                    font-weight: 900;
                    margin-bottom: 15px;
                    font-family: sans-serif;
                }
            `}</style>

            <div className="qr-grid">
                {allQrs.map(id => (
                    <div key={id} className="qr-item">
                        <h3 className="marwad-title">THE MARWAD RASOI</h3>
                        <div style={{ background: 'white', padding: '10px', display: 'inline-block' }}>
                            <QRCodeSVG
                                value={`${baseUrl}/table/${id}`}
                                size={180}
                                level="H"
                            />
                        </div>
                        <h2 style={{ marginTop: '15px', color: 'black', textTransform: 'uppercase' }}>
                            TABLE #{id}
                        </h2>
                        <p style={{ fontSize: '0.7rem', color: '#666', marginTop: '5px' }}>
                            Scan to View Digital Menu
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PrintQRs;
