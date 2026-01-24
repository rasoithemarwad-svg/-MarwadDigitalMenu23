const localtunnel = require('localtunnel');
const fs = require('fs');

(async () => {
    try {
        const tunnel = await localtunnel({ port: 3001, subdomain: 'marwad-digital' });
        console.log('Tunnel URL:', tunnel.url);
        fs.writeFileSync('tunnel_url.txt', tunnel.url);

        tunnel.on('close', () => {
            console.log('Tunnel closed');
        });
    } catch (err) {
        console.error('Error starting tunnel:', err);
        fs.writeFileSync('tunnel_url.txt', 'ERROR: ' + err.message);
    }
})();
