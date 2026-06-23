-- Ejecutar en Supabase SQL Editor para agregar categorías

-- 1. Agregar campos a spot_versions si no existen
ALTER TABLE public.spot_versions
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'actualización',
ADD COLUMN IF NOT EXISTS version_number INTEGER;

-- 2. Agregar campos a posts si no existen
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'actualización';

-- 3. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_spot_versions_category ON public.spot_versions(category);
CREATE INDEX IF NOT EXISTS idx_posts_category ON public.posts(category);

-- 4. Comentarios sobre categorías válidas
COMMENT ON COLUMN public.spot_versions.category IS 'Categoría de la actualización: bomba, quick, pieza, producción, tag, throwup, sticker, wildstyle, etc';
COMMENT ON COLUMN public.spot_versions.version_number IS 'Número secuencial de actualización para este spot (1, 2, 3...)';
COMMENT ON COLUMN public.posts.category IS 'Categoría de la publicación en el feed';

-- 5. Actualizar version_number basado en created_at
UPDATE public.spot_versions sv
SET version_number = (
  SELECT COUNT(*) 
  FROM public.spot_versions sv2 
  WHERE sv2.spot_id = sv.spot_id 
  AND sv2.created_at <= sv.created_at
)
WHERE version_number IS NULL;

-- 6. Crear vista para estadísticas por categoría (opcional pero útil)
CREATE OR REPLACE VIEW public.category_stats AS
SELECT 
  author,
  category,
  COUNT(*) as total,
  COUNT(DISTINCT spot_id) as spots_affected
FROM public.posts
GROUP BY author, category
ORDER BY author, total DESC;
