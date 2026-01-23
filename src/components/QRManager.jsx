import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Globe, Smartphone } from 'lucide-react';

const QRManager = () => {
    const tables = Array.from({ length: 20 }, (_, i) => i + 1);
    const [baseUrl, setBaseUrl] = useState(window.location.origin);

    const downloadQR = (tableId) => {
        const svg = document.getElementById(`qr-table-${tableId}`);
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();
        img.onload = () => {
            canvas.width = 1000; // High resolution
            canvas.height = 1000;
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 100, 100, 800, 800);

            // Add label to image
            ctx.fillStyle = "black";
            ctx.font = "bold 60px Outfit";
            ctx.textAlign = "center";
            ctx.fillText(`MARWAD - TABLE #${tableId}`, 500, 950);

            const pngFile = canvas.toDataURL("image/png");
            const downloadLink = document.createElement("a");
            downloadLink.download = `Marwad-Table-${tableId}.png`;
            downloadLink.href = `${pngFile}`;
            downloadLink.click();
        };
        img.src = "data:image/svg+xml;base64," + btoa(svgData);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="glass-card" style={{ padding: '20px', marginBottom: '10px' }}>
                <h3 className="gold-text" style={{ fontSize: '1.2rem', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Globe size={20} /> Base URL Configuration
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>
                    Enter your live website or tunnel URL here. All QR codes will automatically update to point to this address.
                </p>
                <div style={{ position: 'relative' }}>
                    <input
                        type="text"
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        placeholder="https://your-site.com"
                        style={{
                            width: '100%',
                            padding: '12px 15px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '12px',
                            color: 'white',
                            fontSize: '0.9rem',
                            outline: 'none'
                        }}
                    />
                </div>
            </div>

            <h3 className="gold-text" style={{ fontSize: '1.2rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Smartphone size={20} /> Special QRs
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '30px' }}>
                {/* DELIVERY QR */}
                <div className="glass-card" style={{ padding: '15px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <p style={{ fontSize: '0.8rem', marginBottom: '12px', fontWeight: 800, color: '#4caf50' }}>DELIVERY / TAKEAWAY</p>
                    <div style={{ background: 'white', padding: '12px', borderRadius: '15px' }}>
                        <QRCodeSVG
                            id="qr-table-delivery"
                            value={`${baseUrl}/table/delivery`}
                            size={100}
                            level="H"
                        />
                    </div>
                    <button
                        onClick={() => downloadQR('delivery')}
                        style={{ marginTop: '15px', width: '100%', padding: '10px', borderRadius: '10px', border: 'none', background: 'var(--primary)', fontWeight: 700 }}
                    >
                        <Download size={14} /> PNG
                    </button>
                </div>

                {/* TESTING QR */}
                <div className="glass-card" style={{ padding: '15px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <p style={{ fontSize: '0.8rem', marginBottom: '12px', fontWeight: 800, color: '#ff4d4d' }}>TESTING (NO LOCATION)</p>
                    <div style={{ background: 'white', padding: '12px', borderRadius: '15px' }}>
                        <QRCodeSVG
                            id="qr-table-testing"
                            value={`${baseUrl}/table/testing`}
                            size={100}
                            level="H"
                        />
                    </div>
                    <button
                        onClick={() => downloadQR('testing')}
                        style={{ marginTop: '15px', width: '100%', padding: '10px', borderRadius: '10px', border: 'none', background: 'var(--primary)', fontWeight: 700 }}
                    >
                        <Download size={14} /> PNG
                    </button>
                </div>
            </div>

            <h3 className="gold-text" style={{ fontSize: '1.2rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Smartphone size={20} /> Table QR Grid (1-20)
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                {tables.map(table => (
                    <div key={table} className="glass-card" style={{ padding: '15px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <p style={{ fontSize: '0.8rem', marginBottom: '12px', fontWeight: 800 }}>TABLE #{table}</p>
                        <div style={{
                            background: 'white',
                            padding: '12px',
                            borderRadius: '15px',
                            display: 'inline-block',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
                        }}>
                            <QRCodeSVG
                                id={`qr-table-${table}`}
                                value={`${baseUrl}/table/${table}`}
                                size={100}
                                level="H"
                                includeMargin={false}
                            />
                        </div>
                        <button
                            onClick={() => downloadQR(table)}
                            style={{
                                marginTop: '15px', width: '100%', padding: '10px', borderRadius: '10px',
                                border: 'none', background: 'var(--primary)', color: 'black',
                                cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                boxShadow: '0 4px 10px rgba(212, 175, 55, 0.2)'
                            }}
                        >
                            <Download size={14} /> PNG
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default QRManager;
