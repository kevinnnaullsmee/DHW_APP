"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Heart, MessageCircle, Share2, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

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

export default function Feed({ currentUserId }: { currentUserId?: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentingPostId, setCommentingPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Record<string, Comment[]>>({});

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
      setComments(prev => ({ ...prev, [postId]: data || [] }));
    } catch (err) {
      console.error('Error loading comments:', err);
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!commentText.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Debes estar autenticado para comentar');
        return;
      }

      const { error } = await supabase
        .from('post_comments')
        .insert([
          {
            post_id: postId,
            user: user.email?.split('@')[0] || 'Anónimo',
            text: commentText,
            created_at: new Date().toISOString()
          }
        ]);

      if (error) throw error;
      setCommentText('');
      fetchComments(postId);

      // Actualizar contador
      setPosts(posts.map(p => 
        p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p
      ));
    } catch (err) {
      console.error('Error adding comment:', err);
      alert('Error al añadir comentario');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('¿Eliminar esta publicación?')) return;

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
      setPosts(posts.filter(p => p.id !== postId));
    } catch (err) {
      console.error('Error deleting post:', err);
      alert('Error al eliminar publicación');
    }
  };

  const shareLocation = (post: Post) => {
    const mapsUrl = `https://www.google.com/maps?q=${post.latitude},${post.longitude}`;
    navigator.clipboard.writeText(mapsUrl);
    alert('Ubicación copiada al portapapeles');
  };

  if (loading) return <div className="text-white p-4">Cargando publicaciones...</div>;

  return (
    <div className="w-full max-w-2xl mx-auto">
      {posts.length === 0 ? (
        <div className="text-center text-gray-400 py-8">No hay publicaciones aún</div>
      ) : (
        posts.map(post => (
          <div key={post.id} className="bg-black border border-white/10 rounded-lg p-4 mb-4 shadow-lg">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-white font-bold text-sm">{post.title}</p>
                <p className="text-gray-400 text-xs">{post.author}</p>
              </div>
              {currentUserId === post.user_id && (
                <button
                  onClick={() => handleDeletePost(post.id)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            {/* Imagen */}
            {post.image_url && (
              <div className="relative w-full h-48 rounded-lg overflow-hidden mb-4">
                <Image
                  src={post.image_url}
                  alt={post.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            {/* Descripción */}
            {post.description && (
              <p className="text-white text-sm mb-4">{post.description}</p>
            )}

            {/* Interacción */}
            <div className="flex gap-4 mb-4 border-t border-white/10 pt-4">
              <button className="flex items-center gap-2 text-gray-400 hover:text-red-500 transition-colors text-sm">
                <Heart size={16} />
                {post.likes}
              </button>
              <button
                onClick={() => setCommentingPostId(commentingPostId === post.id ? null : post.id)}
                className="flex items-center gap-2 text-gray-400 hover:text-blue-500 transition-colors text-sm"
              >
                <MessageCircle size={16} />
                {post.comments_count}
              </button>
              <button
                onClick={() => shareLocation(post)}
                className="flex items-center gap-2 text-gray-400 hover:text-green-500 transition-colors text-sm"
              >
                <Share2 size={16} />
                Ubicación
              </button>
            </div>

            {/* Comentarios */}
            {commentingPostId === post.id && (
              <div className="border-t border-white/10 pt-4 space-y-3">
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {comments[post.id]?.map(comment => (
                    <div key={comment.id} className="bg-white/5 p-2 rounded">
                      <p className="text-white text-xs font-bold">{comment.user}</p>
                      <p className="text-gray-300 text-xs">{comment.text}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Comentar..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyPress={(e) => {
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
        ))
      )}
    </div>
  );
}
