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

    return (<>
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
                <h2 style={{ margin: 0 }}>QR Code Print Layout (A4)</h2>
                <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem', color: '#666' }}>
                    Ready to print. Layout: <b>2 QR Codes per A4 Page</b>.
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
                🖨️ Print / Save as PDF
            </button>
        </div>

        <style>{`
                @page {
                    size: A4;
                    margin: 0;
                }
                .print-layout { display: none; }
                @media print {
                    .print-layout { display: block; }
                    .no-print { display: none !important; }
                    body { 
                        background: white !important; 
                        padding: 0 !important; 
                        margin: 0 !important;
                        -webkit-print-color-adjust: exact;
                    }
                    .page-container {
                        width: 210mm;
                        height: 297mm;
                        padding: 10mm;
                        box-sizing: border-box;
                        page-break-after: always;
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                        align-items: center;
                    }
                    .qr-card {
                        width: 100%;
                        height: 48%; /* Almost half page with some gap */
                        border: 4px solid #d4af37;
                        border-radius: 20px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        box-sizing: border-box;
                        padding: 20px;
                    }
                    .qr-grid { display: none; } /* Hide the screen grid */
                }
                
                /* Screen Layout */
                .screen-only-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 30px;
                }
                .marwad-title {
                    color: #8b0000;
                    font-weight: 900;
                    font-size: 2rem;
                    margin-bottom: 20px;
                    font-family: sans-serif;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                }
                .qr-wrapper {
                    border: 2px solid black;
                    padding: 15px;
                    background: white;
                    border-radius: 10px;
                }
            `}</style>

        {/* Print Layout (Visible in Print Preview) */}
        <div className="print-layout">
            {/* Chunk array into pairs for 2 per page */}
            {Array.from({ length: Math.ceil(allQrs.length / 2) }).map((_, pageIndex) => (
                <div key={pageIndex} className="page-container no-screen">
                    {allQrs.slice(pageIndex * 2, pageIndex * 2 + 2).map(id => (
                        <div key={id} className="qr-card">
                            <h1 className="marwad-title">THE MARWAD RASOI</h1>
                            <div className="qr-wrapper">
                                <QRCodeSVG
                                    value={`${baseUrl}/table/${id}`}
                                    size={300} // Detailed high-res for print
                                    level="H"
                                />
                            </div>
                            <h2 style={{ marginTop: '20px', fontSize: '3rem', margin: '20px 0 10px', color: 'black' }}>
                                TABLE {id}
                            </h2>
                            <p style={{ fontSize: '1.2rem', color: '#555' }}>
                                Scan to View Digital Menu & Order
                            </p>
                        </div>
                    ))}
                </div>
            ))}
        </div>

        {/* Screen Preview (Hidden when printing) */}
        <div className="screen-only-grid no-print">
            {allQrs.map(id => (
                <div key={id} style={{
                    border: '2px solid #d4af37',
                    padding: '30px',
                    borderRadius: '15px',
                    textAlign: 'center',
                    background: 'white',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}>
                    <h3 style={{ color: '#8b0000', marginBottom: '15px' }}>THE MARWAD RASOI</h3>
                    <QRCodeSVG value={`${baseUrl}/table/${id}`} size={150} />
                    <h2 style={{ marginTop: '15px' }}>TABLE {id}</h2>
                </div>
            ))}
        </div>
    </>
    );
};

export default PrintQRs;
