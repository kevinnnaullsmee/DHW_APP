"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, Edit3, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface SpotVersion {
  id: string;
  spot_id: string;
  date_updated: string;
  image_url: string;
  description?: string;
  created_at: string;
}

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

interface SpotPopupProps {
  spot: Spot;
  onClose: () => void;
  currentUserId?: string;
  onUpdated?: () => void;
}

export default function SpotPopup({ spot, onClose, currentUserId, onUpdated }: SpotPopupProps) {
  const [versions, setVersions] = useState<SpotVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<SpotVersion | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [graffitisCount, setGraffitisCount] = useState<number>(0);

  const fetchVersions = async () => {
    try {
      if (!supabase) return;

      // Obtener versiones del spot
      const { data: versionData, error: versionError } = await supabase
        .from('spot_versions')
        .select('*')
        .eq('spot_id', spot.id)
        .order('created_at', { ascending: true });

      if (versionError) {
        console.warn('No hay versiones anteriores:', versionError.message);
        setVersions([{
          id: spot.id,
          spot_id: spot.id,
          date_updated: spot.created_at || new Date().toISOString(),
          image_url: spot.image,
          description: spot.description,
          created_at: spot.created_at || new Date().toISOString()
        }]);
      } else if (versionData && versionData.length > 0) {
        const hasOriginal = versionData.some(v => v.id === spot.id);
        if (!hasOriginal && spot.image) {
          versionData.unshift({
            id: spot.id,
            spot_id: spot.id,
            date_updated: spot.created_at || new Date().toISOString(),
            image_url: spot.image,
            description: spot.description,
            created_at: spot.created_at || new Date().toISOString()
          });
        }
        setVersions(versionData);
      } else {
        setVersions([{
          id: spot.id,
          spot_id: spot.id,
          date_updated: spot.created_at || new Date().toISOString(),
          image_url: spot.image,
          description: spot.description,
          created_at: spot.created_at || new Date().toISOString()
        }]);
      }

      // Contar graffitis del artista
      const { data: artistSpots, error: countError } = await supabase
        .from('spots')
        .select('id')
        .eq('author', spot.author)
        .order('created_at', { ascending: true });

      if (!countError && artistSpots) {
        const spotIndex = artistSpots.findIndex(s => s.id === spot.id);
        setGraffitisCount(spotIndex + 1);
      }

      // Verificar si el usuario actual es el dueño
      const { data: { user } } = await supabase.auth.getUser();
      if (user && spot.user_id === user.id) {
        setIsOwner(true);
      }
    } catch (err) {
      console.error('Error al cargar versiones:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVersions();
  }, [spot]);

  const displayVersion = selectedVersion || (versions.length > 0 ? versions[versions.length - 1] : null);

  const handleDelete = async () => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este spot?')) return;
    
    try {
      const { error } = await supabase.from('spots').delete().eq('id', spot.id);
      if (error) throw error;
      alert('Spot eliminado correctamente');
      onClose();
      onUpdated?.();
    } catch (err) {
      console.error('Error al eliminar:', err);
      alert('Error al eliminar el spot');
    }
  };

  return (
    <div className="bg-black border border-white/10 rounded-xl shadow-[0_0_20px_rgba(255,30,39,0.3)] w-full max-w-sm text-white overflow-hidden flex flex-col max-h-[85vh]">
      {/* Header */}
      <div className="p-3.5 border-b border-white/10 bg-black/50 flex-shrink-0">
        <div className="flex justify-between items-start gap-3 mb-3">
          <div>
            <h3 className="font-extrabold text-white text-sm line-clamp-1">{spot.title}</h3>
            <p className="text-[9px] text-white mt-1">
              {spot.author} <span className="text-white font-bold">#{graffitisCount}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Selector de fechas */}
        {versions.length > 1 && (
          <div className="flex items-center gap-2">
            <label className="text-[8px] text-gray-400 font-mono uppercase whitespace-nowrap font-bold">Fechas:</label>
            <select
              value={selectedVersion?.id || versions[versions.length - 1].id}
              onChange={(e) => {
                const version = versions.find(v => v.id === e.target.value);
                setSelectedVersion(version || null);
              }}
              className="flex-1 bg-black/60 border border-white/10 rounded px-2 py-1.5 text-[8px] text-white focus:outline-none focus:border-[var(--color-graffiti-red)] transition-colors"
            >
              {versions.map((version, idx) => (
                <option key={version.id} value={version.id}>
                  {new Date(version.date_updated).toLocaleDateString('es-ES', {
                    year: '2-digit',
                    month: 'short',
                    day: 'numeric'
                  })} v{idx + 1}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
        {/* Imagen */}
        {displayVersion && (displayVersion.image_url || spot.image) && (
          <div className="relative w-full h-36 rounded-lg overflow-hidden border border-white/5 flex-shrink-0">
            <Image
              src={displayVersion.image_url || spot.image}
              alt={spot.title}
              fill
              className="object-cover"
              priority
              onError={(e) => {
                console.warn('Error cargando imagen:', displayVersion.image_url || spot.image);
              }}
            />
            <div className="absolute top-2 right-2 z-10 bg-black/80 backdrop-blur-sm border border-white/10 text-[10px] font-mono font-bold px-2 py-1 rounded text-white">
              #{spot.number}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="space-y-2">
          <span className="text-[9px] font-mono font-bold bg-white/10 text-white px-2.5 py-1 rounded uppercase inline-block">
            {spot.type}
          </span>
        </div>

        {/* Descripción */}
        {displayVersion?.description && (
          <p className="text-[10px] text-white italic border-t border-white/10 pt-2.5 break-words">
            "{displayVersion.description}"
          </p>
        )}

        {/* Fecha */}
        {displayVersion && (
          <p className="text-[8px] text-gray-400 border-t border-white/10 pt-2.5">
            {new Date(displayVersion.date_updated).toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="p-3.5 border-t border-white/10 bg-black/50 flex-shrink-0 space-y-2">
        {isOwner && (
          <>
            <div className="flex gap-2">
              <button
                onClick={() => setShowUpdateForm(!showUpdateForm)}
                className="flex-1 bg-[var(--color-graffiti-red)] text-white text-[11px] font-bold py-2.5 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <Edit3 size={14} />
                ACTUALIZAR
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-900/50 text-white text-[11px] font-bold py-2.5 rounded-lg hover:bg-red-900 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={14} />
                BORRAR
              </button>
            </div>
            
            {showUpdateForm && (
              <UpdateSpotForm
                spotId={spot.id}
                onUpdated={() => {
                  setShowUpdateForm(false);
                  fetchVersions();
                  onUpdated?.();
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function UpdateSpotForm({ spotId, onUpdated }: { spotId: string; onUpdated: () => void }) {
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      // Crear preview de imagen
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imageUrl = '';

      // Subir imagen solo si existe (opcional)
      if (image) {
        try {
          const timestamp = Date.now();
          const filename = `${timestamp}-${image.name.replace(/\s+/g, '_')}`;
          const filePath = `spot_updates/${spotId}/${filename}`;

          const { error: uploadError } = await supabase.storage
            .from('spots')
            .upload(filePath, image, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.warn('Advertencia al subir imagen:', uploadError.message);
            // No frenamos si falla la imagen, continuamos sin ella
          } else {
            const { data: publicUrl } = supabase.storage
              .from('spots')
              .getPublicUrl(filePath);
            imageUrl = publicUrl.publicUrl;
          }
        } catch (imgErr) {
          console.warn('Error al procesar imagen:', imgErr);
          // Continuamos sin imagen
        }
      }

      // Guardar versión en base de datos
      const { error } = await supabase
        .from('spot_versions')
        .insert([
          {
            spot_id: spotId,
            date_updated: new Date().toISOString(),
            description: description || null,
            image_url: imageUrl || null,
          }
        ]);

      if (error) {
        console.error('Error RLS:', error);
        throw error;
      }

      alert('¡Spot actualizado con éxito!');
      setDescription('');
      setImage(null);
      setImagePreview('');
      onUpdated();
    } catch (err) {
      console.error('Error al actualizar:', err);
      alert('Error al actualizar el spot. Verifica los permisos en Supabase.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-2.5 bg-white/5 rounded-lg border border-white/10 space-y-2.5">
      {/* Preview de imagen */}
      {imagePreview && (
        <div className="relative w-full h-24 rounded-lg overflow-hidden border border-white/10">
          <Image
            src={imagePreview}
            alt="Preview"
            fill
            className="object-cover"
          />
          <button
            type="button"
            onClick={() => {
              setImage(null);
              setImagePreview('');
            }}
            className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full hover:bg-red-700"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Input de imagen */}
      <div>
        <label className="text-[9px] text-gray-400 font-mono mb-1 block uppercase">Foto actual</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="w-full bg-black/60 border border-white/10 rounded px-2.5 py-2 text-[9px] text-white file:bg-[var(--color-graffiti-red)] file:text-white file:border-0 file:px-2 file:py-1 file:rounded file:cursor-pointer focus:outline-none focus:border-[var(--color-graffiti-red)]"
        />
      </div>

      {/* Descripción */}
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Ej: Ahora está tapado en la parte superior"
        className="w-full bg-black/60 border border-white/10 rounded p-2 text-[9px] text-white placeholder-gray-600 focus:outline-none focus:border-[var(--color-graffiti-red)] resize-none"
        rows={2}
        maxLength={200}
      />

      {/* Botón submit */}
      <button
        type="submit"
        disabled={loading || !description.trim()}
        className="w-full bg-[var(--color-graffiti-red)] text-white text-[10px] font-bold py-2 rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
      >
        {loading ? (
          <>
            <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
            Guardando...
          </>
        ) : (
          'GUARDAR ACTUALIZACIÓN'
        )}
      </button>
    </form>
  );
}
