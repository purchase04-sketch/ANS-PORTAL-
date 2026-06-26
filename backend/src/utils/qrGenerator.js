const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

const QR_DIR = path.join(__dirname, '..', '..', 'uploads', 'qrcodes');

// Ensure QR directory exists
if (!fs.existsSync(QR_DIR)) {
    fs.mkdirSync(QR_DIR, { recursive: true });
}

/**
 * Generate a QR code image and save it to disk
 * @param {object} payload - Data to encode (will be JSON stringified)
 * @param {string} filename - Name of the file (without extension)
 * @returns {Promise<string>} File path of the generated QR code
 */
async function generateQRCode(payload, filename) {
    const filePath = path.join(QR_DIR, `${filename}.png`);
    const data = JSON.stringify(payload);

    await QRCode.toFile(filePath, data, {
        type: 'png',
        width: 400,
        margin: 2,
        color: {
            dark: '#0f172a',
            light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
    });

    return filePath;
}

/**
 * Generate QR code as a data URL (base64)
 * @param {object} payload
 * @returns {Promise<string>} Base64 data URL
 */
async function generateQRCodeDataURL(payload) {
    const data = JSON.stringify(payload);
    return await QRCode.toDataURL(data, {
        width: 400,
        margin: 2,
        color: {
            dark: '#0f172a',
            light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
    });
}

module.exports = { generateQRCode, generateQRCodeDataURL };
