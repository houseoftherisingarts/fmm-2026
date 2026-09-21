import fs from 'fs';

const path = 'src/components/compte/CoffreBillets.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace("    if (!user || !user.email) return;", "    if (!user || !user.email || !db) return;");

fs.writeFileSync(path, content);
