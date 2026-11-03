// Copies the shared ticket logic into the edge functions' _shared folder (Supabase bundles only a function's own tree).
const fs = require('fs'), path = require('path');
fs.copyFileSync(path.join(__dirname, '../site/assets/js/lr-ticket.js'), path.join(__dirname, '../server/supabase/functions/_shared/ticket-logic.js'));
console.log('synced server/supabase/functions/_shared/ticket-logic.js');
