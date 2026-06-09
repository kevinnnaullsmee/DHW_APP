"use client";

import { ThumbsUp, ThumbsDown, Share2, MapPin } from 'lucide-react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import CustomAlert from '@/components/CustomAlert';

const MOCK_FEED = [
  {
    id: 'mock-1',
    author: "Zeto",
    avatar: "Z",
    type: "BOMBA",
    location: "Centro, Bogotá",
    time: "Hace 2 horas",
    image: "https://images.unsplash.com/photo-1518002054494-3a6f94352e9d?w=800&q=80",
    likes: 0,
    dislikes: 0,
    description: "Cerrando la noche en el centro con la crew. #DHW #BogotaGraffiti",
    number: 3
  },
  {
    id: 'mock-2',
    author: "Kros",
    avatar: "K",
    type: "MURAL",
    location: "Chapinero",
    time: "Hace 5 horas",
    image: "https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?w=800&q=80",
    likes: 0,
    dislikes: 0,
    description: "Pieza completa a color. Nos tomó 3 días pero valió la pena.",
    number: 2
  },
  {
    id: 'mock-3',
    author: "Nox",
    avatar: "N",
    type: "TAG",
    location: "Suba",
    time: "Ayer",
    image: "https://images.unsplash.com/photo-1506544777-62cc8d1a1b85?w=800&q=80",
    likes: 0,
    dislikes: 0,
    description: "Marcando territorio.",
    number: 1
  }
];

const timeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Hace un momento';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} hr`;
  const days = Math.floor(hours / 24);
  return `Hace ${days} días`;
};

interface DBSpot {
  id: string;
  author: string;
  type: string;
  latitude: number;
  longitude: number;
  created_at: string;
  image_url: string;
  description?: string;
}

interface FeedItem {
  id: string;
  author: string;
  avatar: string;
  type: string;
  location: string;
  time: string;
  image: string;
  likes: number;
  dislikes: number;
  description: string;
  number: number;
}

export default function FeedPage() {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState<string[]>([]);
  const [dislikedPosts, setDislikedPosts] = useState<string[]>([]);

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

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        if (!isSupabaseConfigured) {
          setFeedItems(MOCK_FEED);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('spots')
          .select('*')
          .order('created_at', { ascending: true }); // Cargar en orden cronológico para numerar

        if (error) throw error;

        if (data && data.length > 0) {
          const mappedFeed = (data as DBSpot[]).map((spot: DBSpot, index: number) => ({
            id: spot.id,
            author: spot.author,
            avatar: (spot.author || '?')[0].toUpperCase(),
            type: spot.type.toUpperCase(),
            location: `GPS: ${spot.latitude.toFixed(4)}, ${spot.longitude.toFixed(4)}`,
            time: timeAgo(spot.created_at),
            image: spot.image_url,
            likes: 0,
            dislikes: 0,
            description: spot.description || 'Sin descripción.',
            number: index + 1 // Graffiti #1, #2, etc.
          }));
          // Invertir para mostrar los más nuevos al principio del feed
          setFeedItems(mappedFeed.reverse());
        } else {
          setFeedItems(MOCK_FEED);
        }
      } catch (err: any) {
        console.error('Error fetching feed from Supabase, fallback to mock:', err?.message || err);
        setFeedItems(MOCK_FEED);
      } finally {
        setLoading(false);
      }
    };
    fetchFeed();
  }, []);

  const toggleLike = (id: string) => {
    if (likedPosts.includes(id)) {
      setLikedPosts(likedPosts.filter(pId => pId !== id));
    } else {
      setLikedPosts([...likedPosts, id]);
      setDislikedPosts(dislikedPosts.filter(pId => pId !== id));
    }
  };

  const toggleDislike = (id: string) => {
    if (dislikedPosts.includes(id)) {
      setDislikedPosts(dislikedPosts.filter(pId => pId !== id));
    } else {
      setDislikedPosts([...dislikedPosts, id]);
      setLikedPosts(likedPosts.filter(pId => pId !== id));
    }
  };

  return (
    <main className="min-h-screen pt-8 px-4 pb-24 max-w-md mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-extrabold tracking-wider text-glow uppercase">Crew Feed</h1>
        <div className="bg-[var(--color-graffiti-red)] px-3 py-1 rounded-full text-xs font-mono font-bold text-white shadow-[0_0_10px_var(--color-graffiti-red)]">
          LIVE
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <span className="w-8 h-8 border-4 border-[var(--color-graffiti-red)] border-t-transparent rounded-full animate-spin"></span>
        </div>
      ) : (
        <div className="space-y-6">
          {feedItems.map((post) => (
            <article key={post.id} className="bg-black border border-white/10 rounded-2xl overflow-hidden shadow-[0_0_15px_rgba(255,30,39,0.05)]">
              {/* Post Header */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full chrome-gradient flex items-center justify-center font-black text-black border-2 border-black shadow-[0_0_10px_rgba(212,212,216,0.4)]">
                    {post.avatar}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white">{post.author}</h3>
                    <div className="flex items-center text-[10px] text-gray-400 gap-1">
                      <MapPin size={10} />
                      {post.location} • {post.time}
                    </div>
                  </div>
                </div>
                <div className="text-[10px] font-mono font-bold bg-white/5 border border-white/10 text-[var(--color-graffiti-red)] px-2.5 py-1 rounded">
                  #{post.number} • {post.type}
                </div>
              </div>

              {/* Post Image */}
              <div className="w-full aspect-square bg-gray-950 relative border-y border-white/5">
                <Image 
                  src={post.image} 
                  alt={`Graffiti de ${post.author}`}
                  fill
                  className="object-cover"
                />
              </div>

              {/* Post Actions */}
              <div className="p-4">
                <div className="flex items-center gap-4 mb-3">
                  <button 
                    onClick={() => toggleLike(post.id)}
                    className={`transition-transform active:scale-75 flex items-center gap-1.5 ${likedPosts.includes(post.id) ? 'text-[var(--color-graffiti-red)]' : 'text-white hover:text-[var(--color-graffiti-red)]'}`}
                  >
                    <ThumbsUp size={22} fill={likedPosts.includes(post.id) ? "currentColor" : "none"} />
                    <span className="text-xs font-bold">{post.likes + (likedPosts.includes(post.id) ? 1 : 0)}</span>
                  </button>
                  <button 
                    onClick={() => toggleDislike(post.id)}
                    className={`transition-transform active:scale-75 flex items-center gap-1.5 ${dislikedPosts.includes(post.id) ? 'text-[var(--color-graffiti-red)]' : 'text-white hover:text-red-500'}`}
                  >
                    <ThumbsDown size={22} fill={dislikedPosts.includes(post.id) ? "currentColor" : "none"} />
                    <span className="text-xs font-bold">{post.dislikes + (dislikedPosts.includes(post.id) ? 1 : 0)}</span>
                  </button>
                  <button 
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: `Spot de ${post.author}`,
                          text: post.description,
                          url: window.location.origin + '/?spot=' + post.id
                        }).catch(console.error);
                      } else {
                        navigator.clipboard.writeText(window.location.origin + '/?spot=' + post.id);
                        showAlert('success', 'Enlace Copiado', "¡Enlace del spot copiado al portapapeles!");
                      }
                    }}
                    className="text-white hover:text-[var(--color-graffiti-chrome)] transition-colors ml-auto"
                    title="Compartir"
                  >
                    <Share2 size={22} />
                  </button>
                </div>

                {/* Description */}
                <p className="text-xs text-gray-300">
                  <span className="font-extrabold text-white mr-2">{post.author}</span>
                  {post.description}
                </p>
              </div>
            </article>
          ))}
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
