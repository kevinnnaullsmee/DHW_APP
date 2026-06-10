"use client";

import { useEffect, useState } from 'react';
import Feed from '@/components/Feed';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export default function FeedPage() {
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();

  useEffect(() => {
    const loadUser = async () => {
      if (!isSupabaseConfigured) return;
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id);
    };
    loadUser();
  }, []);

  return (
    <main className="min-h-screen pt-8 px-4 pb-24 max-w-md mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-extrabold tracking-wider text-glow uppercase">Crew Feed</h1>
        <div className="bg-[var(--color-graffiti-red)] px-3 py-1 rounded-full text-xs font-mono font-bold text-white shadow-[0_0_10px_var(--color-graffiti-red)]">
          LIVE
        </div>
      </div>

      <Feed currentUserId={currentUserId} />
    </main>
  );
}
