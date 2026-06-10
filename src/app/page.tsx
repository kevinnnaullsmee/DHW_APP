"use client";

import { Suspense, useState, useEffect, useCallback } from 'react';
import Map, { Marker, Popup } from 'react-map-gl/maplibre';
import Image from 'next/image';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Search, Filter } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import SpotPopup from '@/components/SpotPopup';
import {
  fetchLatestVersionImages,
  findActiveZoneCenter,
  resolveSpotImage,
  type SpotRow,
} from '@/lib/spots';

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

function MapPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [spots, setSpots] = useState<Spot[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [viewState, setViewState] = useState({
    longitude: -74.0817,
    latitude: 4.6097,
    zoom: 13,
  });
  const [hasFocusedActiveZone, setHasFocusedActiveZone] = useState(false);

  const mapDbSpots = useCallback(async (data: SpotRow[]): Promise<Spot[]> => {
    const spotIds = data.map((s) => s.id);
    const latestImages = await fetchLatestVersionImages(spotIds);

    return data.map((spot, index) => ({
      id: spot.id,
      lat: spot.latitude,
      lng: spot.longitude,
      title: spot.title,
      author: spot.author,
      type: spot.type,
      image: resolveSpotImage(spot.image_url, latestImages[spot.id]),
      description: spot.description,
      number: index + 1,
      user_id: spot.user_id,
      created_at: spot.created_at,
    }));
  }, []);

  const fetchSpots = useCallback(async () => {
    try {
      if (!isSupabaseConfigured) {
        console.warn('Supabase no está configurado. Redirigiendo a login...');
        router.push('/login');
        return;
      }

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
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('spots')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const mappedSpots = await mapDbSpots(data as SpotRow[]);
        setSpots(mappedSpots);
        return mappedSpots;
      }

      setSpots(MOCK_SPOTS);
      return MOCK_SPOTS;
    } catch (err: unknown) {
      console.error('Error fetching spots from Supabase, loading fallback:', err);
      setSpots(MOCK_SPOTS);
      return MOCK_SPOTS;
    } finally {
      setLoading(false);
    }
  }, [mapDbSpots, router]);

  useEffect(() => {
    fetchSpots();
  }, [fetchSpots]);

  const focusOnSpot = useCallback((spot: Spot) => {
    setViewState({
      longitude: spot.lng,
      latitude: spot.lat,
      zoom: 16,
    });
    setSelectedSpot(spot);
  }, []);

  const focusOnActiveZone = useCallback((availableSpots: Spot[]) => {
    if (availableSpots.length === 0) return;
    const center = findActiveZoneCenter(availableSpots);
    setViewState({
      longitude: center.longitude,
      latitude: center.latitude,
      zoom: center.zoom,
    });
    setHasFocusedActiveZone(true);
  }, []);

  useEffect(() => {
    if (spots.length === 0 || hasFocusedActiveZone) return;

    const spotId = searchParams.get('spot');
    if (spotId) {
      const spot = spots.find((s) => String(s.id) === String(spotId));
      if (spot) {
        focusOnSpot(spot);
        setHasFocusedActiveZone(true);
        return;
      }
    }

    focusOnActiveZone(spots);
  }, [spots, searchParams, hasFocusedActiveZone, focusOnSpot, focusOnActiveZone]);

  useEffect(() => {
    const spotId = searchParams.get('spot');
    if (!spotId || spots.length === 0) return;

    const spot = spots.find((s) => String(s.id) === String(spotId));
    if (spot) {
      focusOnSpot(spot);
    }
  }, [searchParams, spots, focusOnSpot]);

  useEffect(() => {
    const query = searchQuery.trim().toLowerCase();
    if (query !== '') {
      const matched = spots.find((spot) => {
        const title = (spot.title || '').toLowerCase();
        const author = (spot.author || '').toLowerCase();
        const type = (spot.type || '').toLowerCase();
        const description = (spot.description || '').toLowerCase();
        return (
          title.includes(query) ||
          author.includes(query) ||
          type.includes(query) ||
          description.includes(query)
        );
      });
      if (matched) {
        setViewState((prev) => ({
          ...prev,
          longitude: matched.lng,
          latitude: matched.lat,
          zoom: 15,
        }));
        setSelectedSpot(matched);
      }
    }
  }, [searchQuery, spots]);

  const handleSpotUpdated = async () => {
    const updated = await fetchSpots();
    if (selectedSpot && updated) {
      const refreshed = updated.find((s) => s.id === selectedSpot.id);
      if (refreshed) {
        setSelectedSpot(refreshed);
      } else {
        setSelectedSpot(null);
      }
    }
  };

  const filteredSpots = spots.filter((spot) => {
    const query = searchQuery.toLowerCase();
    const title = (spot.title || '').toLowerCase();
    const author = (spot.author || '').toLowerCase();
    const type = (spot.type || '').toLowerCase();
    const description = (spot.description || '').toLowerCase();

    return (
      title.includes(query) ||
      author.includes(query) ||
      type.includes(query) ||
      description.includes(query)
    );
  });

  return (
    <main className="relative w-full h-screen">
      {loading && (
        <div className="absolute top-24 right-4 z-20 bg-black/80 backdrop-blur-md border border-white/10 p-2 rounded-full shadow-lg">
          <span className="w-5 h-5 block border-2 border-[var(--color-graffiti-red)] border-t-transparent rounded-full animate-spin"></span>
        </div>
      )}

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
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar spot, autor o tipo..."
              className="w-full bg-black/80 backdrop-blur-md border border-white/10 rounded-full py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:border-[var(--color-graffiti-red)] transition-colors text-white placeholder-gray-500 shadow-lg"
            />
          </div>
          <button
            onClick={() => {
              setSearchQuery('');
              focusOnActiveZone(spots);
            }}
            className="bg-black/80 backdrop-blur-md border border-white/10 p-2.5 rounded-full flex items-center justify-center text-white hover:text-[var(--color-graffiti-red)] transition-colors shadow-lg"
            title="Centrar en zona activa"
          >
            <Filter size={16} />
          </button>
        </div>
      </div>

      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        mapStyle="https://tiles.openfreemap.org/styles/dark"
        style={{ width: '100%', height: '100%' }}
      >
        {filteredSpots.map((spot) => (
          <Marker
            key={spot.id}
            longitude={spot.lng}
            latitude={spot.lat}
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setSelectedSpot(spot);
            }}
          >
            <div className="marker-interactive">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-black shadow-[0_0_12px_var(--color-graffiti-red)] bg-[var(--color-graffiti-red)]">
                {spot.image ? (
                  <Image
                    src={spot.image}
                    alt={spot.title}
                    width={40}
                    height={40}
                    className="object-cover w-full h-full"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-white font-extrabold text-xs">
                      {(spot.author || '?')[0].toUpperCase()}
                    </span>
                  </div>
                )}
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
              onUpdated={handleSpotUpdated}
            />
          </Popup>
        )}
      </Map>
    </main>
  );
}

export default function MapPageWrapper() {
  return (
    <Suspense
      fallback={
        <main className="relative w-full h-screen flex items-center justify-center bg-black">
          <span className="w-8 h-8 border-4 border-[var(--color-graffiti-red)] border-t-transparent rounded-full animate-spin"></span>
        </main>
      }
    >
      <MapPage />
    </Suspense>
  );
}
