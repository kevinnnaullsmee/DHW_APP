"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, MapPin, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { createFeedPost } from '@/lib/spots';
import { User } from '@supabase/supabase-js';
import CustomAlert from '@/components/CustomAlert';

interface UserProfile {
  id: string;
  alias: string;
  crew: string;
  role: string;
  avatar_url?: string;
}

interface SpotFormData {
  spotName?: string;
  type?: string;
  author?: string;
  description?: string;
}

function generateFileName(userId: string, fileExt: string): string {
  const randomPart = Math.random().toString(36).substring(2);
  return `${userId}/${randomPart}.${fileExt}`;
}

export default function RegisterPage() {
  const router = useRouter();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
    onClose?: () => void;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  });

  const showAlert = (type: 'success' | 'error' | 'info', title: string, message: string, onClose?: () => void) => {
    setAlertConfig({ isOpen: true, type, title, message, onClose });
  };

  const { register, handleSubmit, setValue } = useForm<SpotFormData>();

  useEffect(() => {
    const checkSession = async () => {
      if (!isSupabaseConfigured) {
        setUser({
          id: 'mock-user-id',
          email: 'demo@dhw.com',
        } as User);
        setProfile({
          id: 'mock-user-id',
          alias: 'DemoUser',
          crew: 'DHW',
          role: 'Miembro',
        });
        setValue('author', 'DemoUser');
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

      if (user) {
        setUser(user);
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profileData) {
          setProfile(profileData);
          setValue('author', profileData.alias);
        } else {
          const fallbackProfile = {
            id: user.id,
            alias: user.user_metadata?.alias || user.email?.split('@')[0] || 'Miembro',
            crew: user.user_metadata?.crew || 'DHW',
            role: user.user_metadata?.role || 'Miembro',
          };
          setProfile(fallbackProfile);
          setValue('author', fallbackProfile.alias);
        }
      } else {
        showAlert('info', 'Acceso Restringido', 'Debes iniciar sesión para registrar una pinta.', () => {
          router.push('/login');
        });
      }
    };
    checkSession();
  }, [router, setValue]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const getLocation = () => {
    setIsLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setIsLocating(false);
        },
        (error) => {
          console.error("Error getting location", error);
          showAlert('error', 'Error de GPS', 'No se pudo obtener la ubicación. Por favor permite el acceso al GPS.');
          setIsLocating(false);
        }
      );
    } else {
      showAlert('error', 'Compatibilidad', 'Tu navegador no soporta geolocalización.');
      setIsLocating(false);
    }
  };

  const onSubmit = async (data: SpotFormData) => {
    if (!location) {
      showAlert('error', 'Ubicación Requerida', 'Por favor obtén tu ubicación GPS antes de subir la pinta.');
      return;
    }
    if (!imageFile) {
      showAlert('error', 'Foto Requerida', 'Por favor selecciona o toma una foto.');
      return;
    }
    if (!user) {
      showAlert('error', 'Sesión Requerida', 'Debes iniciar sesión para subir una pinta.', () => {
        router.push('/login');
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Subir imagen a Supabase Storage (bucket 'spots')
      const fileExt = imageFile.name.split('.').pop() || 'jpg';
      const fileName = generateFileName(user.id, fileExt);
      const filePath = `uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('spots')
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      // 2. Obtener URL pública de la imagen
      const { data: { publicUrl } } = supabase.storage
        .from('spots')
        .getPublicUrl(filePath);

      const { data: newSpot, error: insertError } = await supabase
        .from('spots')
        .insert({
          title: data.spotName || 'Spot sin título',
          type: data.type || 'tag',
          author: profile?.alias || data.author || 'Miembro DHW',
          latitude: location.lat,
          longitude: location.lng,
          image_url: publicUrl,
          description: data.description || '',
          user_id: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const { data: newVersion, error: versionError } = await supabase
        .from('spot_versions')
        .insert([
          {
            spot_id: newSpot.id,
            date_updated: new Date().toISOString(),
            image_url: publicUrl,
            description: data.description || null,
            category: data.type || 'actualización',
            version_number: 1,
          },
        ])
        .select()
        .single();

      if (versionError) {
        console.warn('No se pudo crear versión inicial:', versionError.message);
      }

      if (newVersion) {
        await createFeedPost({
          spotId: newSpot.id,
          versionId: newVersion.id,
          author: newSpot.author,
          title: newSpot.title,
          description: newSpot.description,
          imageUrl: publicUrl,
          latitude: newSpot.latitude,
          longitude: newSpot.longitude,
          userId: user.id,
        });
      }

      showAlert('success', 'Registro Completado', '¡Pinta registrada exitosamente!', () => {
        router.push('/');
      });
    } catch (err) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : 'Error desconocido';
      showAlert('error', 'Error de Registro', 'Error al registrar la pinta: ' + errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen pt-8 px-4 pb-24 max-w-md mx-auto">
      <h1 className="text-3xl font-extrabold mb-6 text-glow uppercase tracking-wider">Registrar Pinta</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Image Upload Area */}
        <div className="relative">
          {imagePreview ? (
            <div className="relative w-full h-64 rounded-xl overflow-hidden border-2 border-[var(--color-graffiti-red)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              <button 
                type="button"
                onClick={() => {
                  setImagePreview(null);
                  setImageFile(null);
                }}
                className="absolute top-2 right-2 bg-black/80 p-2 rounded-full text-white backdrop-blur-sm hover:text-[var(--color-graffiti-red)] transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-white/10 hover:border-[var(--color-graffiti-red)] rounded-xl cursor-pointer bg-zinc-950 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6 text-gray-400">
                <Camera size={40} className="mb-3 text-gray-500" />
                <p className="mb-2 text-sm font-bold text-white">Tomar Foto o Subir</p>
                <p className="text-xs text-gray-500">PNG, JPG hasta 10MB</p>
              </div>
              <input type="file" className="hidden" accept="image/*" capture="environment" onChange={handleImageChange} />
            </label>
          )}
        </div>

        {/* Location Area */}
        <div className="bg-zinc-950 border border-white/5 p-4 rounded-xl space-y-3 shadow-md">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-sm text-gray-300">Ubicación GPS</h3>
            <button 
              type="button"
              onClick={getLocation}
              disabled={isLocating}
              className="flex items-center gap-1.5 text-xs bg-[var(--color-graffiti-red)] text-white px-3 py-1.5 rounded-full font-bold shadow-[0_0_10px_rgba(255,30,39,0.3)] hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <MapPin size={13} />
              {isLocating ? 'Ubicando...' : (location ? 'Actualizar' : 'Obtener Ubicación')}
            </button>
          </div>
          {location ? (
            <p className="text-xs text-gray-400 font-mono bg-black/50 border border-white/5 p-2 rounded">
              Lat: {location.lat.toFixed(6)} | Lng: {location.lng.toFixed(6)}
            </p>
          ) : (
            <p className="text-xs text-red-500 italic font-mono">Ubicación requerida para el registro.</p>
          )}
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold font-mono text-gray-400 mb-1">Nombre del Spot</label>
            <input 
              {...register("spotName")}
              type="text" 
              className="w-full bg-zinc-950 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[var(--color-graffiti-red)] transition-colors"
              placeholder="Ej. Muro de la 45"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold font-mono text-gray-400 mb-1">Tipo de Pinta</label>
              <select 
                {...register("type")}
                className="w-full bg-zinc-950 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-[var(--color-graffiti-red)] transition-colors appearance-none"
              >
                <option value="tag">Tag</option>
                <option value="bomba">Bomba</option>
                <option value="pieza">Pieza</option>
                <option value="mural">Mural</option>
                <option value="throwup">Throw Up</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold font-mono text-gray-400 mb-1">Alias del Autor</label>
              <input 
                {...register("author")}
                type="text" 
                className="w-full bg-zinc-950 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[var(--color-graffiti-red)] transition-colors"
                defaultValue={profile?.alias || "MiUsuarioDHW"}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold font-mono text-gray-400 mb-1">Descripción / Historia (Opcional)</label>
            <textarea 
              {...register("description")}
              rows={3}
              className="w-full bg-zinc-950 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[var(--color-graffiti-red)] transition-colors resize-none"
              placeholder="Detalles sobre la pintada, problemas con la poli, etc."
            ></textarea>
          </div>
        </div>

        <button 
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[var(--color-graffiti-red)] text-white font-extrabold py-4 rounded-xl shadow-[0_0_15px_rgba(255,30,39,0.3)] hover:shadow-[0_0_25px_rgba(255,30,39,0.5)] transition-all active:scale-95 disabled:opacity-50 text-lg flex items-center justify-center gap-2 hover:scale-[1.02] cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Subiendo a la Calle...
            </>
          ) : (
            'Subir a la Calle'
          )}
        </button>
      </form>

      <CustomAlert 
        isOpen={alertConfig.isOpen}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={() => {
          setAlertConfig(prev => ({ ...prev, isOpen: false }));
          if (alertConfig.onClose) alertConfig.onClose();
        }}
      />
    </main>
  );
}
