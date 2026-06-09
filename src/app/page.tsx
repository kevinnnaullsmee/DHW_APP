"use client";

import { useState, useEffect } from 'react';
import Map, { Marker, Popup } from 'react-map-gl/maplibre';
import Image from 'next/image';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Search, Filter } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import SpotPopup from '@/components/SpotPopup';

// Token no es necesario para Maplibre con estilos públicos
const MOCK_SPOTS = [
  { id: '1', lat: 4.6097, lng: -74.0817, title: "Bomba Centro", author: "Zeto", type: "bomba", image: "https://images.unsplash.com/photo-1518002054494-3a6f94352e9d?w=400&q=80", number: 1 },
  { id: '2', lat: 4.6110, lng: -74.0850, title: "Mural 45", author: "Kros", type: "mural", image: "https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?w=400&q=80", number: 2 },
  { id: '3', lat: 4.6050, lng: -74.0790, title: "Tag Rápido", author: "Nox", type: "tag", image: "https://images.unsplash.com/photo-1506544777-62cc8d1a1b85?w=400&q=80", number: 3 },
];

interface Spot {
  id: string;
  lat: number;
  lng: number;
  title: string;
  author: string;
  type: string;
  image: string;
  description?: string;
  number: number;
  user_id?: string;
  created_at?: string;
}

interface DBSpot {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  author: string;
  type: string;
  image_url: string;
  description?: string;
  created_at: string;
  user_id?: string;
}

export default function MapPage() {
  const router = useRouter();
  const [spots, setSpots] = useState<Spot[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [viewState, setViewState] = useState({
    longitude: -74.0817,
    latitude: 4.6097,
    zoom: 13
  });

  useEffect(() => {
    const fetchSpots = async () => {
      try {
        // SIEMPRE verificar autenticación primero
        if (!isSupabaseConfigured) {
          console.warn('Supabase no está configurado. Redirigiendo a login...');
          router.push('/login');
          return;
        }

        // Verificar si el usuario está autenticado
        let session = null;
        try {
          const { data, error } = await supabase.auth.getSession();
          if (error) {
            console.warn('Error en la sesión de Supabase:', error.message);
            await supabase.auth.signOut().catch(() => {});
            router.push('/login');
            return;
          }
          session = data.session;
          setCurrentUserId(session?.user.id);
        } catch (sessionErr) {
          console.error('Error al obtener la sesión:', sessionErr);
          router.push('/login');
          return;
        }

        if (!session) {
          console.warn('No hay sesión activa. Redirigiendo a login...');
          router.push('/login');
          return;
        }

        const { data, error } = await supabase
          .from('spots')
          .select('*')
          .order('created_at', { ascending: true }); // Orden ascendente para numerar desde el más antiguo

        if (error) throw error;

        if (data && data.length > 0) {
          const mappedSpots: Spot[] = (data as DBSpot[]).map((spot: DBSpot, index: number) => ({
            id: spot.id,
            lat: spot.latitude,
            lng: spot.longitude,
            title: spot.title,
            author: spot.author,
            type: spot.type,
            image: spot.image_url,
            description: spot.description,
            number: index + 1,
            user_id: spot.user_id,
            created_at: spot.created_at
          }));
          setSpots(mappedSpots);
          handleInitialQuerySelection(mappedSpots);
        } else {
          // Si no hay datos, usar mock data
          setSpots(MOCK_SPOTS);
          handleInitialQuerySelection(MOCK_SPOTS);
        }
      } catch (err: any) {
        console.error('Error fetching spots from Supabase, loading fallback:', err?.message || err);
        setSpots(MOCK_SPOTS);
        handleInitialQuerySelection(MOCK_SPOTS);
      } finally {
        setLoading(false);
      }
    };

    const handleInitialQuerySelection = (availableSpots: Spot[]) => {
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        const spotId = searchParams.get('spot');
        if (spotId) {
          const spot = availableSpots.find(s => String(s.id) === String(spotId));
          if (spot) {
            setTimeout(() => {
              setViewState({
                longitude: spot.lng,
                latitude: spot.lat,
                zoom: 16
              });
              setSelectedSpot(spot);
            }, 0);
          }
        }
      }
    };

    fetchSpots();
  }, [router]);

  // Efecto para centrar y hacer zoom en el mapa cuando se realiza una búsqueda
  useEffect(() => {
    const query = searchQuery.trim().toLowerCase();
    if (query !== '') {
      const matched = spots.find(spot => {
        const title = (spot.title || '').toLowerCase();
        const author = (spot.author || '').toLowerCase();
        const type = (spot.type || '').toLowerCase();
        const description = (spot.description || '').toLowerCase();
        return title.includes(query) || author.includes(query) || type.includes(query) || description.includes(query);
      });
      if (matched) {
        setViewState(prev => ({
          ...prev,
          longitude: matched.lng,
          latitude: matched.lat,
          zoom: 15
        }));
      }
    }
  }, [searchQuery, spots]);

  const filteredSpots = spots.filter(spot => {
    const query = searchQuery.toLowerCase();
    const title = (spot.title || '').toLowerCase();
    const author = (spot.author || '').toLowerCase();
    const type = (spot.type || '').toLowerCase();
    const description = (spot.description || '').toLowerCase();

    return title.includes(query) ||
           author.includes(query) ||
           type.includes(query) ||
           description.includes(query);
  });

  return (
    <main className="relative w-full h-screen">
      {/* Loading Indicator */}
      {loading && (
        <div className="absolute top-24 right-4 z-20 bg-black/80 backdrop-blur-md border border-white/10 p-2 rounded-full shadow-lg">
          <span className="w-5 h-5 block border-2 border-[var(--color-graffiti-red)] border-t-transparent rounded-full animate-spin"></span>
        </div>
      )}

      {/* Search & Filter Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex flex-col gap-2 max-w-md mx-auto">
        <div className="flex justify-between items-center bg-black/90 backdrop-blur-md border border-white/10 px-4 py-2.5 rounded-full shadow-[0_0_15px_rgba(255,30,39,0.2)]">
          <h1 className="text-xs font-bold tracking-widest text-white">
            DHW <span className="text-[var(--color-graffiti-red)] font-extrabold">CREW MAP</span>
          </h1>
          <div className="bg-[var(--color-graffiti-red)] text-white text-[10px] font-mono font-bold px-3 py-0.5 rounded-full shadow-[0_0_8px_var(--color-graffiti-red)]">
            🔥 PINTAS: {spots.length}
          </div>
        </div>
        
        <div className="flex gap-2 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar spot, autor o tipo..."
              className="w-full bg-black/80 backdrop-blur-md border border-white/10 rounded-full py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:border-[var(--color-graffiti-red)] transition-colors text-white placeholder-gray-500 shadow-lg"
            />
          </div>
          <button 
            onClick={() => setSearchQuery('')}
            className="bg-black/80 backdrop-blur-md border border-white/10 p-2.5 rounded-full flex items-center justify-center text-white hover:text-[var(--color-graffiti-red)] transition-colors shadow-lg"
            title="Limpiar búsqueda"
          >
            <Filter size={16} />
          </button>
        </div>
      </div>

      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapStyle="https://tiles.openfreemap.org/styles/dark"
        style={{ width: '100%', height: '100%' }}
      >
        {filteredSpots.map(spot => (
          <Marker
            key={spot.id}
            longitude={spot.lng}
            latitude={spot.lat}
            onClick={e => {
              e.originalEvent.stopPropagation();
              setSelectedSpot(spot);
            }}
          >
            <div className="cursor-pointer transform hover:scale-110 active:scale-95 transition-all">
              <div className="w-8 h-8 rounded-full bg-[var(--color-graffiti-red)] flex items-center justify-center shadow-[0_0_12px_var(--color-graffiti-red)] border-2 border-black">
                <span className="text-white font-extrabold text-xs">{(spot.author || '?')[0].toUpperCase()}</span>
              </div>
            </div>
          </Marker>
        ))}

        {selectedSpot && (
          <Popup
            longitude={selectedSpot.lng}
            latitude={selectedSpot.lat}
            anchor="bottom"
            onClose={() => setSelectedSpot(null)}
            className="custom-popup"
            closeButton={false}
          >
            <SpotPopup 
              spot={selectedSpot} 
              onClose={() => setSelectedSpot(null)}
              currentUserId={currentUserId}
            />
          </Popup>
        )}
      </Map>
    </main>
  );
}
