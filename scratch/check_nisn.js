const fs = require('fs');
const data = JSON.parse(fs.readFileSync('migrasi_data_user.json', 'utf8'));
const nisns = {};
let duplicates = 0;
Object.values(data).forEach(u => {
    if (u.role === 'peserta') {
        const nisn = u.nisn || 'no-nisn';
        if (nisns[nisn]) {
            duplicates++;
            console.log('Duplicate NISN:', nisn, u.nama);
        }
        nisns[nisn] = true;
    }
});
console.log('Total Duplicates:', duplicates);
console.log('Total Unique NISNs:', Object.keys(nisns).length);
