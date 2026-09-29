import React, { useState, useEffect } from 'react';
import { 
  Search, User, Star, Bookmark, LogOut, X, 
  Calendar, Clapperboard, Shield, Play, Users, Sparkles, Tv, Key
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = (SUPABASE_URL && SUPABASE_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_KEY) 
  : null;

const TMDB_API_KEY = '5f4dcdde8ea6335d5a63bf674d84d113';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';

// Componente de Toast (Mensagens na tela)
const Toast = ({ message, type }) => {
  if (!message) return null;
  const bgColor = type === 'error' ? 'bg-red-600' : 'bg-emerald-600';
  return (
    <div className={`fixed bottom-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-xl font-medium z-[100] animate-bounce`}>
      {message}
    </div>
  );
};

// Componente do Card de Filme
const MovieCard = ({ movie, onClick, userRating }) => {
  if (!movie.poster_path) return null;
  
  return (
    <div 
      onClick={() => onClick(movie.id)}
      className="group relative cursor-pointer rounded-xl overflow-hidden shadow-lg transition-transform hover:scale-105 border border-slate-800 bg-slate-800 aspect-[2/3]"
    >
      <img 
        src={`${IMG_URL}${movie.poster_path}`} 
        alt={movie.title} 
        className="w-full h-full object-cover"
        loading="lazy"
      />
      {userRating && (
        <div className="absolute top-2 right-2 bg-rose-600 text-white text-xs font-bold px-2 py-1 rounded-md z-10 shadow flex items-center gap-1">
          <Star size={12} className="fill-white" /> {userRating}
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
        <h3 className="text-white font-bold text-sm leading-tight">{movie.title}</h3>
      </div>
    </div>
  );
};

// Componente de Autenticação
const AuthScreen = ({ showToast }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supabase) {
      showToast('Configure as chaves do Supabase no arquivo .env!', 'error');
      return;
    }
    
    setLoading(true);

    try {
      if (isRegister && password.length < 6) {
        showToast('A senha deve ter pelo menos 6 caracteres.', 'error');
        setLoading(false);
        return;
      }

      if (isRegister) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } }
        });
        if (error) throw error;
        showToast('Conta criada com sucesso! Você já pode entrar.', 'success');
        setIsRegister(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      let mensagemErro = 'Ocorreu um erro. Tente novamente.';

      if (isRegister) {
        if (error.status === 422) {
          mensagemErro = 'Este e-mail já está cadastrado.';
        } else {
          mensagemErro = 'Erro ao criar conta. Verifique os dados.';
        }
      } else {
        mensagemErro = 'E-mail ou senha incorretos.';
      }

      showToast(mensagemErro, 'error');
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
          
          <button type="submit" disabled={loading} className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex justify-center items-center mt-6 disabled:opacity-50 gap-2">
            {loading ? 'Processando...' : (isRegister ? 'Criar Conta' : <>Entrar <Play size={16} className="fill-white" /></>)}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400 mt-6">
          {isRegister ? 'Já tem uma conta?' : 'Novo por aqui?'} 
          <button type="button" onClick={() => setIsRegister(!isRegister)} className="text-rose-500 hover:underline font-medium ml-1">
            {isRegister ? 'Entrar agora' : 'Criar conta'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default function App() {
  const [session, setSession] = useState(null);
  const [currentView, setCurrentView] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Controle de Admin pelo Banco de Dados
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Toast System
  const [toastMsg, setToastMsg] = useState({ text: '', type: 'success' });
  const showToast = (text, type = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg({ text: '', type: 'success' }), 4000);
  };
  
  // Dados do TMDB
  const [movies, setMovies] = useState([]);
  const [aiMovies, setAiMovies] = useState([]);
  const [page, setPage] = useState(1);
  const [genreFilter, setGenreFilter] = useState('');
  const [isLoadingMovies, setIsLoadingMovies] = useState(false);
  
  // Dados do Modal
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Dados do Supabase
  const [watchlist, setWatchlist] = useState([]);
  const [diary, setDiary] = useState([]);
  
  // Estados do Formulário do Diário no Modal
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [platform, setPlatform] = useState('');
  const [dateWatched, setDateWatched] = useState(new Date().toISOString().split('T')[0]);

  // ================= NOVOS ESTADOS: CRUD DE SALAS ================= //
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomMovies, setRoomMovies] = useState([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [joinRoomCode, setJoinRoomCode] = useState(''); // Estado para o código da sala
  const [newMovieTitle, setNewMovieTitle] = useState('');

  useEffect(() => {
    if (!supabase) return;
    
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user?.id || !supabase) return;
    
    const fetchUserData = async () => {
      // Verifica Admin
      const { data: roleData } = await supabase.from('user_roles').select('is_admin').eq('user_id', session.user.id).single();
      if (roleData && roleData.is_admin) setIsAdmin(true);

      // Busca Watchlist e Diário
      const { data: wData } = await supabase.from('watchlist').select('*').eq('user_id', session.user.id);
      if (wData) setWatchlist(wData);
      
      const { data: dData } = await supabase.from('diary').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
      if (dData) setDiary(dData);
    };
    
    fetchUserData();
  }, [session]);

  useEffect(() => {
    if (session && currentView === 'home') loadMovies(1, true);
    if (session && currentView === 'ai') loadAIRecommendations();
    // Novo Efeito para buscar as salas
    if (session && currentView === 'rooms') fetchRooms();
  }, [session, currentView, genreFilter]);

  const loadMovies = async (pageNum, reset = false) => {
    setIsLoadingMovies(true);
    let url = genreFilter === '' 
      ? `${BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=pt-BR&page=${pageNum}`
      : `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=pt-BR&page=${pageNum}&with_genres=${genreFilter}`;
    
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (reset) setMovies(data.results);
      else setMovies(prev => [...prev, ...data.results]);
      setPage(pageNum);
    } catch (e) { console.error(e); }
    setIsLoadingMovies(false);
  };

  const loadAIRecommendations = async () => {
    // Pega o último filme que o usuário deu nota 4 ou 5
    const likedMovies = diary.filter(d => d.rating >= 4);
    if (likedMovies.length === 0) {
      setAiMovies([]);
      return;
    }
    
    const lastLikedTmdbId = likedMovies[0].tmdb_id;
    try {
      const res = await fetch(`${BASE_URL}/movie/${lastLikedTmdbId}/recommendations?api_key=${TMDB_API_KEY}&language=pt-BR`);
      const data = await res.json();
      setAiMovies(data.results.slice(0, 10)); // Pega os 10 primeiros
    } catch (e) { console.error(e); }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setCurrentView('search');
    setIsLoadingMovies(true);
    try {
      const res = await fetch(`${BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&language=pt-BR&query=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setMovies(data.results || []);
    } catch (e) { console.error(e); }
    setIsLoadingMovies(false);
  };

  const openModal = async (id) => {
    setSelectedMovie(null);
    setIsModalOpen(true);
    
    const existingEntry = diary.find(d => d.tmdb_id === id.toString());
    setRating(existingEntry ? existingEntry.rating : 0);
    setReview(existingEntry?.review || '');
    setPlatform(existingEntry?.platform || '');
    setDateWatched(existingEntry?.date_watched || new Date().toISOString().split('T')[0]);

    try {
      const res = await fetch(`${BASE_URL}/movie/${id}?api_key=${TMDB_API_KEY}&language=pt-BR&append_to_response=videos,credits,watch/providers`);
      setSelectedMovie(await res.json());
    } catch (e) { console.error(e); }
  };

  const toggleWatchlist = async () => {
    if (!selectedMovie || !session || !supabase) return;
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
    } catch (e) { showToast('Erro ao atualizar lista', 'error'); }
  };

  const saveToDiary = async () => {
    if (!selectedMovie || !session || !supabase) return;
    if (rating === 0) { showToast('Por favor, selecione uma nota (estrelas).', 'error'); return; }
    
    const movieId = selectedMovie.id.toString();
    const director = selectedMovie.credits?.crew?.find(c => c.job === 'Director')?.name || 'N/A';
    const actors = selectedMovie.credits?.cast?.slice(0, 3).map(a => a.name).join(', ') || 'N/A';

    const newDiaryEntry = {
      user_id: session.user.id,
      tmdb_id: movieId,
      title: selectedMovie.title,
      poster_path: selectedMovie.poster_path,
      year: selectedMovie.release_date?.split('-')[0] || '',
      director, actors, rating, review, platform,
      date_watched: dateWatched
    };

    try {
      await supabase.from('diary').upsert([newDiaryEntry]);
      setDiary([newDiaryEntry, ...diary.filter(d => d.tmdb_id !== movieId)]);
      showToast('Salvo no seu diário com sucesso!');
    } catch (e) { showToast('Erro ao salvar', 'error'); }
  };

  // ================= CRUD DE SALAS ================= //
  const fetchRooms = async () => {
    const { data } = await supabase.from('rooms').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
    if (data) setRooms(data);
  };

  const createRoom = async () => {
    if (!newRoomName.trim()) return showToast('Digite um nome para a sala', 'error');
    // CREATE da Sala
    const { data, error } = await supabase.from('rooms').insert([{ name: newRoomName, user_id: session.user.id }]).select();
    if (!error && data) {
      setRooms([data[0], ...rooms]);
      setNewRoomName('');
      showToast('Sala criada com sucesso!');
      openRoom(data[0]); // Abre a sala automaticamente após criar
    } else {
      showToast('Erro ao criar sala.', 'error');
    }
  };

  const joinRoom = async () => {
    if (!joinRoomCode.trim()) return showToast('Digite o código da sala', 'error');
    
    // READ da Sala (buscando pelo ID que o usuário digitou)
    const { data, error } = await supabase.from('rooms').select('*').eq('id', joinRoomCode).single();
    
    if (data) {
        setJoinRoomCode('');
        openRoom(data); // Abre a sala encontrada
    } else {
        showToast('Código de sala inválido ou sala não existe.', 'error');
    }
  }

  const updateRoom = async (id, currentName) => {
    const newName = prompt('Novo nome da sala:', currentName);
    if (!newName || newName === currentName) return;
    
    // UPDATE da Sala
    const { error } = await supabase.from('rooms').update({ name: newName }).eq('id', id);
    if (!error) {
      setRooms(rooms.map(r => r.id === id ? { ...r, name: newName } : r));
      if(selectedRoom?.id === id) setSelectedRoom({...selectedRoom, name: newName});
      showToast('Sala atualizada!');
    }
  };

  const deleteRoom = async (id) => {
    if (!window.confirm('Excluir esta sala e todos os filmes nela?')) return;
    
    // DELETE da Sala (e os filmes sumirão em cascata se o BD estiver configurado assim)
    const { error } = await supabase.from('rooms').delete().eq('id', id);
    if (!error) {
      setRooms(rooms.filter(r => r.id !== id));
      if (selectedRoom?.id === id) setSelectedRoom(null);
      showToast('Sala excluída!');
    }
  };

  // ================= CRUD DE FILMES DA SALA ================= //
  const fetchRoomMovies = async (roomId) => {
    // READ dos Filmes da Sala
    const { data } = await supabase.from('room_movies').select('*').eq('room_id', roomId).order('created_at', { ascending: false });
    if (data) setRoomMovies(data);
  };

  const openRoom = (room) => {
    setSelectedRoom(room);
    fetchRoomMovies(room.id);
  };

  const addMovieToRoom = async () => {
    if (!newMovieTitle.trim() || !selectedRoom) return;
    
    // CREATE do Filme na Sala
    const { data, error } = await supabase.from('room_movies').insert([{ room_id: selectedRoom.id, title: newMovieTitle }]).select();
    if (!error && data) {
      setRoomMovies([data[0], ...roomMovies]);
      setNewMovieTitle('');
      showToast('Filme adicionado à sala!');
    } else {
        showToast('Erro ao adicionar filme.', 'error');
    }
  };

  const updateMovieRating = async (id, currentRating) => {
    const newRating = parseInt(prompt('Nova nota (1 a 5):', currentRating));
    if (!newRating || newRating < 1 || newRating > 5) return showToast('Nota inválida', 'error');
    
    // UPDATE da nota do Filme na Sala
    const { error } = await supabase.from('room_movies').update({ rating: newRating }).eq('id', id);
    if (!error) {
      setRoomMovies(roomMovies.map(m => m.id === id ? { ...m, rating: newRating } : m));
      showToast('Nota atualizada!');
    }
  };

  const deleteRoomMovie = async (id) => {
    // DELETE do Filme na Sala
    const { error } = await supabase.from('room_movies').delete().eq('id', id);
    if (!error) {
      setRoomMovies(roomMovies.filter(m => m.id !== id));
      showToast('Filme removido da sala!');
    }
  };

  if (!session) return (
    <>
      <AuthScreen showToast={showToast} />
      <Toast message={toastMsg.text} type={toastMsg.type} />
    </>
  );

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-200">
      <Toast message={toastMsg.text} type={toastMsg.type} />
      
      {/* NAVBAR */}
      <nav className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div onClick={() => setCurrentView('home')} className="text-2xl font-extrabold text-rose-600 cursor-pointer tracking-tighter">
            WatchTime.
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 md:gap-6 text-sm font-medium text-slate-300">
            <button onClick={() => setCurrentView('home')} className={`hover:text-white transition-colors ${currentView==='home'?'text-rose-500':''}`}>Catálogo</button>
            <button onClick={() => setCurrentView('rooms')} className={`hover:text-white transition-colors flex items-center gap-1.5 ${currentView==='rooms'?'text-rose-500':''}`}>
              <Users size={16} className={currentView==='rooms'?'text-rose-500':''} /> Salas
            </button>
            <button onClick={() => setCurrentView('ai')} className={`hover:text-white transition-colors flex items-center gap-1.5 ${currentView==='ai'?'text-rose-500':''}`}>
              <Sparkles size={16} className={currentView==='ai'?'text-rose-500':''} /> IA
            </button>
            <button onClick={() => setCurrentView('profile')} className={`hover:text-white transition-colors flex items-center gap-1.5 ${currentView==='profile'?'text-rose-500':''}`}>
              <User size={16} /> Perfil
            </button>
            
            {isAdmin && (
              <button onClick={() => setCurrentView('admin')} className={`hover:text-white flex items-center gap-1.5 ${currentView==='admin'?'text-yellow-500':'text-yellow-600'}`}>
                <Shield size={16} /> Admin
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <form onSubmit={handleSearch} className="relative flex-1 md:w-64">
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar filmes..." className="w-full bg-slate-950 border border-slate-800 rounded-full py-1.5 px-4 pr-10 text-sm text-white focus:outline-none focus:border-rose-600"/>
              <button type="submit" className="absolute right-3 top-1.5 text-slate-500 hover:text-white"><Search size={16} /></button>
            </form>
            <button onClick={() => supabase.auth.signOut()} className="text-sm text-slate-400 hover:text-rose-500 flex items-center gap-2" title="Sair">
               Sair <LogOut size={16} />
            </button>
          </div>
        </div>
      </nav>

      <main className="pb-12 max-w-7xl mx-auto p-4 md:p-6">
        
        {/* VIEW: HOME & BUSCA */}
        {(currentView === 'home' || currentView === 'search') && (
          <div className="animate-in fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
              <div>
                <h1 className="text-3xl font-bold mb-2 text-white">
                  {currentView === 'home' ? 'Explorar Catálogo' : `Resultados para "${searchQuery}"`}
                </h1>
                <p className="text-slate-400">Descubra novos títulos e adicione ao seu diário.</p>
              </div>
              
              {currentView === 'home' && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  <button onClick={()=>setGenreFilter('')} className={`px-4 py-1.5 rounded-full text-sm font-bold shrink-0 ${genreFilter===''?'bg-rose-600 text-white':'bg-slate-800 text-slate-300'}`}>Todos</button>
                  <button onClick={()=>setGenreFilter('28')} className={`px-4 py-1.5 rounded-full text-sm font-bold shrink-0 ${genreFilter==='28'?'bg-rose-600 text-white':'bg-slate-800 text-slate-300 border border-slate-700'}`}>Ação</button>
                  <button onClick={()=>setGenreFilter('35')} className={`px-4 py-1.5 rounded-full text-sm font-bold shrink-0 ${genreFilter==='35'?'bg-rose-600 text-white':'bg-slate-800 text-slate-300 border border-slate-700'}`}>Comédia</button>
                  <button onClick={()=>setGenreFilter('27')} className={`px-4 py-1.5 rounded-full text-sm font-bold shrink-0 ${genreFilter==='27'?'bg-rose-600 text-white':'bg-slate-800 text-slate-300 border border-slate-700'}`}>Terror</button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
              {movies.map(movie => {
                const ratingBadge = diary.find(d => d.tmdb_id === movie.id.toString())?.rating;
                return <MovieCard key={movie.id} movie={movie} onClick={openModal} userRating={ratingBadge} />;
              })}
            </div>
            
            {currentView === 'home' && (
              <div className="text-center mt-10">
                <button 
                  onClick={() => loadMovies(page + 1)} 
                  disabled={isLoadingMovies}
                  className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 text-white font-bold py-3 px-8 rounded-full transition-all"
                >
                  {isLoadingMovies ? 'Carregando...' : 'Carregar Mais'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* VIEW: IA SUGGESTIONS */}
        {currentView === 'ai' && (
          <div className="animate-in fade-in">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3 text-white">
              <Sparkles className="text-rose-600" /> Sugestões Baseadas no seu Gosto
            </h1>
            <p className="text-slate-400 mb-8">Nossa inteligência analisa os filmes que você deu nota 4 ou 5 no seu diário.</p>
            
            {aiMovies.length === 0 ? (
              <div className="text-center py-20 bg-slate-900 rounded-xl border border-slate-800">
                <Sparkles size={48} className="text-slate-600 mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2 text-white">Sem dados suficientes</h2>
                <p className="text-slate-400 max-w-md mx-auto">Avalie alguns filmes com notas altas no seu diário pessoal para recebermos o padrão do seu gosto.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                {aiMovies.map(movie => <MovieCard key={movie.id} movie={movie} onClick={openModal} />)}
              </div>
            )}
          </div>
        )}

        {/* VIEW: SALAS (CRUD RELACIONAL) */}
        {currentView === 'rooms' && (
          <div className="animate-in fade-in max-w-4xl mx-auto">
            
            {!selectedRoom ? (
               <>
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-3 text-white">
                  <Users className="text-rose-600" /> Salas de Filmes
                </h1>
                <p className="text-slate-400 mb-8">Crie um diário compartilhado com seu parceiro(a) ou amigos para avaliarem filmes juntos.</p>
                
                {/* O Design Original Preservado */}
                <div className="flex flex-col md:flex-row gap-8 mb-8">
                  
                  {/* Bloco: Criar Nova Sala */}
                  <div className="flex-1 bg-slate-900 p-8 rounded-2xl border border-slate-800 text-center">
                    <div className="w-16 h-16 bg-rose-600/20 text-rose-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-4 font-bold">+</div>
                    <h2 className="text-xl font-bold mb-2 text-white">Criar Nova Sala</h2>
                    <p className="text-slate-400 text-sm mb-6">Comece uma nova sala para avaliar filmes com seus amigos.</p>
                    <input 
                       type="text" 
                       value={newRoomName} 
                       onChange={(e) => setNewRoomName(e.target.value)} 
                       placeholder="Ex: Filmes do Casal" 
                       className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white mb-4 text-center focus:border-rose-600 focus:outline-none"
                    />
                    <button 
                       onClick={createRoom} 
                       className="w-full bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors font-bold py-2 px-4 rounded-lg"
                    >
                       Criar Sala
                    </button>
                  </div>
                  
                  {/* Bloco: Entrar com Código */}
                  <div className="flex-1 bg-slate-900 p-8 rounded-2xl border border-slate-800 text-center">
                    <div className="w-16 h-16 bg-slate-800 text-slate-400 rounded-full flex items-center justify-center text-2xl mx-auto mb-4"><Users size={24}/></div>
                    <h2 className="text-xl font-bold mb-2 text-white">Entrar com Código</h2>
                    <p className="text-slate-400 text-sm mb-6">Você recebeu um código? Digite abaixo para entrar na sala.</p>
                    <input 
                       type="text" 
                       value={joinRoomCode}
                       onChange={(e) => setJoinRoomCode(e.target.value)}
                       placeholder="ID da Sala (UUID)" 
                       className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white mb-4 text-center focus:border-rose-600 focus:outline-none"
                    />
                    <button 
                       onClick={joinRoom}
                       className="w-full bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors font-bold py-2 px-4 rounded-lg"
                    >
                       Entrar na Sala
                    </button>
                  </div>
                </div>

                {/* Lista de Salas Criadas pelo Usuário (Para ele poder gerenciar as salas dele) */}
                <h3 className="text-xl font-bold mb-4 text-white border-b border-slate-800 pb-2">Minhas Salas (Gerenciamento)</h3>
                <div className="space-y-3">
                  {rooms.length === 0 ? <p className="text-slate-500 text-center py-4 bg-slate-900 rounded-lg border border-slate-800">Você ainda não criou nenhuma sala.</p> : rooms.map(room => (
                    <div key={room.id} className="flex flex-col sm:flex-row justify-between sm:items-center bg-slate-900 p-4 rounded-xl border border-slate-800 gap-4">
                      <div>
                         <h3 className="font-bold text-white text-lg cursor-pointer hover:text-rose-500" onClick={() => openRoom(room)}>{room.name}</h3>
                         <span className="text-xs text-slate-500 flex items-center gap-1 mt-1"><Key size={12}/> Código: {room.id}</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => updateRoom(room.id, room.name)} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Editar</button>
                        <button onClick={() => deleteRoom(room.id)} className="bg-rose-900/30 hover:bg-rose-600 border border-rose-900/50 text-rose-500 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Excluir</button>
                      </div>
                    </div>
                  ))}
                </div>
               </>
            ) : (
              // TELA DA SALA ABERTA (Detalhes da Sala e Lista de Filmes)
              <div className="bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-800 relative shadow-2xl">
                <button onClick={() => setSelectedRoom(null)} className="absolute top-6 right-6 text-slate-400 hover:text-white bg-slate-800 px-3 py-1 rounded-full text-sm flex items-center gap-1"><X size={14}/> Fechar Sala</button>
                
                <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-rose-500 flex items-center gap-2"><Users size={24}/> {selectedRoom.name}</h2>
                <p className="text-slate-400 text-sm mb-8 flex items-center gap-2"><Key size={14}/> Código para convidar amigos: <span className="text-white font-mono bg-slate-950 px-2 py-1 rounded">{selectedRoom.id}</span></p>
                
                <div className="flex flex-col sm:flex-row gap-4 mb-8 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <input 
                     type="text" 
                     value={newMovieTitle} 
                     onChange={(e) => setNewMovieTitle(e.target.value)} 
                     placeholder="Digite o nome de um filme para adicionar..." 
                     className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-rose-600" 
                  />
                  <button 
                     onClick={addMovieToRoom} 
                     className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-6 rounded-lg transition-colors whitespace-nowrap"
                  >
                     + Adicionar Filme
                  </button>
                </div>

                <div className="space-y-3">
                  {roomMovies.length === 0 ? (
                     <div className="text-center py-10 bg-slate-950 rounded-xl border border-slate-800 border-dashed">
                        <Clapperboard size={32} className="text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400">Nenhum filme foi adicionado nesta sala ainda.</p>
                     </div>
                  ) : roomMovies.map(movie => (
                    <div key={movie.id} className="flex flex-col sm:flex-row justify-between sm:items-center bg-slate-950 p-4 rounded-xl border border-slate-800 gap-4">
                      <div>
                        <h4 className="font-bold text-white text-lg">{movie.title}</h4>
                        <span className="text-sm text-yellow-500 flex items-center gap-1 mt-1"><Star size={14} className="fill-yellow-500"/> Nota da Sala: {movie.rating || 'Ainda não avaliado'}</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => updateMovieRating(movie.id, movie.rating)} className="bg-slate-800 hover:bg-yellow-600/20 hover:text-yellow-500 border border-slate-700 hover:border-yellow-600/50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Avaliar Filme</button>
                        <button onClick={() => deleteRoomMovie(movie.id)} className="bg-slate-800 hover:bg-rose-900/30 border border-slate-700 hover:border-rose-900/50 text-slate-400 hover:text-rose-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors">Remover</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW: PERFIL */}
        {currentView === 'profile' && (
          <div className="animate-in fade-in">
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 mb-8 flex flex-col md:flex-row items-center gap-6 shadow-lg">
              <div className="w-20 h-20 bg-rose-600 rounded-full flex items-center justify-center text-3xl font-extrabold text-white">
                {session.user.user_metadata?.full_name?.charAt(0) || session.user.email.charAt(0).toUpperCase()}
              </div>
              <div className="text-center md:text-left flex-1">
                <h1 className="text-3xl font-bold mb-1 text-white">{session.user.user_metadata?.full_name || 'Usuário'}</h1>
                <p className="text-slate-400 mb-6">{session.user.email}</p>
                <div className="flex justify-center md:justify-start gap-8">
                  <div><span className="text-2xl font-black text-white">{diary.length}</span> <span className="text-xs text-slate-400 uppercase">Assistidos</span></div>
                  <div><span className="text-2xl font-black text-white">{watchlist.length}</span> <span className="text-xs text-slate-400 uppercase">Na Lista</span></div>
                </div>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
              <div className="w-full lg:w-1/3">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white"><Bookmark className="text-rose-500" /> Para ver depois</h2>
                {watchlist.length === 0 ? (
                  <p className="text-sm text-slate-500 bg-slate-900 p-4 rounded-lg">Sua lista está vazia.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {watchlist.map(m => <MovieCard key={m.tmdb_id} movie={{...m, id: m.tmdb_id}} onClick={openModal} />)}
                  </div>
                )}
              </div>

              <div className="w-full lg:w-2/3">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white"><Clapperboard className="text-rose-500" /> Diário Histórico</h2>
                {diary.length === 0 ? (
                  <p className="text-sm text-slate-500 bg-slate-900 p-8 rounded-lg text-center">Nenhum filme avaliado ainda.</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {diary.map(entry => (
                      <div key={entry.tmdb_id} onClick={() => openModal(entry.tmdb_id)} className="flex bg-slate-900 rounded-xl overflow-hidden cursor-pointer hover:bg-slate-800 transition border border-slate-800 shadow">
                        <img src={`${IMG_URL}${entry.poster_path}`} className="w-24 md:w-32 object-cover border-r border-slate-800" />
                        <div className="p-4 flex-1 flex flex-col justify-center">
                          <h4 className="font-bold text-lg text-white">{entry.title} <span className="text-sm text-slate-400">({entry.year})</span></h4>
                          <p className="text-xs text-slate-400 mt-1 mb-2">Dirigido por {entry.director} • Com {entry.actors}</p>
                          <div className="flex items-center gap-3 mb-2">
                            <div className="bg-rose-600 text-white text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1"><Star size={10} className="fill-white"/> {entry.rating}</div>
                            <span className="text-xs text-slate-400 flex items-center gap-1"><Calendar size={12} /> {entry.date_watched.split('-').reverse().join('/')}</span>
                            {entry.platform && <span className="text-xs text-slate-400 flex items-center gap-1 border-l border-slate-700 pl-3"><Tv size={12} /> {entry.platform}</span>}
                          </div>
                          {entry.review && <p className="text-sm text-slate-300 italic border-l-2 border-rose-600 pl-3 mt-1 line-clamp-2">"{entry.review}"</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW: ADMIN */}
        {currentView === 'admin' && (
          <div className="animate-in fade-in max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold mb-2 text-white flex items-center gap-2"><Shield className="text-yellow-500"/> Painel Administrativo</h1>
            <p className="text-slate-400 mb-8">Gerencie inserções manuais no banco de dados.</p>
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
               <p className="mb-4">Funcionalidade restrita. Em breve: Tabela CRUD para inserção manual de filmes independentes.</p>
               <button className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-bold">Adicionar Título Manual</button>
            </div>
          </div>
        )}
      </main>

      {/* MODAL DE DETALHES DO FILME */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 md:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-6xl h-[95vh] md:h-[90vh] rounded-2xl overflow-hidden relative shadow-2xl animate-in zoom-in-95 flex flex-col md:flex-row">
            
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 bg-black/60 hover:bg-rose-600 text-white p-2 rounded-full transition z-20">
              <X size={20} />
            </button>

            {!selectedMovie ? (
              <div className="p-12 w-full text-center text-slate-400 flex items-center justify-center">Carregando detalhes...</div>
            ) : (
              <>
                {/* Lado Esquerdo Modal: Poster e Diário */}
                <div className="w-full md:w-1/3 lg:w-1/4 bg-slate-950 p-6 flex flex-col items-center border-r border-slate-800 overflow-y-auto shrink-0">
                  <img src={`${IMG_URL}${selectedMovie.poster_path}`} className="w-32 md:w-full rounded-lg shadow-lg mb-6 object-cover hidden md:block" />
                  
                  <button onClick={toggleWatchlist} className={`mb-6 w-full font-medium py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm border ${watchlist.some(w => w.tmdb_id === selectedMovie.id.toString()) ? 'bg-slate-900 border-rose-600 text-rose-500' : 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'}`}>
                    <Bookmark size={18} className={watchlist.some(w => w.tmdb_id === selectedMovie.id.toString()) ? "fill-rose-500" : ""} /> 
                    {watchlist.some(w => w.tmdb_id === selectedMovie.id.toString()) ? 'Na Lista Pessoal' : 'Salvar na Lista'}
                  </button>

                  <div className="w-full bg-slate-900 p-4 rounded-xl border border-slate-800">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 text-center border-b border-slate-700 pb-2">Registrar no Diário</h3>
                    
                    <div className="mb-3">
                      <label className="block text-xs text-slate-400 mb-1 text-center">Sua Nota</label>
                      <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button key={star} type="button" onClick={() => setRating(star)} className="focus:outline-none">
                            <Star size={28} className={star <= rating ? 'fill-yellow-500 text-yellow-500' : 'text-slate-600'} />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="block text-xs text-slate-400 mb-1">Data que assistiu</label>
                      <input type="date" value={dateWatched} onChange={(e) => setDateWatched(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-rose-600" />
                    </div>

                    <div className="mb-3">
                      <label className="block text-xs text-slate-400 mb-1">Onde assistiu?</label>
                      <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-rose-600">
                        <option value="">Selecione...</option>
                        <option value="Cinema">Cinema</option>
                        <option value="Netflix">Netflix</option>
                        <option value="Prime Video">Prime Video</option>
                        <option value="Max">Max</option>
                        <option value="Disney+">Disney+</option>
                        <option value="Mídia Física">Mídia Física / Outro</option>
                      </select>
                    </div>

                    <div className="mb-3">
                      <label className="block text-xs text-slate-400 mb-1">Sua resenha (Opcional)</label>
                      <textarea value={review} onChange={(e) => setReview(e.target.value)} placeholder="O que achou do filme?" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-rose-600 resize-none h-20" />
                    </div>

                    <button onClick={saveToDiary} className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-lg text-sm transition">
                      Salvar Avaliação
                    </button>
                  </div>
                </div>

                {/* Lado Direito Modal: Infos e Trailer */}
                <div className="w-full md:w-2/3 lg:w-3/4 p-6 overflow-y-auto flex flex-col gap-6">
                  <div>
                    <h2 className="text-3xl md:text-5xl font-extrabold mb-2 text-white">{selectedMovie.title}</h2>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300 mb-4">
                      <span className="font-bold">{selectedMovie.release_date?.split('-')[0]}</span>
                      <span>•</span>
                      <span className="bg-slate-800 px-3 py-1 rounded-full border border-slate-700">{selectedMovie.genres?.map(g => g.name).join(', ')}</span>
                      <div className="flex items-center gap-1 ml-auto bg-yellow-500/10 text-yellow-500 px-3 py-1 rounded-full border border-yellow-500/20">
                        <Star size={12} className="fill-yellow-500" /> <span className="font-bold">{selectedMovie.vote_average?.toFixed(1)}</span> TMDB
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-sm bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                      <div><span className="text-slate-500 font-bold">Direção:</span> <span className="text-slate-300">{selectedMovie.credits?.crew?.find(c => c.job === 'Director')?.name || 'N/A'}</span></div>
                      <div><span className="text-slate-500 font-bold">Elenco:</span> <span className="text-slate-300">{selectedMovie.credits?.cast?.slice(0, 3).map(a => a.name).join(', ') || 'N/A'}</span></div>
                      
                      <div className="md:col-span-2 mt-2 pt-2 border-t border-slate-800">
                        <span className="text-slate-500 font-bold">Onde Assistir (Brasil):</span> 
                        <span className="text-emerald-400 font-medium ml-2">
                          {selectedMovie['watch/providers']?.results?.BR?.flatrate 
                            ? selectedMovie['watch/providers'].results.BR.flatrate.map(p => p.provider_name).join(', ') 
                            : 'Não disponível em streaming no momento.'}
                        </span>
                      </div>
                    </div>

                    <p className="text-slate-300 leading-relaxed text-sm md:text-base">{selectedMovie.overview}</p>
                  </div>

                  {/* Trailer */}
                  <div>
                     <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Play size={16} className="text-rose-600" /> Trailer Oficial</h4>
                     <div className="aspect-video w-full rounded-xl overflow-hidden bg-black shadow-inner relative border border-slate-800">
                        {selectedMovie.videos?.results.find(v => v.site === 'YouTube' && v.type === 'Trailer') ? (
                           <iframe 
                             className="w-full h-full absolute inset-0" 
                             src={`https://www.youtube.com/embed/${selectedMovie.videos.results.find(v => v.site === 'YouTube' && v.type === 'Trailer').key}?autoplay=0`} 
                             allowFullScreen>
                           </iframe>
                        ) : (
                           <div className="w-full h-full flex items-center justify-center text-slate-500 bg-slate-900">Trailer indisponível no TMDB.</div>
                        )}
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