const fs = require('fs');
const data = JSON.parse(fs.readFileSync('migrasi_data_user.json', 'utf8'));
const roles = {};
Object.values(data).forEach(u => {
    const role = u.role || 'undefined';
    roles[role] = (roles[role] || 0) + 1;
});
console.log(JSON.stringify(roles, null, 2));
