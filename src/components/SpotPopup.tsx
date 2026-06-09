"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, Edit3, Calendar } from 'lucide-react';
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
}

export default function SpotPopup({ spot, onClose, currentUserId }: SpotPopupProps) {
  const [versions, setVersions] = useState<SpotVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<SpotVersion | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        if (!supabase) return;

        // Obtener versiones del spot
        const { data: versionData, error: versionError } = await supabase
          .from('spot_versions')
          .select('*')
          .eq('spot_id', spot.id)
          .order('created_at', { ascending: false });

        if (versionError) {
          console.warn('No hay versiones anteriores:', versionError.message);
          // Usar el spot actual como versión inicial
          setVersions([{
            id: spot.id,
            spot_id: spot.id,
            date_updated: spot.created_at || new Date().toISOString(),
            image_url: spot.image,
            description: spot.description,
            created_at: spot.created_at || new Date().toISOString()
          }]);
        } else {
          setVersions(versionData || []);
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

    fetchVersions();
  }, [spot]);

  const displayVersion = selectedVersion || (versions.length > 0 ? versions[0] : null);

  return (
    <div className="bg-black border border-white/10 rounded-xl shadow-[0_0_20px_rgba(255,30,39,0.3)] w-full max-w-sm text-white overflow-hidden flex flex-col max-h-[85vh]">
      {/* Header con botón cerrar */}
      <div className="flex justify-between items-center gap-3 p-3.5 border-b border-white/10 bg-black/50 flex-shrink-0">
        <h3 className="font-extrabold text-white text-sm line-clamp-1 flex-1">{spot.title}</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
        >
          <X size={18} />
        </button>
      </div>

      {/* Contenido scrolleable */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
        {/* Imagen */}
        {displayVersion && (
          <div className="relative w-full h-36 rounded-lg overflow-hidden border border-white/5 flex-shrink-0">
            <Image
              src={displayVersion.image_url}
              alt={spot.title}
              fill
              className="object-cover"
            />
            <div className="absolute top-2 right-2 z-10 bg-black/80 backdrop-blur-sm border border-white/10 text-[10px] font-mono font-bold px-2 py-1 rounded text-[var(--color-graffiti-red)]">
              #{spot.number}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="space-y-2">
          <p className="text-[10px] text-gray-300">
            por <span className="text-[var(--color-graffiti-red)] font-bold">{spot.author}</span>
          </p>
          <span className="text-[9px] font-mono font-bold bg-[var(--color-graffiti-red)]/20 text-[var(--color-graffiti-red)] px-2.5 py-1 rounded uppercase inline-block">
            {spot.type}
          </span>
        </div>

        {/* Descripción */}
        {displayVersion?.description && (
          <p className="text-[10px] text-gray-300 italic border-t border-white/10 pt-2.5 break-words">
            "{displayVersion.description}"
          </p>
        )}

        {/* Selector de fechas si hay versiones múltiples */}
        {versions.length > 1 && (
          <div className="p-2.5 bg-white/5 rounded-lg border border-white/10">
            <label className="text-[9px] text-gray-400 font-mono mb-1.5 block uppercase font-bold">Historial ({versions.length})</label>
            <select
              value={selectedVersion?.id || versions[0].id}
              onChange={(e) => {
                const version = versions.find(v => v.id === e.target.value);
                setSelectedVersion(version || null);
              }}
              className="w-full bg-black/60 border border-white/10 rounded px-2.5 py-2 text-[9px] text-white focus:outline-none focus:border-[var(--color-graffiti-red)] transition-colors"
            >
              {versions.map((version) => (
                <option key={version.id} value={version.id}>
                  {new Date(version.date_updated).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Botones de acción - Footer */}
      <div className="p-3.5 border-t border-white/10 bg-black/50 flex-shrink-0 space-y-2">
        {isOwner && (
          <>
            <button
              onClick={() => setShowUpdateForm(!showUpdateForm)}
              className="w-full bg-[var(--color-graffiti-red)] text-white text-[11px] font-bold py-2.5 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
            >
              <Edit3 size={14} />
              ACTUALIZAR SPOT
            </button>
            
            {/* Formulario de actualización */}
            {showUpdateForm && (
              <UpdateSpotForm
                spotId={spot.id}
                onUpdated={() => {
                  setShowUpdateForm(false);
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
