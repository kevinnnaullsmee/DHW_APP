"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Heart, MessageCircle, Share2, Trash2, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import CustomAlert from '@/components/CustomAlert';

interface Post {
  id: string;
  spot_id: string;
  version_id: string;
  author: string;
  title: string;
  description?: string;
  image_url: string;
  latitude: number;
  longitude: number;
  created_at: string;
  user_id: string;
  likes: number;
  comments_count: number;
}

interface Comment {
  id: string;
  post_id: string;
  user: string;
  text: string;
  created_at: string;
}

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

export default function Feed({ currentUserId }: { currentUserId?: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentingPostId, setCommentingPostId] = useState<string | null>(null);
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    type: 'info' as 'success' | 'error' | 'info',
    title: '',
    message: '',
  });

  const showAlert = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    setAlertConfig({ isOpen: true, type, title, message });
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (err) {
      console.error('Error loading posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments((prev) => ({ ...prev, [postId]: data || [] }));
    } catch (err) {
      console.error('Error loading comments:', err);
    }
  };

  const toggleComments = async (postId: string) => {
    if (commentingPostId === postId) {
      setCommentingPostId(null);
      return;
    }
    setCommentingPostId(postId);
    await fetchComments(postId);
  };

  const handleAddComment = async (postId: string) => {
    const text = commentTexts[postId]?.trim();
    if (!text) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showAlert('error', 'Sesión requerida', 'Debes estar autenticado para comentar');
        return;
      }

      const { error } = await supabase.from('post_comments').insert([
        {
          post_id: postId,
          user: user.email?.split('@')[0] || 'Anónimo',
          text,
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      setCommentTexts((prev) => ({ ...prev, [postId]: '' }));
      await fetchComments(postId);

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p
        )
      );
    } catch (err) {
      console.error('Error adding comment:', err);
      showAlert('error', 'Error', 'No se pudo añadir el comentario');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('¿Eliminar esta publicación?')) return;

    try {
      await supabase.from('post_comments').delete().eq('post_id', postId);
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      console.error('Error deleting post:', err);
      showAlert('error', 'Error', 'No se pudo eliminar la publicación');
    }
  };

  const shareLocation = (post: Post) => {
    const mapsUrl = `https://www.google.com/maps?q=${post.latitude},${post.longitude}`;
    const appUrl = `${window.location.origin}/?spot=${post.spot_id}`;
    const text = `📍 ${post.title} por ${post.author}\nUbicación exacta: ${mapsUrl}\nVer en DHW: ${appUrl}`;

    if (navigator.share) {
      navigator.share({
        title: `Spot de ${post.author}`,
        text,
        url: mapsUrl,
      }).catch(() => {
        navigator.clipboard.writeText(text);
        showAlert('success', 'Ubicación copiada', 'Coordenadas exactas copiadas al portapapeles');
      });
    } else {
      navigator.clipboard.writeText(text);
      showAlert('success', 'Ubicación copiada', 'Coordenadas exactas copiadas al portapapeles');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <span className="w-8 h-8 border-4 border-[var(--color-graffiti-red)] border-t-transparent rounded-full animate-spin"></span>
      </div>
    );
  }

  return (
    <>
      {posts.length === 0 ? (
        <div className="text-center text-gray-400 py-12 font-mono text-sm">
          No hay publicaciones aún. Registra o actualiza un spot para ver actividad aquí.
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post, index) => (
            <article
              key={post.id}
              className="bg-black border border-white/10 rounded-2xl overflow-hidden shadow-[0_0_15px_rgba(255,30,39,0.05)]"
            >
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full chrome-gradient flex items-center justify-center font-black text-black border-2 border-black shadow-[0_0_10px_rgba(212,212,216,0.4)]">
                    {(post.author || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white">{post.author}</h3>
                    <div className="flex items-center text-[10px] text-gray-400 gap-1">
                      <MapPin size={10} />
                      {post.latitude.toFixed(5)}, {post.longitude.toFixed(5)} • {timeAgo(post.created_at)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-[10px] font-mono font-bold bg-white/5 border border-white/10 text-[var(--color-graffiti-red)] px-2.5 py-1 rounded">
                    #{posts.length - index} • ACTUALIZACIÓN
                  </div>
                  {currentUserId === post.user_id && (
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="p-1 text-red-500 hover:text-red-400 transition-colors"
                      title="Eliminar publicación"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="px-4 pb-2">
                <p className="text-xs font-bold text-white">{post.title}</p>
              </div>

              {post.image_url && (
                <div className="w-full aspect-square bg-gray-950 relative border-y border-white/5">
                  <Image
                    src={post.image_url}
                    alt={post.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}

              <div className="p-4">
                <div className="flex items-center gap-4 mb-3">
                  <button className="flex items-center gap-1.5 text-gray-400 hover:text-[var(--color-graffiti-red)] transition-colors text-sm">
                    <Heart size={18} />
                    <span className="text-xs font-bold">{post.likes}</span>
                  </button>
                  <button
                    onClick={() => toggleComments(post.id)}
                    className={`flex items-center gap-1.5 transition-colors text-sm ${
                      commentingPostId === post.id
                        ? 'text-blue-400'
                        : 'text-gray-400 hover:text-blue-400'
                    }`}
                  >
                    <MessageCircle size={18} />
                    <span className="text-xs font-bold">{post.comments_count}</span>
                  </button>
                  <button
                    onClick={() => shareLocation(post)}
                    className="flex items-center gap-1.5 text-gray-400 hover:text-[var(--color-graffiti-chrome)] transition-colors text-sm ml-auto"
                    title="Compartir ubicación exacta"
                  >
                    <Share2 size={18} />
                    <span className="text-[10px] font-mono">GPS</span>
                  </button>
                </div>

                {post.description && (
                  <p className="text-xs text-gray-300">
                    <span className="font-extrabold text-white mr-2">{post.author}</span>
                    {post.description}
                  </p>
                )}

                {commentingPostId === post.id && (
                  <div className="border-t border-white/10 pt-4 mt-4 space-y-3">
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {(comments[post.id] || []).length === 0 ? (
                        <p className="text-[10px] text-gray-500 font-mono">Sin comentarios aún</p>
                      ) : (
                        comments[post.id]?.map((comment) => (
                          <div key={comment.id} className="bg-white/5 p-2 rounded">
                            <p className="text-white text-xs font-bold">{comment.user}</p>
                            <p className="text-gray-300 text-xs">{comment.text}</p>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Comentar..."
                        value={commentTexts[post.id] || ''}
                        onChange={(e) =>
                          setCommentTexts((prev) => ({
                            ...prev,
                            [post.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddComment(post.id);
                        }}
                        className="flex-1 bg-white/10 border border-white/10 rounded px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-white/30"
                      />
                      <button
                        onClick={() => handleAddComment(post.id)}
                        className="bg-[var(--color-graffiti-red)] text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-red-700 transition-colors"
                      >
                        Enviar
                      </button>
                    </div>
                  </div>
                )}
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
        onClose={() => setAlertConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </>
  );
}
