"use client";

import { Settings, MapPin, Camera, Edit3, Check, X, LogOut } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { fetchLatestVersionImages, resolveSpotImage } from '@/lib/spots';
import { User } from '@supabase/supabase-js';
import CustomAlert from '@/components/CustomAlert';

interface ProfileSpot {
  id: string;
  image: string;
  type: string;
  number: number;
}

interface DBSpot {
  id: string;
  image_url: string;
  type: string;
  created_at: string;
  user_id: string;
}

const USER_DATA = {
  alias: "Zeto",
  crew: "DHW",
  role: "Miembro Fundador",
  joined: "2024",
  stats: {
    spots: 38,
    likes: 1.2,
    cities: 2
  },
  recentSpots: [
    { id: '1', image: "https://images.unsplash.com/photo-1518002054494-3a6f94352e9d?w=400&q=80", type: "Bomba", number: 1 },
    { id: '2', image: "https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?w=400&q=80", type: "Mural", number: 2 },
    { id: '3', image: "https://images.unsplash.com/photo-1506544777-62cc8d1a1b85?w=400&q=80", type: "Tag", number: 3 },
    { id: '4', image: "https://images.unsplash.com/photo-1518002054494-3a6f94352e9d?w=400&q=80", type: "Throwup", number: 4 },
  ]
};

export default function ProfilePage() {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [mySpots, setMySpots] = useState<ProfileSpot[]>([]);
  const [profileData, setProfileData] = useState({
    alias: '',
    crew: '',
    role: '',
  });
  const [selectedSpot, setSelectedSpot] = useState<ProfileSpot | null>(null);

  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  });

  const showAlert = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    setAlertConfig({ isOpen: true, type, title, message });
  };

  const loadProfileAndSpots = async () => {
      try {
        if (!isSupabaseConfigured) {
          setMySpots(USER_DATA.recentSpots);
          setUser({
            id: 'mock-user-id',
            email: 'demo@dhw.com',
            aud: 'authenticated',
            role: 'authenticated',
            created_at: new Date().toISOString(),
            app_metadata: {},
            user_metadata: {},
          } as User);
          setLoading(false);
          return;
        }

        let user = null;
        try {
          const { data, error } = await supabase.auth.getUser();
          if (error) {
            console.warn('Error en supabase.auth.getUser(), limpiando sesión:', error.message);
            await supabase.auth.signOut().catch(() => {});
          } else {
            user = data.user;
          }
        } catch (userErr) {
          console.error('Error al obtener el usuario:', userErr);
          await supabase.auth.signOut().catch(() => {});
        }

        if (!user) {
          router.push('/login');
          return;
        }
        setUser(user);

        // Cargar perfil
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileData) {
          setProfileData({
            alias: profileData.alias || user.user_metadata?.alias || user.email?.split('@')[0] || 'Miembro',
            crew: profileData.crew || user.user_metadata?.crew || 'DHW',
            role: profileData.role || user.user_metadata?.role || 'Miembro',
          });
          if (profileData.avatar_url) {
            setAvatarUrl(profileData.avatar_url);
          }
        } else {
          setProfileData({
            alias: user.user_metadata?.alias || user.email?.split('@')[0] || 'Miembro',
            crew: user.user_metadata?.crew || 'DHW',
            role: user.user_metadata?.role || 'Miembro',
          });
        }

        // Cargar todos los spots para calcular su número secuencial global
        const { data: allSpotsData } = await supabase
          .from('spots')
          .select('id')
          .order('created_at', { ascending: true });

        const spotNumbersMap: Record<string, number> = {};
        if (allSpotsData) {
          allSpotsData.forEach((spot: any, idx: number) => {
            spotNumbersMap[spot.id] = idx + 1;
          });
        }

        // Cargar spots del usuario
        const { data: spotsData } = await supabase
          .from('spots')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (spotsData && spotsData.length > 0) {
          const spotIds = spotsData.map((s: DBSpot) => s.id);
          const latestImages = await fetchLatestVersionImages(spotIds);

          const mappedSpots = (spotsData as DBSpot[]).map((spot: DBSpot) => ({
            id: spot.id,
            image: resolveSpotImage(spot.image_url, latestImages[spot.id]),
            type: spot.type.charAt(0).toUpperCase() + spot.type.slice(1),
            number: spotNumbersMap[spot.id] || 1
          }));
          setMySpots(mappedSpots);
        } else {
          setMySpots([]);
        }
      } catch (err: any) {
        console.error('Error loading profile or spots, using fallback:', err?.message || err);
        setMySpots(USER_DATA.recentSpots);
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    loadProfileAndSpots();
  }, [router]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadProfileAndSpots();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const handleSave = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          alias: profileData.alias,
          crew: profileData.crew,
          role: profileData.role,
        })
        .eq('id', user.id);

      if (error) throw error;
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : 'Error desconocido';
      showAlert('error', 'Error al Guardar', "Error al guardar cambios de perfil: " + errMsg);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black">
        <span className="w-8 h-8 border-4 border-[var(--color-graffiti-red)] border-t-transparent rounded-full animate-spin"></span>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-8 px-4 pb-24 max-w-md mx-auto">
      {/* Header Actions */}
      <div className="flex justify-end mb-4">
        {isEditing ? (
          <button onClick={() => setIsEditing(false)} className="p-2 text-red-500 hover:text-red-400 transition-colors">
            <X size={24} />
          </button>
        ) : (
          <button onClick={() => setIsEditing(true)} className="p-2 text-gray-400 hover:text-white transition-colors">
            <Settings size={24} />
          </button>
        )}
      </div>

      {/* Profile Info */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative mb-4">
          <div className="w-24 h-24 rounded-full bg-zinc-800 border-2 border-white/20 overflow-hidden flex items-center justify-center font-black text-white text-3xl shadow-[0_0_20px_rgba(255,255,255,0.05)]">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              profileData.alias[0]?.toUpperCase() || '?'
            )}
          </div>
          {isEditing && (
            <label className="absolute bottom-0 right-0 bg-black border border-white/10 p-2 rounded-full text-white hover:text-[var(--color-graffiti-red)] cursor-pointer shadow-lg">
              <Camera size={14} />
              <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                if (e.target.files && e.target.files[0] && user) {
                  const file = e.target.files[0];
                  try {
                    const fileExt = file.name.split('.').pop();
                    const filePath = `avatars/${user.id}.${fileExt}`;
                    
                    const { error: uploadError } = await supabase.storage
                      .from('spots')
                      .upload(filePath, file, { upsert: true });
                    
                    if (uploadError) throw uploadError;

                    const { data: { publicUrl } } = supabase.storage
                      .from('spots')
                      .getPublicUrl(filePath);

                    const { error: updateError } = await supabase
                      .from('profiles')
                      .update({ avatar_url: publicUrl })
                      .eq('id', user.id);

                    if (updateError) throw updateError;
                    
                    setAvatarUrl(publicUrl);
                  } catch (err) {
                    console.error(err);
                    const errMsg = err instanceof Error ? err.message : 'Error desconocido';
                    showAlert('error', 'Error al Subir', "Error al subir avatar: " + errMsg);
                  }
                }
              }} />
            </label>
          )}
        </div>
        
        {isEditing ? (
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <div>
              <label className="text-xs text-gray-400 font-mono">Alias</label>
              <input 
                type="text" 
                value={profileData.alias}
                onChange={(e) => setProfileData({...profileData, alias: e.target.value})}
                className="w-full bg-zinc-950 border border-white/10 rounded p-2 text-center text-white focus:border-[var(--color-graffiti-red)] outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-mono">Crew</label>
              <input 
                type="text" 
                value={profileData.crew}
                onChange={(e) => setProfileData({...profileData, crew: e.target.value})}
                className="w-full bg-zinc-950 border border-white/10 rounded p-2 text-center text-[var(--color-graffiti-red)] font-extrabold uppercase tracking-widest focus:border-[var(--color-graffiti-red)] outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-mono">Rol</label>
              <input 
                type="text" 
                value={profileData.role}
                onChange={(e) => setProfileData({...profileData, role: e.target.value})}
                className="w-full bg-zinc-950 border border-white/10 rounded p-2 text-center text-gray-300 focus:border-[var(--color-graffiti-red)] outline-none"
              />
            </div>
            <button 
              onClick={handleSave}
              className="mt-2 bg-[var(--color-graffiti-red)] text-white font-extrabold py-2 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-[0_0_15px_rgba(255,30,39,0.3)] cursor-pointer"
            >
              <Check size={16} strokeWidth={3} /> Guardar Cambios
            </button>
            <button 
              onClick={handleLogout}
              className="mt-2 bg-red-950/20 text-red-500 hover:bg-red-950/30 border border-red-500/30 font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <LogOut size={16} /> Cerrar Sesión
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              {profileData.alias} <Edit3 size={14} className="text-gray-500 cursor-pointer hover:text-white" onClick={() => setIsEditing(true)} />
            </h1>
            <p className="text-[var(--color-graffiti-red)] font-mono text-sm tracking-widest uppercase font-extrabold">{profileData.crew} CREW</p>
            <p className="text-xs text-gray-400 mt-1 font-mono">{profileData.role} • {user?.email}</p>
          </>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2 mb-8 text-white">
        <div className="bg-zinc-950 border border-white/5 p-3 rounded-xl text-center shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
          <div className="text-xl font-black text-white">{mySpots.length}</div>
          <div className="text-[10px] text-gray-400 font-mono">Spots</div>
        </div>
        <div className="bg-zinc-950 border border-white/5 p-3 rounded-xl text-center shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
          <div className="text-xl font-black text-white">0</div>
          <div className="text-[10px] text-gray-400 font-mono">Est. Likes</div>
        </div>
        <div className="bg-zinc-950 border border-white/5 p-3 rounded-xl text-center shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
          <div className="text-xl font-black text-white">1</div>
          <div className="text-[10px] text-gray-400 font-mono">Ciudad</div>
        </div>
      </div>

      {/* Archive / Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-extrabold text-lg text-glow uppercase">Tu Archivo</h3>
          <span 
            className="text-xs text-[var(--color-graffiti-chrome)] cursor-pointer hover:underline font-mono"
            onClick={() => showAlert('info', 'Mi Archivo', `Tienes ${mySpots.length} pintas en el registro.`)}
          >
            Ver todos
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {mySpots.map((spot) => (
            <div 
              key={spot.id} 
              onClick={() => setSelectedSpot(spot)}
              className="relative aspect-square rounded-xl overflow-hidden group cursor-pointer border border-white/5 hover:border-[var(--color-graffiti-red)] transition-all shadow-md"
            >
              <Image 
                src={spot.image} 
                alt="Spot" 
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-350"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                <span className="text-[10px] font-mono text-[var(--color-graffiti-red)] font-bold">GRAFFITI #{spot.number}</span>
                <span className="text-xs font-black text-white uppercase">{spot.type}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Spot Detail Modal */}
      {selectedSpot && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={() => setSelectedSpot(null)}>
          <div className="bg-black border border-white/10 rounded-2xl overflow-hidden max-w-sm w-full shadow-[0_0_30px_rgba(255,30,39,0.15)]" onClick={e => e.stopPropagation()}>
            <div className="relative w-full h-80">
              <Image 
                src={selectedSpot.image} 
                alt="Spot detail" 
                fill
                className="object-cover"
              />
              <div className="absolute top-3 left-3 z-10 bg-black/80 backdrop-blur-sm border border-white/10 text-xs font-mono font-bold px-2.5 py-0.5 rounded text-[var(--color-graffiti-red)]">
                GRAFFITI #{selectedSpot.number}
              </div>
              <button 
                onClick={() => setSelectedSpot(null)}
                className="absolute top-3 right-3 bg-black/50 p-2 rounded-full text-white hover:text-[var(--color-graffiti-red)] backdrop-blur-md transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 text-white">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-black text-white uppercase tracking-wide">{selectedSpot.type}</h3>
                <span className="bg-white/10 border border-white/5 text-[var(--color-graffiti-chrome)] text-xs font-mono font-bold px-2 py-0.5 rounded">2026</span>
              </div>
              <p className="text-xs text-gray-400 flex items-center gap-1 mb-4 font-mono"><MapPin size={12} /> Spot Localizado</p>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setSelectedSpot(null);
                    router.push(`/?spot=${selectedSpot.id}`);
                  }}
                  className="flex-1 bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-white py-2 rounded-lg text-xs font-extrabold tracking-wider transition-colors cursor-pointer uppercase font-mono"
                >
                  Ver en Mapa
                </button>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.origin + '/?spot=' + selectedSpot.id);
                    showAlert('success', 'Enlace Copiado', "¡Enlace del spot copiado!");
                  }}
                  className="flex-1 bg-[var(--color-graffiti-red)] text-white py-2 rounded-lg text-xs font-extrabold tracking-wider shadow-[0_0_10px_var(--color-graffiti-red)] hover:opacity-90 active:scale-95 transition-all cursor-pointer uppercase font-mono"
                >
                  Compartir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <CustomAlert 
        isOpen={alertConfig.isOpen}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </main>
  );
}
