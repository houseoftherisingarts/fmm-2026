import fs from 'fs';

const path = 'src/components/compte/CoffreBillets.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add imports
content = content.replace("import { Ticket, Upload, Trash2, ArrowUpRight, FileText } from 'lucide-react';", 
  "import { Ticket, Upload, Trash2, ArrowUpRight, FileText, Wine } from 'lucide-react';\n" +
  "import { useAuth } from '../../contexts/AuthContext';\n" +
  "import { doc, getDoc } from 'firebase/firestore';\n" +
  "import { db } from '../../firebase';");

// 2. Add state
const stateCode = `  const { user } = useAuth();
  const [banquetTicket, setBanquetTicket] = useState<{ nom: string, places: number } | null>(null);

  useEffect(() => {
    if (!user || !user.email) return;
    const email = user.email.toLowerCase();
    getDoc(doc(db, 'banquetTickets', email)).then(snap => {
      if (snap.exists()) setBanquetTicket(snap.data() as any);
    }).catch(() => {});
  }, [user]);

`;

content = content.replace("  const [dragOver, setDragOver] = useState(false);", 
  "  const [dragOver, setDragOver] = useState(false);\n" + stateCode);

// 3. Add the UI
const ticketUI = `
      {banquetTicket && (
        <div className="mb-6 relative rounded-card overflow-hidden p-6 md:p-8 flex items-center justify-between shadow-xl"
             style={{ 
               background: 'linear-gradient(135deg, rgba(var(--sk-gilt-rgb), 0.15) 0%, rgba(var(--sk-gilt-rgb), 0.05) 100%)',
               border: '1px solid rgba(var(--sk-gilt-rgb), 0.4)'
             }}>
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 100% 0%, rgba(var(--color-copper-rgb),0.2) 0%, transparent 40%)' }} />
          <div className="relative z-10 min-w-0 flex-1">
            <p className="font-sans uppercase tracking-[0.3em] text-[10px] mb-2" style={{ color: 'var(--sk-gilt)' }}>
              {fr ? 'Acheté via Stripe' : 'Bought via Stripe'}
            </p>
            <h3 className="font-display title-medieval text-2xl md:text-3xl text-ivory mb-2">
              Banquet du Prince William
            </h3>
            <p className="font-editorial text-ivory-soft text-sm md:text-base leading-relaxed max-w-lg mb-4">
              {fr ? 'Dimanche 27 septembre, 13h00.' : 'Sunday September 27, 1:00 PM.'}
              <br/>
              {banquetTicket.nom || user?.displayName} · {banquetTicket.places} {fr ? (banquetTicket.places > 1 ? 'places' : 'place') : (banquetTicket.places > 1 ? 'seats' : 'seat')}
            </p>
            <p className="font-sans text-[11px] text-ivory-soft/70 uppercase tracking-widest">
              {fr ? 'Présentez ce billet (ou votre reçu Stripe) à l’accueil.' : 'Show this ticket (or your Stripe receipt) at the welcome desk.'}
            </p>
          </div>
          <div className="hidden sm:flex shrink-0 w-24 h-24 rounded-full border-2 border-brass/40 items-center justify-center ml-6 relative z-10"
               style={{ background: 'rgba(0,0,0,0.4)' }}>
            <Wine size={42} className="text-brass" />
          </div>
        </div>
      )}
`;

content = content.replace("      </header>", "      </header>\n" + ticketUI);

fs.writeFileSync(path, content);
