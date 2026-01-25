import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Globe, Smartphone } from 'lucide-react';

const QRManager = () => {
    const tables = Array.from({ length: 20 }, (_, i) => i + 1);
    const [baseUrl, setBaseUrl] = useState(window.location.origin);

    const downloadQR = (tableId) => {
        try {
            const svg = document.getElementById(`qr-table-${tableId}`);
            if (!svg) {
                alert("QR Code element not found!");
                return;
            }

            // Get SVG dimensions
            const svgRect = svg.getBoundingClientRect();
            const svgWidth = svgRect.width || 100;
            const svgHeight = svgRect.height || 100;

            // Create canvas with branding space
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            const scale = 10; // High resolution multiplier
            const padding = 100 * scale;

            canvas.width = (svgWidth * scale) + (padding * 2);
            canvas.height = (svgHeight * scale) + (padding * 3);

            // White background
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw decorative border
            ctx.lineWidth = 20;
            ctx.strokeStyle = "#d4af37"; // Gold
            ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

            // Add header branding
            ctx.fillStyle = "#8b0000"; // Royal Red
            ctx.font = `900 ${60 * scale}px Arial, sans-serif`;
            ctx.textAlign = "center";
            ctx.fillText("THE MARWAD RASOI", canvas.width / 2, padding);

            // Get SVG as data URL using inline XML
            const svgData = new XMLSerializer().serializeToString(svg);
            const svgBase64 = btoa(unescape(encodeURIComponent(svgData)));
            const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;

            // Load and draw QR
            const img = new Image();
            img.onload = () => {
                // Draw QR code
                ctx.drawImage(img, padding, padding + (80 * scale), svgWidth * scale, svgHeight * scale);

                // Add table label
                ctx.fillStyle = "black";
                ctx.font = `bold ${80 * scale}px Arial, sans-serif`;
                ctx.textAlign = "center";
                ctx.fillText(`TABLE #${tableId.toUpperCase()}`, canvas.width / 2, canvas.height - (padding / 2));

                // Download
                canvas.toBlob((blob) => {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.download = `Marwad-Table-${tableId}.png`;
                    link.href = url;
                    link.click();
                    URL.revokeObjectURL(url);
                }, 'image/png');
            };
            img.onerror = () => {
                alert("Error generating image from QR. Please try again.");
            };
            img.src = dataUrl;

        } catch (err) {
            console.error("QR Download Error:", err);
            alert("Unexpected error: " + err.message);
        }
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
