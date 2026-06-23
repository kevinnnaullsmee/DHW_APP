-- Ejecutar en Supabase SQL Editor para otorgar permisos de lectura

-- Permitir que usuarios autenticados lean posts
GRANT SELECT ON public.posts TO authenticated;
GRANT SELECT ON public.posts TO anon;

-- Permitir que usuarios autenticados lean comentarios
GRANT SELECT ON public.post_comments TO authenticated;
GRANT SELECT ON public.post_comments TO anon;

-- Verificar que las políticas RLS existan
-- Si no existen, ejecutar estas:

DROP POLICY IF EXISTS "Posts visibles para autenticados" ON public.posts;
DROP POLICY IF EXISTS "Posts visibles para todos" ON public.posts;

CREATE POLICY "Posts visibles para todos"
  ON public.posts FOR SELECT
  USING (true);

CREATE POLICY "Usuarios crean sus posts"
  ON public.posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios eliminan sus posts"
  ON public.posts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Comentarios visibles para autenticados" ON public.post_comments;
DROP POLICY IF EXISTS "Comentarios visibles para todos" ON public.post_comments;

CREATE POLICY "Comentarios visibles para todos"
  ON public.post_comments FOR SELECT
  USING (true);

CREATE POLICY "Usuarios autenticados comentan"
  ON public.post_comments FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Comentarios se eliminan con el post"
  ON public.post_comments FOR DELETE TO authenticated
  USING (true);
