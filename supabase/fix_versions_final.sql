-- Script final para limpiar y validar versiones
-- PASO 1: Identificar y eliminar duplicados (mantener solo la versión más antigua)
DELETE FROM public.spot_versions sv1
WHERE sv1.id != (
  SELECT sv2.id
  FROM public.spot_versions sv2
  WHERE sv2.spot_id = sv1.spot_id
  ORDER BY sv2.created_at ASC
  LIMIT 1
);

-- PASO 2: Recalcular version_number para cada spot
UPDATE public.spot_versions sv
SET version_number = rn.row_num
FROM (
  SELECT 
    id, 
    spot_id,
    ROW_NUMBER() OVER (PARTITION BY spot_id ORDER BY created_at ASC) as row_num
  FROM public.spot_versions
) rn
WHERE sv.id = rn.id;

-- PASO 3: Verificar que no haya duplicados
SELECT 
  spot_id, 
  COUNT(*) as total_versions,
  COUNT(DISTINCT id) as unique_ids,
  CASE WHEN COUNT(*) > COUNT(DISTINCT id) THEN 'DUPLICADOS!' ELSE 'OK' END as status
FROM public.spot_versions
GROUP BY spot_id;

-- PASO 4: Mostrar versiones por spot (para verificación)
SELECT 
  spot_id, 
  id, 
  version_number, 
  created_at,
  category
FROM public.spot_versions
ORDER BY spot_id, created_at ASC;
