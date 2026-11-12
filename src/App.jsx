import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, User, Star, Bookmark, LogOut, X, 
  Calendar, Clapperboard, Shield, Play, Users, Sparkles, Tv, Key, Edit3, Trash2, ArrowLeft, Filter, Plus, Globe, Tag, ChevronLeft, ChevronRight, Check
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const TMDB_API_KEY = '5f4dcdde8ea6335d5a63bf674d84d113';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';

const countryMap = { 
  'US': 'Estados Unidos', 'BR': 'Brasil', 'KR': 'Coreia do Sul', 'JP': 'Japão', 
  'GB': 'Reino Unido', 'FR': 'França', 'ES': 'Espanha', 'IT': 'Itália', 
  'DE': 'Alemanha', 'CA': 'Canadá', 'MX': 'México', 'IN': 'Índia', 
  'AR': 'Argentina', 'CN': 'China', 'AU': 'Austrália', 'RU': 'Rússia', 'SE': 'Suécia' 
};

const countryName = (code) => {
  if (!code) return '';
  if (countryMap[code]) return countryMap[code];
  try { return new Intl.DisplayNames(['pt-BR'], { type: 'region' }).of(code) || code; } catch (e) { return code; }
};

const AI_TEMPLATES = ['Porque você assistiu a', 'Como você assistiu a', 'Porque você gostou de'];

const norm = (v) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const COUNTRY_ALIASES = {
  brasil: 'brasil', brasileiro: 'brasil', coreano: 'coreia', coreia: 'coreia', korea: 'coreia', dorama: 'coreia', doramas: 'coreia',
  espanhol: 'espanha', espanha: 'espanha', frances: 'franca', franca: 'franca', japao: 'japao', japones: 'japao',
  americano: 'estados unidos', eua: 'estados unidos'
};

const PLATFORM_ALIASES = { hbo: 'max', amazon: 'prime', 'disney+': 'disney' };
const IGNORED_SEARCH_WORDS = ['nota', 'notas', 'estrela', 'estrelas'];
const MONTH_NAMES = { janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6, julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12 };
const MONTH_ABBR = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 };
const MONTH_RE = [...Object.keys(MONTH_NAMES), ...Object.keys(MONTH_ABBR)].join('|');

const parseDateTerms = (q) => {
  const dates = [];
  let rest = ` ${q} `;
  const take = (re, build) => {
    rest = rest.replace(re, (...m) => { const d = build(m); if (d) { dates.push(d); return ' '; } return m[0]; });
  };
  const fullYear = (y) => (y === undefined || y === null || y === '') ? null : (String(y).length === 2 ? 2000 + Number(y) : Number(y));
  const okDay = (d) => d >= 1 && d <= 31;
  const okMonth = (m) => m >= 1 && m <= 12;
  const monthNum = (w) => MONTH_NAMES[w] || MONTH_ABBR[w];
  take(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g, m => (okMonth(+m[2]) && okDay(+m[3])) ? { y: +m[1], m: +m[2], d: +m[3] } : null);
  take(/\b(?:dia\s+)?(\d{1,2})[/-](\d{1,2})(?:[/-](\d{4}|\d{2}))?\b/g, m => (okDay(+m[1]) && okMonth(+m[2])) ? { d: +m[1], m: +m[2], y: fullYear(m[3]) } : null);
  take(new RegExp(`\\b(?:dia\\s+)?(\\d{1,2})\\s+(?:de\\s+)?(${MONTH_RE})\\b\\.?(?:\\s+(?:de\\s+)?(\\d{4}))?`, 'g'),
    m => okDay(+m[1]) ? { d: +m[1], m: monthNum(m[2]), y: fullYear(m[3]) } : null);
  take(new RegExp(`\\b(${Object.keys(MONTH_NAMES).join('|')})\\b(?:\\s+(?:de\\s+)?(\\d{4}))?`, 'g'),
    m => ({ m: MONTH_NAMES[m[1]], y: fullYear(m[2]), d: null, bare: true, word: m[1] }));
  take(/\bdia\s+(\d{1,2})\b/g, m => okDay(+m[1]) ? { d: +m[1], m: null, y: null } : null);
  return { dates, rest };
};

const dateMatches = (spec, isoDates) => isoDates.some(iso => {
  const [y, m, d] = iso.split('-').map(Number);
  return (spec.d == null || spec.d === d) && (spec.m == null || spec.m === m) && (spec.y == null || spec.y === y);
});

const matchesProfileSearch = (entry, meta, query) => {
  const { dates, rest } = parseDateTerms(norm(query));
  const tokens = rest.split(/\s+/).filter(t => t && !IGNORED_SEARCH_WORDS.includes(t));
  if (tokens.length === 0 && dates.length === 0) return true;
  const m = meta || {};
  const pick = (a, b) => (a && a !== 'N/A') ? a : (b || '');
  const hay = norm([
    entry.title, pick(entry.director, m.director), pick(entry.actors, m.actors), pick(entry.genre, m.genre),
    pick(entry.country, m.country), pick(entry.year, m.year), entry.platform, entry.review, entry.extra, m.providers
  ].filter(Boolean).join(' | '));
  const isoDates = (entry.dates || [entry.date_watched]).filter(Boolean).map(x => String(x).slice(0, 10));
  const ratings = (entry.ratings || [entry.rating]).filter(v => v !== undefined && v !== null && v !== '').map(Number);

  const datesOk = dates.every(spec => dateMatches(spec, isoDates) || (spec.bare && hay.includes(spec.word)));
  if (!datesOk) return false;
  return tokens.every(t => {
    if (/^\d([.,]\d)?$/.test(t) && ratings.includes(Number(t.replace(',', '.')))) return true;
    if (/^\d+$/.test(t)) return new RegExp(`(^|[^0-9])${t}([^0-9]|$)`).test(hay);            
    if (COUNTRY_ALIASES[t]) return hay.includes(COUNTRY_ALIASES[t]);
    if (PLATFORM_ALIASES[t]) return hay.includes(PLATFORM_ALIASES[t]) || hay.includes(t);
    return hay.includes(t);
  });
};

const byNewest = (list) => {
  const time = (x) => Date.parse(x?.created_at) || 0;
  const num = (x) => (typeof x?.id === 'number' || /^\d+$/.test(String(x?.id ?? ''))) ? Number(x.id) : 0;
  return list.map((item, i) => ({ item, i }))
    .sort((a, b) => (time(b.item) - time(a.item)) || (num(b.item) - num(a.item)) || (a.i - b.i))
    .map(x => x.item);
};

const normalizeProviderName = (raw) => {
  let name = String(raw || '').trim();
  const n = norm(name);
  if (/amazon prime video|prime video/.test(n) && !/channel/.test(n)) return 'Amazon Prime Video';
  if (/apple tv/.test(n) && /channel/.test(n)) return null;   
  if (/amazon/.test(n) && /channel/.test(n)) return null;      
  if (/^apple tv\+?$|^apple tv plus$/.test(n)) return 'Apple TV+';
  name = name.replace(/\s+with ads$/i, '').replace(/\s+com an[uú]ncios$/i, '').replace(/\s+standard with ads$/i, '').trim();
  if (/^mgm\s*(\+|plus)$/i.test(name)) return 'MGM+';
  if (/^claro\s*tv\s*\+?$/i.test(name)) return 'Claro tv+';
  if (/^max$|^hbo max$/i.test(name)) return 'Max';
  return name;
};

const channelOf = (raw) => {
  const name = String(raw || '').trim();
  const n = norm(name);
  let host = null;
  if (/amazon/.test(n) && /channel/.test(n)) host = 'Prime Video';
  else if (/apple tv/.test(n) && /channel/.test(n)) host = 'Apple TV';
  if (!host) return null;
  let channel = name.replace(/\s*(amazon|apple tv)\s*channel$/i, '').replace(/\s*apple tv\s*channel$/i, '').replace(/\s*amazon\s*channel$/i, '').trim();
  channel = channel.replace(/\s*(\+|plus)$/i, '+').replace(/^(\w+)\s+Plus$/i, '$1+');
  return { host, channel: normalizeProviderName(channel) || channel };
};

const summarizeProviders = (br, { includePaid = false } = {}) => {
  if (!br) return '';
  const raw = [...(br.flatrate || []), ...(includePaid ? [...(br.rent || []), ...(br.buy || [])] : [])].map(p => p.provider_name);
  const apps = new Map();     
  const channels = new Map();  
  raw.forEach(r => {
    const ch = channelOf(r);
    if (ch) {
      if (!channels.has(ch.channel)) channels.set(ch.channel, new Set());
      channels.get(ch.channel).add(ch.host);
      return;
    }
    const clean = normalizeProviderName(r);
    if (clean) apps.set(clean, true);
  });
  const parts = [];
  apps.forEach((_, name) => {
    if (channels.has(name)) return;
    parts.push(name);
  });
  channels.forEach((hosts, name) => {
    const list = [...hosts];
    const via = list.length > 1 ? `${list.slice(0, -1).join(', ')} e ${list[list.length - 1]}` : list[0];
    parts.push(apps.has(name) ? `${name} (também via ${via})` : `${name} (via ${via})`);
  });
  return parts.join(', ');
};

const formatCreatedAt = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
};

const MovieCarousel = ({ movies, onClick }) => {
  const ref = useRef(null);
  const [edge, setEdge] = useState({ atStart: true, atEnd: false });
  const update = () => {
    const el = ref.current;
    if (!el) return;
    const atStart = el.scrollLeft <= 4;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    setEdge(prev => (prev.atStart === atStart && prev.atEnd === atEnd) ? prev : { atStart, atEnd });
  };
  useEffect(() => {
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [movies]);
  const scrollByPage = (dir) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.85, behavior: 'smooth' });
  const arrow = "absolute top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-950/90 hover:bg-rose-600 border border-slate-700 hover:border-rose-600 text-white flex items-center justify-center shadow-xl transition-colors";
  return (
    <div className="relative">
      {!edge.atStart && <button type="button" aria-label="Anterior" onClick={() => scrollByPage(-1)} className={`${arrow} -left-3 md:-left-5`}><ChevronLeft size={22} /></button>}
      <div ref={ref} onScroll={update} className="flex gap-4 md:gap-6 overflow-x-auto scroll-smooth snap-x px-1 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {movies.map(m => (
          <div key={m.id} className="w-36 sm:w-40 md:w-44 lg:w-48 shrink-0 snap-start">
            <MovieCard movie={m} onClick={onClick} />
          </div>
        ))}
      </div>
      {!edge.atEnd && <button type="button" aria-label="Próximos" onClick={() => scrollByPage(1)} className={`${arrow} -right-3 md:-right-5`}><ChevronRight size={22} /></button>}
    </div>
  );
};

const MetaChips = ({ genre, country }) => {
  const genres = (genre && genre !== 'N/A') ? genre.split(',').map(g => g.trim()).filter(Boolean) : [];
  const hasCountry = country && country !== 'N/A';
  if (genres.length === 0 && !hasCountry) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 mb-2 mt-1">
      {genres.map(g => (
        <span key={g} className="text-[11px] font-semibold text-rose-300 bg-rose-600/10 border border-rose-600/30 px-2 py-0.5 rounded-full flex items-center gap-1"><Tag size={10} /> {g}</span>
      ))}
      {hasCountry && (
        <span className="text-[11px] font-semibold text-sky-300 bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 rounded-full flex items-center gap-1"><Globe size={10} /> {country}</span>
      )}
    </div>
  );
};

const GENRES = [
  { id: '', name: '🔥 Populares' },
  { id: 28, name: 'Ação' },
  { id: 16, name: 'Animação' },
  { id: 12, name: 'Aventura' },
  { id: 35, name: 'Comédia' },
  { id: 99, name: 'Documentário' },
  { id: 18, name: 'Drama' },
  { id: 878, name: 'Ficção Científica' },
  { id: 10749, name: 'Romance' },
  { id: 53, name: 'Suspense' },
  { id: 27, name: 'Terror' }
];

const ConfirmModal = ({ dialog, onClose }) => {
  if (!dialog) return null;
  const danger = dialog.danger !== false;
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[120] flex items-center justify-center p-4 animate-in fade-in" onClick={() => onClose(false)}>
      <div role="dialog" aria-modal="true" className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-center" onClick={(e) => e.stopPropagation()}>
        <div className={`w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center ${danger ? 'bg-rose-600/15 text-rose-500' : 'bg-sky-500/15 text-sky-400'}`}>
          <Trash2 size={26} />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{dialog.title || 'Tem certeza?'}</h3>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">{dialog.message}</p>
        <div className="flex gap-3">
          <button type="button" autoFocus onClick={() => onClose(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold py-2.5 rounded-lg transition-colors">Cancelar</button>
          <button type="button" onClick={() => onClose(true)} className={`flex-1 ${danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-sky-600 hover:bg-sky-700'} text-white font-bold py-2.5 rounded-lg transition-colors`}>{dialog.confirmLabel || 'Confirmar'}</button>
        </div>
      </div>
    </div>
  );
};

const Toast = ({ message, type }) => {
  if (!message) return null;
  const bgColor = type === 'error' ? 'bg-red-600' : 'bg-emerald-600';
  return (
    <div className={`fixed bottom-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-xl font-medium z-[100] animate-bounce`}>
      {message}
    </div>
  );
};

const MovieCard = React.memo(({ movie, onClick, userRating, onDelete }) => {
  if (!movie.poster_path) return null;
  return (
    <div onClick={() => onClick(movie.id)} className="group relative cursor-pointer rounded-xl overflow-hidden shadow-lg transition-transform hover:scale-105 border border-slate-800 bg-slate-800 aspect-[2/3]">
      <img src={`${IMG_URL}${movie.poster_path}`} alt={movie.title || movie.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
      
      {userRating && (
        <div className="absolute top-2 right-2 bg-rose-600 text-white text-xs font-bold px-2 py-1 rounded-md z-10 shadow flex items-center gap-1">
          <Star size={12} className="fill-white" /> {userRating}
        </div>
      )}

      {onDelete && (
        <button onClick={onDelete} className="absolute top-2 left-2 bg-slate-950/80 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all z-20" title="Apagar do diário">
          <Trash2 size={16} />
        </button>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
        <h3 className="text-white font-bold text-sm leading-tight">{movie.title || movie.name}</h3>
      </div>
    </div>
  );
});

const AuthScreen = ({ showToast }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supabase) { showToast('Configure as chaves do Supabase!', 'error'); return; }
    setLoading(true);

    try {
      if (isRegister && password.length < 6) {
        showToast('A senha deve ter pelo menos 6 caracteres.', 'error');
        setLoading(false); return;
      }
      if (isRegister) {
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name, avatar: '' } } });
        if (error) throw error;
        showToast('Conta criada com sucesso! Você já pode entrar.', 'success');
        setIsRegister(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      showToast(error.status === 422 ? 'Este e-mail já cadastrado.' : 'Erro. Verifique os dados.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[url('https://images.unsplash.com/photo-1574267432553-4b462808152a?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center">
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm"></div>
      <div className="relative w-full max-w-md bg-slate-900 p-8 rounded-2xl shadow-2xl border border-slate-800">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-rose-600 tracking-tighter mb-2">WatchTime.</h1>
          <p className="text-slate-400">Seu diário inteligente de filmes.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Nome Completo</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-rose-600" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">E-mail</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-rose-600" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Senha</label>
            <input type="password" required minLength="6" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-rose-600" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex justify-center items-center mt-6 gap-2">
            {loading ? 'Processando...' : (isRegister ? 'Criar Conta' : <>Entrar <Play size={16} className="fill-white" /></>)}
          </button>
        </form>
        <p className="text-center text-sm text-slate-400 mt-6">
          {isRegister ? 'Já tem uma conta?' : 'Novo por aqui?'} 
          <button type="button" onClick={() => setIsRegister(!isRegister)} className="text-rose-500 hover:underline font-medium ml-1">{isRegister ? 'Entrar agora' : 'Criar conta'}</button>
        </p>
      </div>
    </div>
  );
};

export default function App() {
  const [session, setSession] = useState(null);
  const [currentView, setCurrentView] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [toastMsg, setToastMsg] = useState({ text: '', type: 'success' });
  const showToast = (text, type = 'success') => { setToastMsg({ text, type }); setTimeout(() => setToastMsg({ text: '', type: 'success' }), 4000); };
  
  const [confirmDialog, setConfirmDialog] = useState(null);
  const confirmResolver = useRef(null);
  const askConfirm = (opts) => new Promise((resolve) => { confirmResolver.current = resolve; setConfirmDialog(opts); });
  const closeConfirm = (result) => { confirmResolver.current?.(result); confirmResolver.current = null; setConfirmDialog(null); };

  const [avatarUrl, setAvatarUrl] = useState('');
  
  // Estados para edição do nome de usuário
  const [isEditingName, setIsEditingName] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  const [movies, setMovies] = useState([]);
  const [aiSections, setAiSections] = useState([]);  
  const [aiGeneral, setAiGeneral] = useState([]);   
  const [aiGeneralVisible, setAiGeneralVisible] = useState(10);
  const [aiPage, setAiPage] = useState(1);
  const [aiExhausted, setAiExhausted] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiLoadingMore, setAiLoadingMore] = useState(false);
  const [diaryLoaded, setDiaryLoaded] = useState(false);

  const [profileQuery, setProfileQuery] = useState('');
  const [profileMeta, setProfileMeta] = useState({}); 
  const [profileMetaLoading, setProfileMetaLoading] = useState(false);
  const metaRequested = useRef(new Set());
  const catalogCursor = useRef({ year: new Date().getFullYear(), page: 0, totalPages: 1 });
  const catalogReqId = useRef(0);
  const [page, setPage] = useState(1);
  const [genreFilter, setGenreFilter] = useState('');
  const [isLoadingMovies, setIsLoadingMovies] = useState(false);
  
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [watchlist, setWatchlist] = useState([]);
  const [diary, setDiary] = useState([]);
  
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomMovies, setRoomMovies] = useState([]);
  const [roomMembersData, setRoomMembersData] = useState([]); // NOVO ESTADO: Armazena os membros reais da sala aberta
  const [newRoomName, setNewRoomName] = useState('');
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [roomMovieSearch, setRoomMovieSearch] = useState(''); 
  const [roomFilterQuery, setRoomFilterQuery] = useState(''); 
  const [roomMovieSuggestions, setRoomMovieSuggestions] = useState([]);
  const [editRoomModal, setEditRoomModal] = useState({ isOpen: false, id: null, name: '' });
  
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [platform, setPlatform] = useState('');
  const [dateWatched, setDateWatched] = useState(new Date().toISOString().split('T')[0]);

  const [publicProfile, setPublicProfile] = useState({ name: '', diary: [], watchlist: [], loading: false });
  const [profileTab, setProfileTab] = useState('diary'); 
  const [publicProfileTab, setPublicProfileTab] = useState('diary'); 
  
  const [profileGenreFilter, setProfileGenreFilter] = useState('');
  const [profileRatingFilter, setProfileRatingFilter] = useState(0);

  const [roomGenreFilter, setRoomGenreFilter] = useState('');
  const [roomRatingFilter, setRoomRatingFilter] = useState(0);

  // Ref para acompanhar a sala atual ativa sem recriar o hook Realtime
  const currentRoomId = useRef(null);
  useEffect(() => {
    currentRoomId.current = selectedRoom?.id;
  }, [selectedRoom]);

  // Corrige o fundo branco no celular (overscroll)
  useEffect(() => {
    document.body.classList.add('bg-slate-950');
    return () => document.body.classList.remove('bg-slate-950');
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  // ----------------------------------------------------
  // SUPABASE REALTIME (TEMPO REAL)
  // ----------------------------------------------------
  useEffect(() => {
    if (!session || !supabase) return;

    const channel = supabase.channel('realtime-watchtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, (payload) => {
        fetchRooms(); 
        if (currentRoomId.current && payload.new && payload.new.id === currentRoomId.current) {
          setSelectedRoom(prev => ({ ...prev, name: payload.new.name }));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_movies' }, () => {
        if (currentRoomId.current) fetchRoomMovies(currentRoomId.current);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'membros_sala' }, () => {
        fetchRooms();
        if (currentRoomId.current) fetchRoomMembers(currentRoomId.current);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'diary' }, () => {
        fetchDiary(session.user.id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);
  // ----------------------------------------------------

  const fetchDiary = async (userId) => {
    let { data: dData, error } = await supabase.from('diary').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) {
      const retry = await supabase.from('diary').select('*').eq('user_id', userId);
      dData = retry.data;
      error = retry.error;
    }
    if (error) { showToast(`Erro ao carregar o diário: ${error.message}`, 'error'); return; }
    setDiary(byNewest(dData || []));
    setDiaryLoaded(true);
  };

  useEffect(() => {
    if (!session?.user?.id || !supabase) return;
    const fetchUserData = async () => {
      const { data: roleData } = await supabase.from('user_roles').select('is_admin').eq('user_id', session.user.id).maybeSingle();
      if (roleData && roleData.is_admin) setIsAdmin(true);
      const { data: wData } = await supabase.from('watchlist').select('*').eq('user_id', session.user.id);
      if (wData) setWatchlist(wData);
      const { data: pData } = await supabase.from('profiles').select('avatar').eq('user_id', session.user.id).maybeSingle();
      setAvatarUrl(pData?.avatar || '');
      await fetchDiary(session.user.id);
    };
    fetchUserData();
  }, [session]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setCurrentView('search');
        setIsLoadingMovies(true);
        const q = searchQuery.toLowerCase();
        
        const year = q.match(/\b(19|20)\d{2}\b/)?.[0];
        const pMap = { 'netflix': 8, 'prime': 119, 'max': 1899, 'hbo': 1899, 'disney': 337, 'apple': 350, 'star': 619, 'globoplay': 307 };
        const gMap = { 
            'ação': 28, 'acao': 28, 'comédia': 35, 'comedia': 35, 'terror': 27, 'romance': 10749, 
            'ficção': 878, 'ficcao': 878, 'drama': 18, 'animação': 16, 'animacao': 16, 
            'suspense': 53, 'thriller': 53, 'aventura': 12, 'crime': 80, 'mistério': 9648, 'misterio': 9648, 'fantasia': 14 
        };
        const cMap = { 'brasil': 'BR', 'brasileiro': 'BR', 'coreano': 'KR', 'coreia': 'KR', 'korea': 'KR', 'espanhol': 'ES', 'espanha': 'ES', 'frances': 'FR', 'frança': 'FR', 'japao': 'JP', 'japones': 'JP', 'americano': 'US', 'eua': 'US' };
        
        const isDorama = q.includes('dorama') || q.includes('doramas');
        const providerId = Object.keys(pMap).find(k => q.includes(k)) ? pMap[Object.keys(pMap).find(k => q.includes(k))] : null;
        const genreId = Object.keys(gMap).find(k => q.includes(k)) ? gMap[Object.keys(gMap).find(k => q.includes(k))] : null;
        const countryCode = Object.keys(cMap).find(k => q.includes(k)) ? cMap[Object.keys(cMap).find(k => q.includes(k))] : (isDorama ? 'KR' : null);

        let finalMovies = [];
        let cleanQuery = q;
        if (year) cleanQuery = cleanQuery.replace(year, '');
        if (isDorama) cleanQuery = cleanQuery.replace('doramas', '').replace('dorama', '');
        Object.keys(pMap).forEach(k => { if(cleanQuery.includes(k)) cleanQuery = cleanQuery.replace(k, ''); });
        Object.keys(gMap).forEach(k => { if(cleanQuery.includes(k)) cleanQuery = cleanQuery.replace(k, ''); });
        Object.keys(cMap).forEach(k => { if(cleanQuery.includes(k)) cleanQuery = cleanQuery.replace(k, ''); });
        cleanQuery = cleanQuery.trim();

        if (providerId || genreId || countryCode || (year && cleanQuery.length < 3)) {
          let url = `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=pt-BR&sort_by=popularity.desc`;
          if (year) url += `&primary_release_year=${year}`;
          if (providerId) url += `&with_watch_providers=${providerId}&watch_region=BR`;
          if (genreId) url += `&with_genres=${genreId}`;
          if (countryCode) url += `&with_origin_country=${countryCode}`;
          
          const res = await fetch(url);
          const data = await res.json();
          finalMovies = data.results;
        } else {
          const res = await fetch(`${BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&language=pt-BR&query=${encodeURIComponent(searchQuery)}`);
          const data = await res.json();
          data.results.forEach(item => {
            if (item.media_type === 'movie') finalMovies.push(item);
            else if (item.media_type === 'person' && item.known_for) {
              finalMovies.push(...item.known_for.filter(kf => kf.media_type === 'movie'));
            }
          });
          finalMovies = Array.from(new Map(finalMovies.map(m => [m.id, m])).values());
        }
        setMovies(finalMovies.filter(m => m.poster_path)); 
        setIsLoadingMovies(false);
      } else if (searchQuery.trim().length === 0 && currentView === 'search') {
        setCurrentView('home');
        loadMovies(1, true);
      }
    }, 600);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => {
    if (session && currentView === 'home' && searchQuery === '') loadMovies(1, true);
    if (session && currentView === 'rooms') fetchRooms();
  }, [session, currentView, genreFilter]);

  useEffect(() => {
    if (session && currentView === 'ai' && diaryLoaded) loadAIRecommendations();
  }, [session?.user?.id, currentView, diaryLoaded]);

  const ensureMeta = async (ids) => {
    const todo = [...new Set(ids.map(String))].filter(id => id && id !== 'undefined' && !metaRequested.current.has(id));
    if (todo.length === 0) return;
    todo.forEach(id => metaRequested.current.add(id));
    setProfileMetaLoading(true);
    for (let i = 0; i < todo.length; i += 8) {
      const entries = await Promise.all(todo.slice(i, i + 8).map(async (id) => {
        try {
          const res = await fetch(`${BASE_URL}/movie/${id}?api_key=${TMDB_API_KEY}&language=pt-BR&append_to_response=credits,watch/providers`);
          const d = await res.json();
          const br = d['watch/providers']?.results?.BR;
          const code = d.origin_country?.[0] || d.production_countries?.[0]?.iso_3166_1 || '';
          return [id, {
            year: d.release_date?.split('-')[0] || '',
            director: d.credits?.crew?.find(c => c.job === 'Director')?.name || '',
            actors: d.credits?.cast?.slice(0, 8).map(a => a.name).join(', ') || '',
            genre: d.genres?.map(g => g.name).join(', ') || '',
            country: countryName(code),
            providers: [...(br?.flatrate || []), ...(br?.rent || []), ...(br?.buy || [])].map(x => x.provider_name).join(', ')
          }];
        } catch (e) { metaRequested.current.delete(id); return null; }
      }));
      setProfileMeta(prev => ({ ...prev, ...Object.fromEntries(entries.filter(Boolean)) }));
    }
    setProfileMetaLoading(false);
  };

  useEffect(() => {
    if (currentView !== 'profile' || profileQuery.trim().length === 0) return;
    ensureMeta([...watchlist.map(w => w.tmdb_id), ...diary.map(d => d.tmdb_id)]);
  }, [profileQuery, currentView, watchlist, diary]);

  useEffect(() => {
    if (currentView !== 'rooms' || !selectedRoom) return;
    ensureMeta(roomMovies.map(m => m.tmdb_id));
  }, [roomFilterQuery, currentView, selectedRoom, roomMovies, roomGenreFilter, roomRatingFilter]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (roomMovieSearch.trim().length >= 2) {
        try {
          let searchUrl = `${BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&language=pt-BR&query=${encodeURIComponent(roomMovieSearch)}`;
          if (roomMovieSearch.toLowerCase().includes('dorama')) {
              searchUrl = `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=pt-BR&with_origin_country=KR`;
          }

          const res = await fetch(searchUrl);
          const data = await res.json();
          const top5 = data.results.slice(0, 5);
          
          const detailedResults = await Promise.all(
            top5.map(async (m) => {
              const dRes = await fetch(`${BASE_URL}/movie/${m.id}?api_key=${TMDB_API_KEY}&language=pt-BR&append_to_response=credits`);
              return await dRes.json();
            })
          );
          setRoomMovieSuggestions(detailedResults); 
        } catch (e) {}
      } else {
        setRoomMovieSuggestions([]);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [roomMovieSearch]);

  const loadMovies = async (pageNum, reset = false) => {
    const reqId = ++catalogReqId.current;
    setIsLoadingMovies(true);
    if (reset) catalogCursor.current = { year: new Date().getFullYear(), page: 0, totalPages: 1 };
    const cur = catalogCursor.current;
    const thisYear = new Date().getFullYear();
    const today = new Date().toISOString().split('T')[0];
    const genreParam = genreFilter === '' ? '' : `&with_genres=${genreFilter}`;
    let collected = [];
    try {
      let guard = 0;
      while (collected.length < 12 && guard < 4 && cur.year >= 1950) {
        guard++;
        if (cur.page >= cur.totalPages) { cur.year -= 1; cur.page = 0; cur.totalPages = 1; }
        cur.page += 1;
        const minVotes = cur.year === thisYear ? 80 : 300;
        const dateLimit = cur.year === thisYear ? `&primary_release_date.lte=${today}` : '';
        const url = `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=pt-BR&include_adult=false&sort_by=vote_count.desc&primary_release_year=${cur.year}${dateLimit}&vote_count.gte=${minVotes}${genreParam}&page=${cur.page}`;
        const res = await fetch(url);
        const data = await res.json();
        cur.totalPages = Math.min(data.total_pages || 1, 500);
        collected.push(...(data.results || []).filter(m => m.poster_path));
      }
      if (reqId !== catalogReqId.current) return;
      if (reset) {
        setMovies(collected);
      } else {
        setMovies(prev => {
          const newMovies = [...prev, ...collected];
          return Array.from(new Map(newMovies.map(m => [m.id, m])).values());
        });
      }
      setPage(pageNum);
    } catch (e) {}
    if (reqId === catalogReqId.current) setIsLoadingMovies(false);
  };

  const fetchRecsFor = async (tmdbId, pageNum) => {
    try {
      const res = await fetch(`${BASE_URL}/movie/${tmdbId}/recommendations?api_key=${TMDB_API_KEY}&language=pt-BR&page=${pageNum}`);
      const data = await res.json();
      let results = data.results || [];
      if (results.length === 0 && pageNum === 1) {
        const res2 = await fetch(`${BASE_URL}/movie/${tmdbId}/similar?api_key=${TMDB_API_KEY}&language=pt-BR&page=1`);
        results = (await res2.json()).results || [];
      }
      return results.filter(r => r.poster_path);
    } catch (e) { return []; }
  };

  const fetchSimilarFor = async (tmdbId, pageNum) => {
    try {
      const res = await fetch(`${BASE_URL}/movie/${tmdbId}/similar?api_key=${TMDB_API_KEY}&language=pt-BR&page=${pageNum}`);
      return ((await res.json()).results || []).filter(r => r.poster_path);
    } catch (e) { return []; }
  };

  const fetchRecsUpTo = async (tmdbId, n, exclude) => {
    const byId = new Map();
    const add = (list) => list.forEach(m => { if (!exclude.has(String(m.id)) && String(m.id) !== String(tmdbId)) byId.set(m.id, m); });
    (await Promise.all([1, 2, 3].map(p => fetchRecsFor(tmdbId, p)))).forEach(add);
    if (byId.size < n) (await Promise.all([1, 2, 3].map(p => fetchSimilarFor(tmdbId, p)))).forEach(add);
    return [...byId.values()].sort((x, y) => y.vote_average - x.vote_average).slice(0, n);
  };

  const getAiSources = () => {
    const rated = diary.filter(d => Number(d.rating) >= 4);
    const fives = rated.filter(d => Number(d.rating) >= 5).slice(0, 4);
    const generalSources = rated.slice(0, 10);
    return { fives, generalSources };
  };

  const buildGeneral = (lists, exclude) => {
    const count = new Map(); const byId = new Map();
    lists.flat().forEach(m => { count.set(m.id, (count.get(m.id) || 0) + 1); byId.set(m.id, m); });
    return [...byId.values()]
      .filter(m => !exclude.has(String(m.id)))
      .sort((x, y) => (count.get(y.id) - count.get(x.id)) || (y.vote_average - x.vote_average));
  };

  const loadAIRecommendations = async () => {
    setAiLoading(true);
    setAiGeneralVisible(10);
    setAiPage(1);
    setAiExhausted(false);
    const { fives, generalSources } = getAiSources();
    if (generalSources.length === 0) {
      setAiSections([]); setAiGeneral([]); setAiLoading(false); return;
    }
    try {
      const inDiary = new Set(diary.map(d => String(d.tmdb_id)));

      const sectionResults = await Promise.all(fives.map(f => fetchRecsUpTo(f.tmdb_id, 50, inDiary)));
      const sections = fives.map((f, i) => ({
        id: f.tmdb_id, title: f.title, template: AI_TEMPLATES[i % AI_TEMPLATES.length], items: sectionResults[i]
      })).filter(sec => sec.items.length > 0);

      const generalLists = await Promise.all(generalSources.map(g => fetchRecsFor(g.tmdb_id, 1)));
      setAiSections(sections);
      setAiGeneral(buildGeneral(generalLists, inDiary));
    } catch (e) {
      setAiSections([]); setAiGeneral([]);
    }
    setAiLoading(false);
  };

  const loadMoreAI = async () => {
    setAiLoadingMore(true);
    const newVisible = aiGeneralVisible + 10;
    if (aiGeneral.length < newVisible && !aiExhausted) {
      const nextPage = aiPage + 1;
      const { generalSources } = getAiSources();
      const exclude = new Set(diary.map(d => String(d.tmdb_id)));
      aiGeneral.forEach(m => exclude.add(String(m.id)));
      const lists = await Promise.all(generalSources.map(g => fetchRecsFor(g.tmdb_id, nextPage)));
      const extra = buildGeneral(lists, exclude);
      setAiGeneral(prev => [...prev, ...extra]);
      setAiPage(nextPage);
      if (extra.length === 0) setAiExhausted(true);
    }
    setAiGeneralVisible(newVisible);
    setAiLoadingMore(false);
  };

  const filteredDiary = diary.filter(d => matchesProfileSearch(d, profileMeta[String(d.tmdb_id)], profileQuery));
  const filteredWatchlist = watchlist.filter(w => matchesProfileSearch(w, profileMeta[String(w.tmdb_id)], profileQuery));

  const finalDiary = filteredDiary.filter(entry => {
    const meta = profileMeta[String(entry.tmdb_id)] || {};
    const genresStr = entry.genre && entry.genre !== 'N/A' ? entry.genre : (meta.genre || '');
    const matchesGenre = profileGenreFilter === '' || genresStr.toLowerCase().includes(profileGenreFilter.toLowerCase());
    const matchesRating = profileRatingFilter === 0 || Number(entry.rating) === profileRatingFilter;
    return matchesGenre && matchesRating;
  });

  const goHome = () => {
    const alreadyClean = currentView === 'home' && searchQuery === '' && genreFilter === '';
    setSearchQuery('');
    setGenreFilter('');
    setSelectedRoom(null);
    setIsModalOpen(false);
    setCurrentView('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (alreadyClean) loadMovies(1, true);
  };

  const openModal = async (id) => {
    setSelectedMovie(null);
    setIsModalOpen(true);
    let existingEntry;
    if (currentView === 'rooms') existingEntry = roomMovies.find(m => m.tmdb_id === id.toString() && m.user_id === session.user.id);
    else existingEntry = diary.find(d => d.tmdb_id === id.toString());

    setRating(existingEntry ? existingEntry.rating : 0);
    setReview(existingEntry?.review || '');
    setPlatform(existingEntry?.platform || '');
    setDateWatched(existingEntry?.date_watched || new Date().toISOString().split('T')[0]);

    try {
      const res = await fetch(`${BASE_URL}/movie/${id}?api_key=${TMDB_API_KEY}&language=pt-BR&append_to_response=videos,credits,watch/providers`);
      setSelectedMovie(await res.json());
    } catch (e) {}
  };

  const toggleWatchlist = async () => {
    if (!selectedMovie || !session) return;
    const movieId = selectedMovie.id.toString();
    const isSaved = watchlist.find(w => w.tmdb_id === movieId);
    try {
      if (isSaved) {
        await supabase.from('watchlist').delete().match({ user_id: session.user.id, tmdb_id: movieId });
        setWatchlist(watchlist.filter(w => w.tmdb_id !== movieId));
        showToast('Removido da sua lista');
      } else {
        const newEntry = { user_id: session.user.id, tmdb_id: movieId, title: selectedMovie.title, poster_path: selectedMovie.poster_path };
        await supabase.from('watchlist').insert([newEntry]);
        setWatchlist([...watchlist, newEntry]);
        showToast('Adicionado à sua lista!');
      }
    } catch (e) {}
  };

  const saveToDiary = async () => {
    if (!selectedMovie || !session) return;
    if (rating === 0) return showToast('Por favor, selecione uma nota.', 'error');
    
    const movieId = selectedMovie.id.toString();
    const director = selectedMovie.credits?.crew?.find(c => c.job === 'Director')?.name || 'N/A';
    const actors = selectedMovie.credits?.cast?.slice(0, 3).map(a => a.name).join(', ') || 'N/A';
    const year = selectedMovie.release_date?.split('-')[0] || 'N/A';
    const genre = selectedMovie.genres?.map(g => g.name).join(', ') || 'N/A';
    const userName = session.user.user_metadata?.full_name || session.user.email.split('@')[0];
    const countryCode = selectedMovie.origin_country?.[0] || selectedMovie.production_countries?.[0]?.iso_3166_1 || '';
    const country = countryName(countryCode) || 'N/A';

    const fullDiaryEntry = {
      user_id: session.user.id, tmdb_id: movieId, title: selectedMovie.title, poster_path: selectedMovie.poster_path,
      year, director, actors, rating, review, platform, date_watched: dateWatched, genre, country
    };

    const safeDiaryEntry = {
      user_id: session.user.id, tmdb_id: movieId, title: selectedMovie.title, poster_path: selectedMovie.poster_path,
      rating, review, platform, date_watched: dateWatched
    };

    const performSave = async (tableName, fullEntry, safeEntry, matchCriteria) => {
        const { data: found, error: findError } = await supabase.from(tableName).select('id').match(matchCriteria).limit(1);
        if (findError) throw new Error(`[${tableName}] ao buscar: ${findError.message}`);
        const existing = found && found.length > 0 ? found[0] : null;

        const write = async (entry) => {
            if (existing) {
                let { data, error } = await supabase.from(tableName).update({ ...entry, created_at: new Date().toISOString() }).eq('id', existing.id).select();
                if (error) ({ data, error } = await supabase.from(tableName).update(entry).eq('id', existing.id).select());
                if (error) return { error };
                if (!data || data.length === 0) return { error: new Error('Nenhuma linha atualizada') };
                return { error: null };
            }
            let { data, error } = await supabase.from(tableName).insert([{ ...entry, created_at: new Date().toISOString() }]).select();
            if (error) ({ data, error } = await supabase.from(tableName).insert([entry]).select());
            if (error) return { error };
            if (!data || data.length === 0) return { error: new Error('Nenhuma linha inserida') };
            return { error: null };
        };

        let result = await write(fullEntry);
        if (result.error) {
            console.warn(`Fallback acionado para a tabela ${tableName}:`, result.error);
            result = await write(safeEntry);
        }
        if (result.error) {
            console.error(`Falha ao salvar em ${tableName}:`, result.error);
            throw new Error(`[${tableName}] ${result.error.message}`);
        }
    };

    try {
      if (currentView === 'rooms' && selectedRoom) {
        const fullRoomEntry = { ...fullDiaryEntry, room_id: selectedRoom.id, user_name: userName };
        const safeRoomEntry = { ...safeDiaryEntry, room_id: selectedRoom.id, user_name: userName };
        
        await performSave('room_movies', fullRoomEntry, safeRoomEntry, { room_id: selectedRoom.id, tmdb_id: movieId, user_id: session.user.id });
        await performSave('diary', fullDiaryEntry, safeDiaryEntry, { user_id: session.user.id, tmdb_id: movieId });
        
        fetchRoomMovies(selectedRoom.id);
        fetchDiary(session.user.id); 
        showToast('Avaliação salva na sala e no seu histórico!');
        setIsModalOpen(false);
        setRoomMovieSearch(''); setRoomMovieSuggestions([]); 
      } else {
        await performSave('diary', fullDiaryEntry, safeDiaryEntry, { user_id: session.user.id, tmdb_id: movieId });
        
        fetchDiary(session.user.id);
        showToast('Salvo no seu diário com sucesso!');
        setIsModalOpen(false);
      }
    } catch (e) {
      console.error('Erro ao salvar avaliação:', e);
      showToast(`Não foi possível salvar: ${e.message}`, 'error');
    }
  };


  const fetchRooms = async () => {
    const { data: mData, error } = await supabase
      .from('membros_sala')
      .select(`
        sala_id,
        rooms (*)
      `)
      .eq('user_id', session.user.id);

    if (error) {
      showToast('Erro ao carregar salas: ' + error.message, 'error');
      return;
    }

    if (mData) {
      const rData = mData.map(item => item.rooms).filter(Boolean);
      
      const { data: allMembersData } = await supabase.from('membros_sala').select('sala_id, user_name');
      const roomsWithMembers = rData.map(room => {
        const members = Array.from(new Set((allMembersData || []).filter(m => m.sala_id === room.id).map(m => m.user_name || 'Usuário')));
        return { ...room, members };
      });
      
      setRooms(roomsWithMembers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    }
  };

  const fetchRoomMembers = async (roomId) => {
    // Busca na tabela quem realmente está conectado à sala (mesmo que ainda não tenha avaliado)
    const { data } = await supabase.from('membros_sala').select('user_id, user_name').eq('sala_id', roomId);
    if (data) setRoomMembersData(data);
  };

  const createRoom = async () => {
    if (!newRoomName.trim()) return showToast('Digite um nome para a sala', 'error');
    const shortCode = Math.random().toString(36).substring(2, 8).toUpperCase(); 
    const userName = session.user.user_metadata?.full_name || session.user.email.split('@')[0];
    
    const { data, error } = await supabase.from('rooms').insert([{ name: newRoomName, user_id: session.user.id, room_code: shortCode }]).select();
    
    if (!error && data) {
      await supabase.from('membros_sala').insert([{ sala_id: data[0].id, user_id: session.user.id, user_name: userName }]);
      
      setRooms([{...data[0], members: [userName]}, ...rooms]); 
      setNewRoomName('');
      showToast('Sala criada com sucesso!'); 
      openRoom(data[0]);
    } else {
      showToast('Erro ao criar sala.', 'error');
    }
  };

  const joinRoom = async () => {
    if (!joinRoomCode.trim()) return showToast('Digite o código', 'error');
    const userName = session.user.user_metadata?.full_name || session.user.email.split('@')[0];
    
    const { data, error } = await supabase.from('rooms').select('*').eq('room_code', joinRoomCode.toUpperCase()).maybeSingle();
    
    if (data) { 
      const { error: linkError } = await supabase.from('membros_sala').insert([{ sala_id: data.id, user_id: session.user.id, user_name: userName }]);
      if (linkError) console.log("Usuário já está na sala ou ocorreu um erro:", linkError.message);

      setJoinRoomCode(''); 
      showToast('Bem-vinda(o)! A sala agora está salva no seu perfil.');
      openRoom(data); 
      fetchRooms(); 
    } 
    else showToast('Código inválido ou sala não encontrada.', 'error');
  };

  const handleEditRoomSubmit = async (e) => {
    e.preventDefault();
    if (!editRoomModal.name.trim()) return;
    const { error } = await supabase.from('rooms').update({ name: editRoomModal.name }).eq('id', editRoomModal.id);
    if (!error) {
      setRooms(rooms.map(r => r.id === editRoomModal.id ? { ...r, name: editRoomModal.name } : r));
      if (selectedRoom?.id === editRoomModal.id) setSelectedRoom({...selectedRoom, name: editRoomModal.name});
      showToast('Sala atualizada!');
      setEditRoomModal({ isOpen: false, id: null, name: '' });
    }
  };

  const deleteRoom = async (e, id) => {
    e.stopPropagation(); 
    if (!(await askConfirm({ title: 'Excluir sala?', message: 'A sala e todos os filmes avaliados nela serão apagados.', confirmLabel: 'Excluir sala' }))) return;
    const { error } = await supabase.from('rooms').delete().eq('id', id);
    if (!error) {
      setRooms(rooms.filter(r => r.id !== id));
      if (selectedRoom?.id === id) setSelectedRoom(null);
      showToast('Sala excluída!');
    }
  };

  const fetchRoomMovies = async (roomId) => {
    let { data, error } = await supabase.from('room_movies').select('*').eq('room_id', roomId).order('created_at', { ascending: false });
    if (error) {
      ({ data, error } = await supabase.from('room_movies').select('*').eq('room_id', roomId));
    }
    if (error) { showToast(`Erro ao carregar a sala: ${error.message}`, 'error'); return; }
    setRoomMovies(byNewest(data || []));
  };

  const openRoom = (room) => {
    setSelectedRoom(room); 
    fetchRoomMovies(room.id);
    fetchRoomMembers(room.id);
    setRoomMovieSearch(''); setRoomFilterQuery(''); setRoomMovieSuggestions([]);
    setRoomGenreFilter(''); setRoomRatingFilter(0);
  };

  const openPublicProfile = async (userId, userName) => {
    setPublicProfile({ name: userName, diary: [], watchlist: [], loading: true });
    setCurrentView('public_profile');
    setPublicProfileTab('diary'); 
    const { data: dData } = await supabase.from('diary').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    const { data: wData } = await supabase.from('watchlist').select('*').eq('user_id', userId);
    setPublicProfile({ name: userName, diary: byNewest(dData || []), watchlist: wData || [], loading: false });
  };

  const deleteRoomMovie = async (e, id) => {
    e.stopPropagation(); 
    const { error } = await supabase.from('room_movies').delete().eq('id', id);
    if (!error) {
      setRoomMovies(roomMovies.filter(m => m.id !== id));
      showToast('Sua avaliação foi removida da sala!');
    }
  };

  const deleteEntireMovieFromRoom = async (e, tmdbId) => {
    e.stopPropagation();
    if (!(await askConfirm({ title: 'Remover filme da sala?', message: 'O filme e as avaliações de todos os membros serão removidos desta sala.', confirmLabel: 'Remover filme' }))) return;
    const { error } = await supabase.from('room_movies').delete().match({ room_id: selectedRoom.id, tmdb_id: tmdbId });
    if (!error) {
      setRoomMovies(roomMovies.filter(m => m.tmdb_id !== tmdbId));
      showToast('Filme removido da sala!');
    } else showToast('Erro ao remover o filme.', 'error');
  };

  const deleteDiaryEntry = async (e, id) => {
    e.stopPropagation(); 
    if (!(await askConfirm({ title: 'Excluir do Diário?', message: 'Este filme será removido do seu histórico pessoal.', confirmLabel: 'Excluir' }))) return;
    
    const { error } = await supabase.from('diary').delete().eq('id', id);
    if (!error) {
      setDiary(diary.filter(d => d.id !== id));
      showToast('Filme excluído do seu diário!');
    } else {
      showToast('Erro ao excluir o filme.', 'error');
    }
  };

  const compressImage = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const size = 256;
        const side = Math.min(img.width, img.height);
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        canvas.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return showToast('A imagem deve ter no máximo 5MB.', 'error');
    try {
      const avatar = await compressImage(file);
      const { error } = await supabase.from('profiles').upsert({ user_id: session.user.id, avatar }, { onConflict: 'user_id' });
      if (error) throw error;
      setAvatarUrl(avatar);
      showToast('Foto de perfil atualizada!');
    } catch (err) {
      console.error('Erro ao salvar foto:', err);
      showToast('Erro ao atualizar foto. Verifique se a tabela "profiles" foi criada.', 'error');
    } finally {
      e.target.value = '';
    }
  };

  const handleAvatarRemove = async (e) => {
    e.stopPropagation();
    if (!(await askConfirm({ title: 'Remover foto de perfil?', message: 'Sua foto será apagada e voltaremos para o círculo com a inicial do seu nome.', confirmLabel: 'Remover foto' }))) return;
    const { error } = await supabase.from('profiles').delete().eq('user_id', session.user.id);
    if (error) { console.error('Erro ao remover foto:', error); showToast('Erro ao remover a foto.', 'error'); return; }
    setAvatarUrl('');
    showToast('Foto removida. Voltamos ao perfil padrão!');
  };

  const atualizarNomeUsuario = async () => {
    if (!newUserName.trim()) return showToast('Por favor, digite um nome válido.', 'error');
    
    setIsUpdatingName(true);
    const { data, error } = await supabase.auth.updateUser({
      data: { full_name: newUserName }
    });

    if (error) {
      showToast('Erro ao atualizar o nome: ' + error.message, 'error');
    } else {
      // Propaga o novo nome para as tabelas para atualizar em tempo real na tela dos outros
      await supabase.from('room_movies').update({ user_name: newUserName }).eq('user_id', session.user.id);
      await supabase.from('membros_sala').update({ user_name: newUserName }).eq('user_id', session.user.id);
      
      showToast('Nome atualizado com sucesso!');
      setIsEditingName(false);
      setSession({ ...session, user: data.user });
    }
    setIsUpdatingName(false);
  };

  const sortedRoomMovies = byNewest(roomMovies);

  const groupedRoomMovies = [...sortedRoomMovies.reduce((acc, movie) => {
    const key = String(movie.tmdb_id);
    if (!acc.has(key)) {
      acc.set(key, {
        tmdb_id: movie.tmdb_id, title: movie.title, poster_path: movie.poster_path,
        director: movie.director, actors: movie.actors, year: movie.year, genre: movie.genre, country: movie.country, reviews: []
      });
    }
    acc.get(key).reviews.push(movie);
    return acc;
  }, new Map()).values()];

  const filteredGroupedRoomMovies = groupedRoomMovies.filter(group => matchesProfileSearch({
    title: group.title, director: group.director, actors: group.actors, genre: group.genre, country: group.country, year: group.year,
    platform: group.reviews.map(r => r.platform).filter(Boolean).join(' '),
    review: group.reviews.map(r => r.review).filter(Boolean).join(' '),
    extra: group.reviews.map(r => r.user_name).filter(Boolean).join(' '),
    dates: group.reviews.map(r => r.date_watched).filter(Boolean),
    ratings: group.reviews.map(r => r.rating)
  }, profileMeta[String(group.tmdb_id)], roomFilterQuery));

  const finalRoomMovies = filteredGroupedRoomMovies.filter(group => {
    const meta = profileMeta[String(group.tmdb_id)] || {};
    const genresStr = group.genre && group.genre !== 'N/A' ? group.genre : (meta.genre || '');
    const matchesGenre = roomGenreFilter === '' || genresStr.toLowerCase().includes(roomGenreFilter.toLowerCase());
    const matchesRating = roomRatingFilter === 0 || group.reviews.some(r => Number(r.rating) === roomRatingFilter);
    return matchesGenre && matchesRating;
  });

  if (!session) return <><AuthScreen showToast={showToast} /><Toast message={toastMsg.text} type={toastMsg.type} /></>;

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-200">
      <Toast message={toastMsg.text} type={toastMsg.type} />
      <ConfirmModal dialog={confirmDialog} onClose={closeConfirm} />
      
      {editRoomModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-6 relative shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Edit3 size={20} className="text-rose-500"/> Editar Sala</h3>
            <form onSubmit={handleEditRoomSubmit}>
              <input type="text" value={editRoomModal.name} onChange={(e) => setEditRoomModal({...editRoomModal, name: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-rose-600 mb-4" />
              <div className="flex gap-3">
                <button type="button" onClick={() => setEditRoomModal({isOpen: false, id: null, name: ''})} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg transition">Cancelar</button>
                <button type="submit" className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 rounded-lg transition">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <nav className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div onClick={goHome} className="text-2xl font-extrabold text-rose-600 cursor-pointer tracking-tighter">WatchTime.</div>
          <div className="flex flex-wrap justify-center gap-4 md:gap-6 text-sm font-medium text-slate-300">
            <button onClick={() => setCurrentView('home')} className={`hover:text-white transition-colors ${currentView==='home'?'text-rose-500':''}`}>Catálogo</button>
            <button onClick={() => setCurrentView('rooms')} className={`hover:text-white transition-colors flex items-center gap-1.5 ${currentView==='rooms'?'text-rose-500':''}`}><Users size={16} /> Salas</button>
            <button onClick={() => setCurrentView('ai')} className={`hover:text-white transition-colors flex items-center gap-1.5 ${currentView==='ai'?'text-rose-500':''}`}><Sparkles size={16} /> IA</button>
            <button onClick={() => setCurrentView('profile')} className={`hover:text-white transition-colors flex items-center gap-1.5 ${currentView==='profile'?'text-rose-500':''}`}><User size={16} /> Perfil</button>
            {isAdmin && <button onClick={() => setCurrentView('admin')} className={`hover:text-white flex items-center gap-1.5 ${currentView==='admin'?'text-yellow-500':'text-yellow-600'}`}><Shield size={16} /> Admin</button>}
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <form onSubmit={e => e.preventDefault()} className="relative flex-1 md:w-64">
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Pesquise por título, gênero..." className="w-full bg-slate-950 border border-slate-800 rounded-full py-1.5 px-4 pr-10 text-sm text-white focus:outline-none focus:border-rose-600"/>
              <button type="button" className="absolute right-3 top-1.5 text-slate-500 hover:text-white"><Search size={16} /></button>
            </form>
            <button onClick={() => supabase.auth.signOut()} className="text-sm text-slate-400 hover:text-rose-500 flex items-center gap-2">Sair <LogOut size={16} /></button>
          </div>
        </div>
      </nav>

      <main className="pb-12 max-w-7xl mx-auto p-4 md:p-6">
        {(currentView === 'home' || currentView === 'search') && (
          <div className="animate-in fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
              <div>
                <h1 className="text-3xl font-bold mb-2 text-white">{currentView === 'home' ? 'Explorar Catálogo' : `Buscando: "${searchQuery}"`}</h1>
                <p className="text-slate-400">{currentView === 'home' ? 'Lançamentos mais recentes e mais conhecidos, do ano atual para trás.' : 'Resultados inteligentes baseados na sua pesquisa.'}</p>
              </div>
            </div>
            
            {currentView === 'home' && (
              <div className="flex gap-2 overflow-x-auto pb-3 mb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                 {GENRES.map(g => (
                    <button 
                       key={g.id} 
                       onClick={() => { setGenreFilter(g.id); setSearchQuery(''); }}
                       className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all ${genreFilter === g.id ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/20' : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'}`}
                    >
                       {g.name}
                    </button>
                 ))}
              </div>
            )}
            
            {movies.length === 0 && isLoadingMovies ? (
              <div className="text-center py-20 text-slate-400 flex flex-col items-center gap-3">
                 <Search className="animate-spin text-rose-600" size={32} /> Buscando no banco de dados...
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                {movies.map(movie => <MovieCard key={movie.id} movie={movie} onClick={openModal} userRating={diary.find(d => d.tmdb_id === movie.id.toString())?.rating} />)}
              </div>
            )}
            
            {movies.length > 0 && currentView === 'home' && (
              <div className="flex justify-center mt-10">
                <button onClick={() => loadMovies(page + 1, false)} disabled={isLoadingMovies} className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 border border-slate-700 text-white font-bold py-3 px-8 rounded-full transition-colors flex items-center gap-2">
                  {isLoadingMovies ? <Search className="animate-spin" size={18} /> : <Plus size={18}/>}
                  {isLoadingMovies ? 'Carregando mais...' : 'Carregar mais filmes'}
                </button>
              </div>
            )}

            {movies.length === 0 && !isLoadingMovies && currentView === 'search' && (
              <div className="text-center py-20 text-slate-400">Nenhum resultado encontrado. Tente outras palavras.</div>
            )}
          </div>
        )}

        {currentView === 'ai' && (
          <div className="animate-in fade-in">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3 text-white"><Sparkles className="text-rose-600" /> Recomendações da IA</h1>
            <p className="text-slate-400 mb-8">Nossa inteligência analisa os filmes que você avaliou com notas 4 e 5 no seu diário e explica por que cada sugestão apareceu para você.</p>

            {aiLoading ? (
              <div className="text-center py-20 bg-slate-900 rounded-xl border border-slate-800 flex flex-col items-center">
                 <Sparkles className="animate-pulse text-rose-600 mb-4" size={48} />
                 <h2 className="text-xl font-bold mb-2 text-white">Analisando o seu gosto...</h2>
                 <p className="text-slate-400">Cruzando dados do seu Histórico.</p>
              </div>
            ) : (aiSections.length === 0 && aiGeneral.length === 0) ? (
              <div className="text-center py-20 bg-slate-900 rounded-xl border border-slate-800">
                <Sparkles size={48} className="text-slate-600 mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2 text-white">Sem dados suficientes</h2>
                <p className="text-slate-400 max-w-md mx-auto">Para que eu entenda o que você gosta, avalie alguns filmes com nota 4 ou 5 no seu diário.</p>
              </div>
            ) : (
              <div className="space-y-12">
                {aiSections.map(sec => (
                  <section key={sec.id}>
                    <h2 className="text-xl md:text-2xl font-bold mb-1 text-white">{sec.template} <span className="text-rose-500">{sec.title}</span></h2>
                    <p className="text-sm text-slate-500 mb-2">{sec.items.length} filmes parecidos com um dos seus favoritos (nota 5). Use as setas para ver mais.</p>
                    <MovieCarousel movies={sec.items} onClick={openModal} />
                  </section>
                ))}

                {aiGeneral.length > 0 && (
                  <section>
                    <h2 className="text-xl md:text-2xl font-bold mb-1 text-white flex items-center gap-2"><Sparkles size={20} className="text-rose-500" /> Achamos que você vai adorar</h2>
                    <p className="text-sm text-slate-500 mb-4">Escolhidos a partir de tudo que você avaliou com 4 e 5 estrelas.</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                      {aiGeneral.slice(0, aiGeneralVisible).map(movie => <MovieCard key={movie.id} movie={movie} onClick={openModal} />)}
                    </div>
                    {!(aiExhausted && aiGeneral.length <= aiGeneralVisible) && (
                      <div className="flex justify-center pt-8">
                        <button onClick={loadMoreAI} disabled={aiLoadingMore} className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 border border-slate-700 text-white font-bold py-3 px-8 rounded-full transition-colors flex items-center gap-2">
                          {aiLoadingMore ? <Search className="animate-spin" size={18} /> : <Plus size={18}/>}
                          {aiLoadingMore ? 'Carregando mais...' : 'Carregar mais filmes'}
                        </button>
                      </div>
                    )}
                  </section>
                )}
              </div>
            )}
          </div>
        )}

        {currentView === 'rooms' && (
          <div className="animate-in fade-in max-w-7xl mx-auto">
            {!selectedRoom ? (
               <>
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-3 text-white"><Users className="text-rose-600" /> Salas de Filmes</h1>
                <p className="text-slate-400 mb-8">Crie um diário compartilhado com seu parceiro(a) ou amigos para avaliarem filmes juntos.</p>
                <div className="flex flex-col md:flex-row gap-8 mb-8">
                  <div className="flex-1 bg-slate-900 p-8 rounded-2xl border border-slate-800 text-center">
                    <div className="w-16 h-16 bg-rose-600/20 text-rose-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-4 font-bold">+</div>
                    <h2 className="text-xl font-bold mb-2 text-white">Criar Nova Sala</h2>
                    <input type="text" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} placeholder="Ex: Filmes do Casal" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white mb-4 text-center focus:border-rose-600 focus:outline-none"/>
                    <button onClick={createRoom} className="w-full bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors font-bold py-2 px-4 rounded-lg">Criar Sala</button>
                  </div>
                  <div className="flex-1 bg-slate-900 p-8 rounded-2xl border border-slate-800 text-center">
                    <div className="w-16 h-16 bg-slate-800 text-slate-400 rounded-full flex items-center justify-center text-2xl mx-auto mb-4"><Users size={24}/></div>
                    <h2 className="text-xl font-bold mb-2 text-white">Entrar com Código</h2>
                    <input type="text" value={joinRoomCode} onChange={(e) => setJoinRoomCode(e.target.value)} placeholder="Ex: A7X9P2" maxLength={6} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white mb-4 text-center uppercase focus:border-rose-600 focus:outline-none"/>
                    <button onClick={joinRoom} className="w-full bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors font-bold py-2 px-4 rounded-lg">Entrar na Sala</button>
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-4 text-white border-b border-slate-800 pb-2">Minhas Salas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rooms.length === 0 ? <p className="text-slate-500 text-center py-4 bg-slate-900 rounded-lg border border-slate-800 col-span-full">Você ainda não está em nenhuma sala.</p> : rooms.map(room => (
                    
                    <div key={room.id} onClick={() => openRoom(room)} className="group flex flex-col sm:flex-row justify-between sm:items-center bg-slate-900 p-4 rounded-xl border border-slate-800 gap-4 cursor-pointer hover:border-rose-600 transition-all duration-300">
                      <div>
                         <h3 className="font-bold text-lg text-white group-hover:text-rose-500 transition-colors duration-300">{room.name}</h3>
                         <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                           <span className="flex items-center gap-1"><Key size={12}/> {room.room_code || 'Antiga'}</span>
                           {room.created_at && (
                             <span className="flex items-center gap-1 border-l border-slate-700 pl-3"><Calendar size={12}/> Criada em {formatCreatedAt(room.created_at)}</span>
                           )}
                           {room.members && room.members.length > 0 && (
                             <span className="flex items-center gap-1 border-l border-slate-700 pl-3">
                               <User size={12}/> {room.members.map(m => m.split(' ')[0]).join(', ')}
                             </span>
                           )}
                         </div>
                      </div>
                      <div className="flex gap-2">
                        {room.user_id === session.user.id && (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); setEditRoomModal({isOpen: true, id: room.id, name: room.name})}} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Editar</button>
                            <button onClick={(e) => deleteRoom(e, room.id)} className="bg-rose-900/30 hover:bg-rose-600 border border-rose-900/50 text-rose-500 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Excluir</button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
               </>
            ) : (
              <div className="bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-800 relative shadow-2xl">
                <button onClick={() => setSelectedRoom(null)} className="absolute top-6 right-6 text-slate-400 hover:text-white bg-slate-800 px-3 py-1 rounded-full text-sm flex items-center gap-1"><X size={14}/> Fechar Sala</button>
                <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-rose-500 flex items-center gap-2"><Users size={24}/> {selectedRoom.name}</h2>
                {selectedRoom.created_at && (
                  <p className="text-slate-400 text-sm flex items-center gap-2 mb-4"><Calendar size={14}/> Sala criada em {formatCreatedAt(selectedRoom.created_at)}</p>
                )}
                <div className="flex flex-col md:flex-row md:items-center gap-4 text-sm mb-8">
                  <p className="text-slate-400 flex items-center gap-2"><Key size={14}/> Código: <span className="text-white font-mono bg-slate-950 border border-slate-800 px-2 py-1 rounded tracking-widest">{selectedRoom.room_code || 'SEM CÓDIGO'}</span></p>
                  
                  {roomMembersData.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap md:ml-4 pl-0 md:pl-4 md:border-l border-slate-700">
                      <span className="text-slate-500 text-xs uppercase tracking-wider font-bold">Membros Ativos:</span>
                      {roomMembersData.map(member => (
                        <button key={member.user_id} onClick={() => openPublicProfile(member.user_id, member.user_name || 'Usuário')} className="bg-slate-800 hover:bg-rose-600 text-white text-xs px-3 py-1.5 rounded-full transition-colors flex items-center gap-1" title={`Ver perfil de ${member.user_name || 'Usuário'}`}>
                           <User size={12}/> {(member.user_name || 'Usuário').split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="relative mb-6 bg-slate-950 p-4 rounded-xl border border-slate-800 border-l-4 border-l-rose-600">
                  <span className="text-xs font-bold text-rose-500 mb-2 block uppercase tracking-wider">Adicionar Novo Filme</span>
                  <input type="text" value={roomMovieSearch} onChange={(e) => setRoomMovieSearch(e.target.value)} placeholder="Pesquise o filme que você deseja adicionar na sala compartilhada..." className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-rose-600" />
                  
                  {roomMovieSuggestions.length > 0 && (
                     <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                        {roomMovieSuggestions.map(movie => (
                           <div key={movie.id} onClick={() => openModal(movie.id)} className="flex items-start gap-4 p-4 hover:bg-slate-700 cursor-pointer transition-colors border-b border-slate-700/50 last:border-0">
                              {movie.poster_path ? <img src={`${IMG_URL}${movie.poster_path}`} className="w-12 h-16 object-cover rounded shadow" /> : <div className="w-12 h-16 bg-slate-900 rounded flex items-center justify-center"><Clapperboard size={16}/></div>}
                              <div className="flex-1">
                                 <h4 className="font-bold text-white text-[15px] leading-tight mb-1">{movie.title} <span className="text-xs text-slate-400 font-normal">({movie.release_date?.split('-')[0]})</span></h4>
                                 {movie.credits && (
                                   <div className="text-xs text-slate-400 leading-tight space-y-0.5">
                                      <p><span className="font-semibold text-slate-300">Dir:</span> {movie.credits.crew.find(c => c.job === 'Director')?.name || 'N/A'}</p>
                                      <p className="line-clamp-1"><span className="font-semibold text-slate-300">Com:</span> {movie.credits.cast.slice(0, 3).map(a => a.name).join(', ')}</p>
                                      <p className="text-rose-400/80 mt-1">
                                        {movie.genres?.map(g => g.name).join(' • ')} 
                                        {movie.origin_country?.[0] ? ` • ${countryName(movie.origin_country[0])}` : ''}
                                      </p>
                                   </div>
                                 )}
                              </div>
                           </div>
                        ))}
                     </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-4 border-b border-slate-800 pb-3 gap-3">
                   <h3 className="text-lg font-bold text-white flex items-center gap-2">
                     <Clapperboard className="text-slate-500" size={18}/> Avaliados na Sala
                     <span className="text-sm font-normal text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 ml-2">Total: {finalRoomMovies.length < 10 && finalRoomMovies.length > 0 ? `0${finalRoomMovies.length}` : finalRoomMovies.length}</span>
                   </h3>
                   
                   <div className="relative w-full sm:w-80">
                     <Filter size={14} className="absolute left-3 top-2.5 text-slate-500" />
                     <input type="text" value={roomFilterQuery} onChange={(e) => setRoomFilterQuery(e.target.value)} placeholder="Filtrar ator, gênero, plataforma, data..." className="w-full bg-slate-950 border border-slate-800 rounded-full py-1.5 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-rose-600"/>
                     {roomFilterQuery.trim() && profileMetaLoading && <p className="absolute -bottom-5 left-3 text-[11px] text-slate-500">Buscando detalhes dos filmes...</p>}
                   </div>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <button 
                    onClick={() => setRoomGenreFilter('')} 
                    className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all ${roomGenreFilter === '' ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/20' : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'}`}
                  >
                    Todos os Gêneros
                  </button>
                  {GENRES.filter(g => g.id !== '').map(g => (
                    <button 
                      key={g.id} 
                      onClick={() => setRoomGenreFilter(g.name)} 
                      className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all ${roomGenreFilter === g.name ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/20' : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'}`}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
                
                <div className="flex gap-2 overflow-x-auto pb-6 mb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <button 
                    onClick={() => setRoomRatingFilter(0)} 
                    className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all ${roomRatingFilter === 0 ? 'bg-yellow-500 text-slate-950 shadow-lg shadow-yellow-500/20 font-bold' : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'}`}
                  >
                    Todas as Notas
                  </button>
                  {[5, 4, 3, 2, 1].map(star => (
                    <button 
                      key={star} 
                      onClick={() => setRoomRatingFilter(star)} 
                      className={`whitespace-nowrap flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium transition-all ${roomRatingFilter === star ? 'bg-yellow-500 text-slate-950 shadow-lg shadow-yellow-500/20 font-bold' : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'}`}
                    >
                      {star} <Star size={14} className={roomRatingFilter === star ? 'fill-slate-950' : 'fill-slate-400'} />
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
                  {finalRoomMovies.length === 0 ? (
                     <div className="col-span-full text-center py-10 bg-slate-950 rounded-xl border border-slate-800 border-dashed">
                        <Clapperboard size={32} className="text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400">Nenhum filme corresponde aos seus filtros nesta sala.</p>
                     </div>
                  ) : finalRoomMovies.map(group => {
                    const userReview = group.reviews.find(r => r.user_id === session.user.id);
                    return (
                      <div key={group.tmdb_id} onClick={() => openModal(group.tmdb_id)} className="flex flex-col sm:flex-row bg-slate-900 rounded-xl overflow-hidden cursor-pointer hover:bg-slate-800 hover:border-slate-600 transition-all border border-slate-800 shadow relative group">
                        
                        <div className="w-full sm:w-36 md:w-44 shrink-0 relative aspect-[2/3] sm:aspect-auto">
                           {group.poster_path && <img src={`${IMG_URL}${group.poster_path}`} className="w-full h-full object-cover sm:absolute sm:inset-0 border-b sm:border-b-0 sm:border-r border-slate-800" />}
                        </div>

                        <div className="p-4 md:p-5 flex-1 flex flex-col justify-center relative">
                           <div className="flex justify-between items-start mb-2">
                             <div className="pr-8">
                               <h4 className="font-bold text-lg text-white mb-1">
                                 {group.title} 
                                 {group.year && <span className="text-sm text-slate-400 font-normal ml-1">({group.year})</span>}
                               </h4>
                               <p className="text-xs text-slate-400 mb-3">Dirigido por {group.director || 'N/A'} • Com {group.actors || 'N/A'}</p>
                               <MetaChips genre={group.genre} country={group.country} />
                             </div>
                             
                             <button 
                               onClick={(e) => deleteEntireMovieFromRoom(e, group.tmdb_id)} 
                               className="absolute top-3 right-3 text-slate-500 hover:text-rose-500 bg-slate-950/80 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-20" 
                               title="Remover filme da sala"
                             >
                               <Trash2 size={16}/>
                             </button>
                           </div>
                           
                           <div className="border-t border-slate-800 pt-4 mt-2">
                             <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Avaliações da Sala</h5>
                             {/* AQUI FOI ALTERADO PARA sm:grid-cols-2 (LADO A LADO) */}
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                 {group.reviews.map(review => (
                                   <div key={review.id} className="bg-slate-950 border border-slate-800 p-3 rounded-lg relative">
                                       <span className="font-bold text-rose-500 text-sm block mb-1">{review.user_name || 'Usuário'}</span>
                                       <div className="flex flex-wrap items-center gap-3 mb-2">
                                         <div className="bg-rose-600/20 text-rose-500 text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1"><Star size={10} className="fill-rose-500"/> {review.rating || 'S/N'}</div>
                                         {review.date_watched && <span className="text-xs text-slate-400 flex items-center gap-1"><Calendar size={12} /> {review.date_watched.split('-').reverse().join('/')}</span>}
                                       </div>
                                       {review.platform && <span className="text-xs text-slate-400 flex items-center gap-1 mb-2"><Tv size={12} /> {review.platform}</span>}
                                       {review.review && <p className="text-sm text-slate-300 italic border-l-2 border-slate-600 pl-2">"{review.review}"</p>}
                                       
                                       {review.user_id === session.user.id && (
                                         <div className="absolute top-3 right-3 flex items-center gap-1">
                                           <button onClick={(e) => { e.stopPropagation(); openModal(group.tmdb_id); }} className="text-slate-500 hover:text-blue-500 transition-colors p-1" title="Editar minha avaliação"><Edit3 size={14}/></button>
                                           <button onClick={(e) => deleteRoomMovie(e, review.id)} className="text-slate-500 hover:text-rose-500 transition-colors p-1" title="Apagar minha avaliação"><Trash2 size={14}/></button>
                                         </div>
                                       )}
                                   </div>
                                 ))}
                             </div>
                             {!userReview && (
                                <button onClick={(e) => { e.stopPropagation(); openModal(group.tmdb_id); }} className="mt-3 w-full sm:w-auto bg-slate-800 hover:bg-rose-600 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1">+ Dar a minha nota</button>
                             )}
                           </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {currentView === 'public_profile' && (
          <div className="animate-in fade-in max-w-7xl mx-auto">
            <button onClick={() => setCurrentView('rooms')} className="text-rose-500 hover:text-rose-400 font-bold flex items-center gap-2 mb-6"><ArrowLeft size={16}/> Voltar para a Sala</button>
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 mb-8 flex flex-col md:flex-row items-center gap-6 shadow-lg">
              <div className="w-20 h-20 bg-rose-600 rounded-full flex items-center justify-center text-3xl font-extrabold text-white">{publicProfile.name.charAt(0).toUpperCase()}</div>
              <div className="text-center md:text-left flex-1">
                <h1 className="text-3xl font-bold mb-1 text-white">Perfil de {publicProfile.name}</h1>
                <p className="text-slate-400 mb-6">Visualização de Amigo</p>
                <div className="flex justify-center md:justify-start gap-8">
                  <div><span className="text-2xl font-black text-white">{publicProfile.loading ? '-' : publicProfile.diary.length}</span> <span className="text-xs text-slate-400 uppercase">Assistidos</span></div>
                  <div><span className="text-2xl font-black text-white">{publicProfile.loading ? '-' : publicProfile.watchlist.length}</span> <span className="text-xs text-slate-400 uppercase">Na Lista</span></div>
                </div>
              </div>
            </div>
            
            {publicProfile.loading ? (
               <div className="text-center py-10 text-slate-400">Carregando dados de {publicProfile.name}...</div>
            ) : (
              <div className="w-full">
                <div className="flex gap-6 mb-6 border-b border-slate-800">
                  <button 
                    onClick={() => setPublicProfileTab('diary')} 
                    className={`pb-4 font-bold text-lg transition-colors relative flex items-center gap-2 ${publicProfileTab === 'diary' ? 'text-rose-500' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    <Clapperboard size={20}/> Filmes Assistidos <span className="bg-slate-800 text-xs px-2 py-0.5 rounded-full text-slate-300 ml-1">{publicProfile.diary.length}</span>
                    {publicProfileTab === 'diary' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500 shadow-[0_-2px_10px_rgba(225,29,72,0.5)]"></div>}
                  </button>
                  <button 
                    onClick={() => setPublicProfileTab('watchlist')} 
                    className={`pb-4 font-bold text-lg transition-colors relative flex items-center gap-2 ${publicProfileTab === 'watchlist' ? 'text-rose-500' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    <Bookmark size={20}/> Para ver depois <span className="bg-slate-800 text-xs px-2 py-0.5 rounded-full text-slate-300 ml-1">{publicProfile.watchlist.length}</span>
                    {publicProfileTab === 'watchlist' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500 shadow-[0_-2px_10px_rgba(225,29,72,0.5)]"></div>}
                  </button>
                </div>

                <div className="w-full min-h-[400px]">
                  {publicProfileTab === 'diary' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                      {publicProfile.diary.length === 0 ? <p className="text-sm text-slate-500 bg-slate-900 p-8 rounded-lg text-center">Nenhum filme avaliado ainda.</p> : (
                        <div className="space-y-4 md:space-y-6">
                          {publicProfile.diary.map(entry => (
                            <div key={entry.tmdb_id} onClick={() => openModal(entry.tmdb_id)} className="flex flex-col sm:flex-row bg-slate-900 rounded-xl overflow-hidden cursor-pointer hover:bg-slate-800 hover:border-slate-600 transition-all border border-slate-800 shadow max-w-3xl relative group">
                              <div className="w-full sm:w-32 md:w-36 shrink-0 relative">
                                 {entry.poster_path && <img src={`${IMG_URL}${entry.poster_path}`} className="w-full h-full object-cover border-b sm:border-b-0 sm:border-r border-slate-800" />}
                                 <div className="absolute top-2 left-2 bg-rose-600 text-white text-xs font-bold px-2 py-1 rounded shadow flex items-center gap-1 z-10">
                                    <Star size={12} className="fill-white" /> {entry.rating}
                                 </div>
                              </div>
                              <div className="p-4 md:p-5 flex-1 flex flex-col justify-center relative">
                                 <h4 className="font-bold text-lg text-white mb-1 pr-8">{entry.title} <span className="text-sm text-slate-400 font-normal">({entry.year})</span></h4>
                                 <p className="text-xs text-slate-400 mb-3">Dirigido por {entry.director} • Com {entry.actors}</p>
                                 <MetaChips genre={entry.genre} country={entry.country} />
                                 <div className="flex flex-wrap items-center gap-3 mt-1 mb-2">
                                   <span className="text-xs text-slate-400 flex items-center gap-1"><Calendar size={12} /> {entry.date_watched?.split('-').reverse().join('/')}</span>
                                   {entry.platform && <span className="text-xs text-slate-400 flex items-center gap-1 border-l border-slate-700 pl-3"><Tv size={12} /> {entry.platform}</span>}
                                 </div>
                                 {entry.review && <p className="text-sm text-slate-300 italic border-l-2 border-slate-600 pl-3 mt-1 line-clamp-2">"{entry.review}"</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {publicProfileTab === 'watchlist' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                      {publicProfile.watchlist.length === 0 ? <p className="text-sm text-slate-500 bg-slate-900 p-4 rounded-lg">A lista está vazia.</p> : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                          {publicProfile.watchlist.map(m => <MovieCard key={m.tmdb_id} movie={{...m, id: m.tmdb_id}} onClick={openModal} />)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {currentView === 'profile' && (
          <div className="animate-in fade-in max-w-7xl mx-auto">
             <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 mb-8 flex flex-col md:flex-row items-center gap-6 shadow-lg">
               <div className="relative group cursor-pointer" onClick={() => document.getElementById('avatar-upload').click()} title="Mudar foto de perfil">
                 {avatarUrl ? (
                   <img src={avatarUrl} alt="Perfil" className="w-20 h-20 rounded-full object-cover border-2 border-rose-600 group-hover:opacity-75 transition-opacity" />
                 ) : (
                   <div className="w-20 h-20 bg-rose-600 rounded-full flex items-center justify-center text-3xl font-extrabold text-white group-hover:opacity-75 transition-opacity">
                     {session.user.user_metadata?.full_name?.charAt(0) || session.user.email.charAt(0).toUpperCase()}
                   </div>
                 )}
                 <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                   <Edit3 size={18} className="text-white"/>
                 </div>
                 <input type="file" id="avatar-upload" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                 {avatarUrl && (
                   <button type="button" onClick={handleAvatarRemove} title="Remover foto de perfil" aria-label="Remover foto de perfil" className="absolute -bottom-1 -right-1 z-10 w-8 h-8 rounded-full bg-slate-950 border border-slate-700 text-slate-300 hover:bg-rose-600 hover:border-rose-600 hover:text-white flex items-center justify-center shadow-lg transition-colors"><Trash2 size={14} /></button>
                 )}
               </div>

               <div className="text-center md:text-left flex-1">
                 {isEditingName ? (
                   <div className="flex items-center gap-2 mb-1 justify-center md:justify-start">
                     <input 
                       type="text" 
                       value={newUserName} 
                       onChange={(e) => setNewUserName(e.target.value)}
                       autoFocus
                       className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-rose-600 text-lg w-full max-w-[250px]"
                     />
                     <button onClick={atualizarNomeUsuario} disabled={isUpdatingName} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold transition flex items-center gap-1">
                       {isUpdatingName ? '...' : <><Check size={14} /> Salvar</>}
                     </button>
                     <button onClick={() => setIsEditingName(false)} disabled={isUpdatingName} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold transition">
                       <X size={16}/>
                     </button>
                   </div>
                 ) : (
                   <h1 className="text-3xl font-bold mb-1 text-white flex items-center justify-center md:justify-start gap-3">
                     {session.user.user_metadata?.full_name || 'Usuário'}
                     <button onClick={() => { setIsEditingName(true); setNewUserName(session.user.user_metadata?.full_name || ''); }} className="text-slate-500 hover:text-rose-500 transition-colors" title="Editar nome">
                       <Edit3 size={18}/>
                     </button>
                   </h1>
                 )}
                 <p className="text-slate-400 mb-6">{session.user.email}</p>
                 <div className="flex justify-center md:justify-start gap-8">
                   <div><span className="text-2xl font-black text-white">{diary.length}</span> <span className="text-xs text-slate-400 uppercase">Assistidos</span></div>
                   <div><span className="text-2xl font-black text-white">{watchlist.length}</span> <span className="text-xs text-slate-400 uppercase">Na Lista</span></div>
                 </div>
               </div>
             </div>
             
             <div className="mb-8">
               <div className="relative">
                 <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                 <input
                   type="text" value={profileQuery} onChange={(e) => setProfileQuery(e.target.value)}
                   placeholder="Pesquise por título, gênero, ator, plataforma, ano, diretor, nacionalidade..."
                   className="w-full bg-slate-900 border border-slate-800 rounded-full py-3 pl-11 pr-11 text-sm text-white focus:outline-none focus:border-rose-600"
                 />
                 {profileQuery && (
                   <button type="button" onClick={() => setProfileQuery('')} aria-label="Limpar pesquisa" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"><X size={16} /></button>
                 )}
               </div>
               {profileQuery.trim() && (
                 <p className="text-xs text-slate-500 mt-2 ml-4">
                   {profileMetaLoading ? 'Buscando detalhes dos filmes...' : `${filteredDiary.length} no diário • ${filteredWatchlist.length} em "Para ver depois"`}
                 </p>
               )}
             </div>

             <div className="flex gap-6 mb-6 border-b border-slate-800 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
               <button 
                 onClick={() => setProfileTab('diary')} 
                 className={`whitespace-nowrap pb-4 font-bold text-lg transition-colors relative flex items-center gap-2 ${profileTab === 'diary' ? 'text-rose-500' : 'text-slate-400 hover:text-slate-200'}`}
               >
                 <Clapperboard size={20}/> Diário Histórico <span className="bg-slate-800 text-xs px-2 py-0.5 rounded-full text-slate-300 ml-1">{diary.length}</span>
                 {profileTab === 'diary' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500 shadow-[0_-2px_10px_rgba(225,29,72,0.5)]"></div>}
               </button>
               <button 
                 onClick={() => setProfileTab('watchlist')} 
                 className={`whitespace-nowrap pb-4 font-bold text-lg transition-colors relative flex items-center gap-2 ${profileTab === 'watchlist' ? 'text-rose-500' : 'text-slate-400 hover:text-slate-200'}`}
               >
                 <Bookmark size={20}/> Para ver depois <span className="bg-slate-800 text-xs px-2 py-0.5 rounded-full text-slate-300 ml-1">{watchlist.length}</span>
                 {profileTab === 'watchlist' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500 shadow-[0_-2px_10px_rgba(225,29,72,0.5)]"></div>}
               </button>
             </div>

             <div className="w-full min-h-[400px]">
               {profileTab === 'diary' && (
                 <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                   
                   <div className="flex gap-2 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                     <button 
                       onClick={() => setProfileGenreFilter('')} 
                       className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all ${profileGenreFilter === '' ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/20' : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'}`}
                     >
                       Todos os Gêneros
                     </button>
                     {GENRES.filter(g => g.id !== '').map(g => (
                       <button 
                         key={g.id} 
                         onClick={() => setProfileGenreFilter(g.name)} 
                         className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all ${profileGenreFilter === g.name ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/20' : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'}`}
                       >
                         {g.name}
                       </button>
                     ))}
                   </div>
                   
                   <div className="flex gap-2 overflow-x-auto pb-6 mb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                     <button 
                       onClick={() => setProfileRatingFilter(0)} 
                       className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all ${profileRatingFilter === 0 ? 'bg-yellow-500 text-slate-950 shadow-lg shadow-yellow-500/20 font-bold' : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'}`}
                     >
                       Todas as Notas
                     </button>
                     {[5, 4, 3, 2, 1].map(star => (
                       <button 
                         key={star} 
                         onClick={() => setProfileRatingFilter(star)} 
                         className={`whitespace-nowrap flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium transition-all ${profileRatingFilter === star ? 'bg-yellow-500 text-slate-950 shadow-lg shadow-yellow-500/20 font-bold' : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'}`}
                       >
                         {star} <Star size={14} className={profileRatingFilter === star ? 'fill-slate-950' : 'fill-slate-400'} />
                       </button>
                     ))}
                   </div>
                   
                   {diary.length === 0 ? (
                     <p className="text-sm text-slate-500 bg-slate-900 p-8 rounded-lg text-center">Nenhum filme avaliado ainda.</p>
                   ) : finalDiary.length === 0 ? (
                     <p className="text-sm text-slate-500 bg-slate-900 p-8 rounded-lg text-center">Nenhum filme corresponde aos seus filtros e pesquisa.</p>
                   ) : (
                     <div className="space-y-4 md:space-y-6">
                       {finalDiary.map(entry => (
                         <div key={entry.tmdb_id} onClick={() => openModal(entry.tmdb_id)} className="flex flex-col sm:flex-row bg-slate-900 rounded-xl overflow-hidden cursor-pointer hover:bg-slate-800 hover:border-slate-600 transition-all border border-slate-800 shadow max-w-3xl relative group">
                           <div className="w-full sm:w-32 md:w-36 shrink-0 relative">
                              {entry.poster_path && <img src={`${IMG_URL}${entry.poster_path}`} className="w-full h-full object-cover border-b sm:border-b-0 sm:border-r border-slate-800" />}
                              <div className="absolute top-2 left-2 bg-rose-600 text-white text-xs font-bold px-2 py-1 rounded shadow flex items-center gap-1 z-10">
                                 <Star size={12} className="fill-white" /> {entry.rating}
                              </div>
                           </div>
                           <div className="p-4 md:p-5 flex-1 flex flex-col justify-center relative">
                              <h4 className="font-bold text-lg text-white mb-1 pr-8">{entry.title} <span className="text-sm text-slate-400 font-normal">({entry.year})</span></h4>
                              <p className="text-xs text-slate-400 mb-3">Dirigido por {entry.director} • Com {entry.actors}</p>
                              <MetaChips genre={entry.genre} country={entry.country} />
                              
                              <div className="flex flex-wrap items-center gap-3 mt-1 mb-2">
                                <span className="text-xs text-slate-400 flex items-center gap-1"><Calendar size={12} /> {entry.date_watched?.split('-').reverse().join('/')}</span>
                                {entry.platform && <span className="text-xs text-slate-400 flex items-center gap-1 border-l border-slate-700 pl-3"><Tv size={12} /> {entry.platform}</span>}
                              </div>
                              
                              {entry.review && <p className="text-sm text-slate-300 italic border-l-2 border-rose-600 pl-3 mt-1 line-clamp-2">"{entry.review}"</p>}

                              <button 
                                onClick={(e) => deleteDiaryEntry(e, entry.id)} 
                                className="absolute top-3 right-3 text-slate-500 hover:text-rose-500 bg-slate-950/80 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-20" 
                                title="Apagar do diário"
                              >
                                <Trash2 size={16}/>
                              </button>
                           </div>
                         </div>
                       ))}
                     </div>
                   )}
                 </div>
               )}

               {profileTab === 'watchlist' && (
                 <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {watchlist.length === 0 ? (
                      <p className="text-sm text-slate-500 bg-slate-900 p-8 rounded-lg text-center">Sua lista está vazia.</p>
                    ) : filteredWatchlist.length === 0 ? (
                      <p className="text-sm text-slate-500 bg-slate-900 p-8 rounded-lg text-center">Nenhum filme da lista corresponde à pesquisa.</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                        {filteredWatchlist.map(m => (
                          <MovieCard key={m.tmdb_id} movie={{...m, id: m.tmdb_id}} onClick={openModal} />
                        ))}
                      </div>
                    )}
                 </div>
               )}
             </div>
          </div>
        )}
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 md:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-6xl h-[95vh] md:h-[90vh] rounded-2xl overflow-hidden relative shadow-2xl animate-in zoom-in-95 flex flex-col md:flex-row">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 bg-black/60 hover:bg-rose-600 text-white p-2 rounded-full transition z-20"><X size={20} /></button>
            {!selectedMovie ? <div className="p-12 w-full text-center text-slate-400 flex items-center justify-center">Carregando detalhes...</div> : (
              <>
                <div className="w-full md:w-1/3 lg:w-1/4 bg-slate-950 p-6 flex flex-col items-center border-r border-slate-800 overflow-y-auto shrink-0">
                  <img src={`${IMG_URL}${selectedMovie.poster_path}`} className="w-32 md:w-full rounded-lg shadow-lg mb-6 object-cover hidden md:block" />
                  
                  <button onClick={toggleWatchlist} className={`mb-6 w-full font-medium py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm border ${watchlist.some(w => w.tmdb_id === selectedMovie.id.toString()) ? 'bg-slate-900 border-rose-600 text-rose-500' : 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'}`}>
                    <Bookmark size={18} className={watchlist.some(w => w.tmdb_id === selectedMovie.id.toString()) ? "fill-rose-500" : ""} /> 
                    {watchlist.some(w => w.tmdb_id === selectedMovie.id.toString()) ? 'Na Lista Pessoal' : 'Salvar na Lista'}
                  </button>
                  
                  <div className="w-full bg-slate-900 p-4 rounded-xl border border-slate-800">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 text-center border-b border-slate-700 pb-2">{currentView === 'rooms' ? 'Sua Avaliação na Sala' : 'Registrar no Diário'}</h3>
                    <div className="mb-3">
                      <label className="block text-xs text-slate-400 mb-1 text-center">Sua Nota</label>
                      <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map(star => <button key={star} type="button" onClick={() => setRating(star)} className="focus:outline-none"><Star size={28} className={star <= rating ? 'fill-yellow-500 text-yellow-500' : 'text-slate-600'} /></button>)}
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="block text-xs text-slate-400 mb-1">Data que assistiu</label>
                      <input type="date" value={dateWatched} onChange={(e) => setDateWatched(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-rose-600" />
                    </div>
                    <div className="mb-3">
                      <label className="block text-xs text-slate-400 mb-1">Onde assistiu?</label>
                      <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-rose-600">
                        <option value="">Selecione...</option><option value="Cinema">Cinema</option><option value="Netflix">Netflix</option><option value="Prime Video">Prime Video</option><option value="Max">Max</option><option value="Disney+">Disney+</option><option value="Mídia Física">Mídia Física / Outro</option>
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="block text-xs text-slate-400 mb-1">Sua resenha (Opcional)</label>
                      <textarea value={review} onChange={(e) => setReview(e.target.value)} placeholder="O que achou do filme?" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-rose-600 resize-none h-20" />
                    </div>
                    <button onClick={saveToDiary} className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-lg text-sm transition">Salvar Avaliação</button>
                  </div>
                </div>
                <div className="w-full md:w-2/3 lg:w-3/4 p-6 overflow-y-auto flex flex-col gap-6">
                  <div>
                    <h2 className="text-3xl md:text-5xl font-extrabold mb-2 text-white">{selectedMovie.title}</h2>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300 mb-4">
                      <span className="font-bold">{selectedMovie.release_date?.split('-')[0]}</span><span>•</span>
                      <span className="bg-slate-800 px-3 py-1 rounded-full border border-slate-700">{selectedMovie.genres?.map(g => g.name).join(', ')}</span>
                      <div className="flex items-center gap-1 ml-auto bg-yellow-500/10 text-yellow-500 px-3 py-1 rounded-full border border-yellow-500/20">
                        <Star size={12} className="fill-yellow-500" /> <span className="font-bold">{selectedMovie.vote_average?.toFixed(1)}</span> TMDB
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-sm bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                      <div><span className="text-slate-500 font-bold">Direção:</span> <span className="text-slate-300">{selectedMovie.credits?.crew?.find(c => c.job === 'Director')?.name || 'N/A'}</span></div>
                      <div><span className="text-slate-500 font-bold">Elenco:</span> <span className="text-slate-300">{selectedMovie.credits?.cast?.slice(0, 3).map(a => a.name).join(', ') || 'N/A'}</span></div>
                      
                      <div className="md:col-span-2 mt-2 pt-2 border-t border-slate-800 flex flex-col md:flex-row justify-between gap-2">
                        <div>
                           <span className="text-slate-500 font-bold">Nacionalidade:</span> 
                           <span className="text-slate-300 font-medium ml-2">
                             {countryName(selectedMovie.origin_country?.[0] || selectedMovie.production_countries?.[0]?.iso_3166_1) || 'N/A'}
                           </span>
                        </div>
                        <div>
                           <span className="text-slate-500 font-bold">Assistir (Brasil):</span> 
                           <span className="text-emerald-400 font-medium ml-2">
                             {summarizeProviders(selectedMovie['watch/providers']?.results?.BR) || 'Indisponível em streaming.'}
                           </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-slate-300 leading-relaxed text-sm md:text-base">{selectedMovie.overview}</p>
                  </div>
                  <div>
                     <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Play size={16} className="text-rose-600" /> Trailer Oficial</h4>
                     <div className="aspect-video w-full rounded-xl overflow-hidden bg-black shadow-inner relative border border-slate-800">
                        {selectedMovie.videos?.results.find(v => v.site === 'YouTube' && v.type === 'Trailer') ? (
                           <iframe className="w-full h-full absolute inset-0" src={`https://www.youtube.com/embed/${selectedMovie.videos.results.find(v => v.site === 'YouTube' && v.type === 'Trailer').key}?autoplay=0`} allowFullScreen></iframe>
                        ) : <div className="w-full h-full flex items-center justify-center text-slate-500 bg-slate-900">Trailer indisponível no TMDB.</div>}
                     </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}