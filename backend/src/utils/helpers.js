const crypto = require('crypto');

/**
 * Parse date strings in multiple formats: DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, Excel serial numbers
 * @param {string|number} raw - The raw date value
 * @returns {Date|null} Parsed Date object or null
 */
function parseDate(raw) {
    if (!raw && raw !== 0) return null;

    // Excel serial number (number)
    if (typeof raw === 'number') {
        // Excel dates: days since 1900-01-01 (with a bug for Feb 29, 1900)
        const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899
        const msPerDay = 24 * 60 * 60 * 1000;
        const d = new Date(excelEpoch.getTime() + raw * msPerDay);
        if (!isNaN(d.getTime())) return d;
        return null;
    }

    const str = String(raw).trim();
    if (!str) return null;

    // Try DD-MM-YYYY or DD/MM/YYYY
    const ddmmyyyy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (ddmmyyyy) {
        const [, day, month, year] = ddmmyyyy;
        const d = new Date(Number(year), Number(month) - 1, Number(day));
        if (!isNaN(d.getTime())) return d;
    }

    // Try YYYY-MM-DD or YYYY/MM/DD
    const yyyymmdd = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (yyyymmdd) {
        const [, year, month, day] = yyyymmdd;
        const d = new Date(Number(year), Number(month) - 1, Number(day));
        if (!isNaN(d.getTime())) return d;
    }

    // Try MM-DD-YYYY (US format)
    const mmddyyyy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (mmddyyyy) {
        const [, month, day, year] = mmddyyyy;
        const d = new Date(Number(year), Number(month) - 1, Number(day));
        if (!isNaN(d.getTime())) return d;
    }

    // Fallback: try native JS parse (ISO, etc.)
    const fallback = new Date(str);
    if (!isNaN(fallback.getTime())) return fallback;

    return null;
}

/**
 * Generate a secure random token for QR codes
 * @returns {string} A URL-safe random token
 */
function generateSecureToken() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate auto-incrementing numbers like ASN-2026-000001
 * @param {string} prefix - e.g., 'ASN', 'GE'
 * @param {number} sequence - numeric sequence
 * @returns {string}
 */
function generateSequenceNo(prefix, sequence) {
    const year = new Date().getFullYear();
    const padded = String(sequence).padStart(6, '0');
    return `${prefix}-${year}-${padded}`;
}

module.exports = { parseDate, generateSecureToken, generateSequenceNo };
