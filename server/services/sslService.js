/**
 * SSL Certificate monitoring service
 * Checks TLS certificate validity and expiry
 */
const https = require('https');
const tls = require('tls');

/**
 * Check SSL certificate for a given URL
 * @param {string} url - The API URL to check
 * @returns {Object} SSL info: valid, expiry, daysRemaining, issuer, subject
 */
const checkSSL = (url) => {
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(url);
      
      // Only check HTTPS URLs
      if (parsedUrl.protocol !== 'https:') {
        return resolve({ valid: null, notHttps: true });
      }

      const hostname = parsedUrl.hostname;
      const port = parsedUrl.port || 443;

      const socket = tls.connect(
        { host: hostname, port: Number(port), servername: hostname, rejectUnauthorized: false },
        () => {
          try {
            const cert = socket.getPeerCertificate();
            socket.destroy();

            if (!cert || !cert.valid_to) {
              return resolve({ valid: false, error: 'No certificate found' });
            }

            const expiry = new Date(cert.valid_to);
            const now = new Date();
            const daysRemaining = Math.floor((expiry - now) / (1000 * 60 * 60 * 24));
            const valid = daysRemaining > 0 && socket.authorized !== false;

            resolve({
              valid,
              expiry: expiry.toISOString(),
              daysRemaining,
              issuer: cert.issuer ? cert.issuer.O || cert.issuer.CN : 'Unknown',
              subject: cert.subject ? cert.subject.CN : hostname,
              fingerprint: cert.fingerprint || null,
            });
          } catch (err) {
            socket.destroy();
            resolve({ valid: false, error: err.message });
          }
        }
      );

      socket.setTimeout(8000, () => {
        socket.destroy();
        resolve({ valid: null, error: 'SSL check timed out' });
      });

      socket.on('error', (err) => {
        resolve({ valid: false, error: err.message });
      });
    } catch (err) {
      resolve({ valid: false, error: err.message });
    }
  });
};

module.exports = { checkSSL };
