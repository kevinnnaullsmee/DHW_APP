-- Limpiar versiones duplicadas - EJECUTAR EN SUPABASE

-- 1. Eliminar versiones duplicadas manteniendo la más antigua
DELETE FROM public.spot_versions sv1
WHERE sv1.id NOT IN (
  SELECT MIN(sv2.id)
  FROM public.spot_versions sv2
  GROUP BY sv2.spot_id
);

-- 2. Recalcular números de versión
UPDATE public.spot_versions sv
SET version_number = (
  SELECT COUNT(*) 
  FROM public.spot_versions sv2 
  WHERE sv2.spot_id = sv.spot_id 
  AND sv2.created_at <= sv.created_at
)
WHERE version_number IS NULL OR version_number = 0;

-- 3. Verificar integridad
SELECT spot_id, COUNT(*) as version_count
FROM public.spot_versions
GROUP BY spot_id
ORDER BY version_count DESC;
