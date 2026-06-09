"use client";

import { useState, useEffect } from 'react';
import { TrendingUp, Users, Map, Award } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const MOCK_DATA = {
  totalSpots: 142,
  activeMembers: 12,
  topMembers: [
    { name: "Kros", spots: 45, type: "Rey del Muro" },
    { name: "Zeto", spots: 38, type: "Bombardero" },
    { name: "Nox", spots: 29, type: "Tagger" },
  ],
  typesBreakdown: [
    { label: "Bombas", percentage: 45, color: "bg-[var(--color-neon-green)]" },
    { label: "Tags", percentage: 35, color: "bg-[var(--color-neon-purple)]" },
    { label: "Piezas", percentage: 15, color: "bg-blue-500" },
    { label: "Murales", percentage: 5, color: "bg-pink-500" },
  ]
};

interface DBProfile {
  id: string;
  alias: string;
  crew: string;
  role: string;
  avatar_url?: string;
}

interface DBSpot {
  id: string;
  title: string;
  type: string;
  author: string;
  latitude: number;
  longitude: number;
  image_url: string;
  description?: string;
  user_id?: string;
  created_at: string;
}

interface MemberRank {
  name: string;
  spots: number;
  type: string;
}

interface StyleBreakdown {
  label: string;
  percentage: number;
  color: string;
}

export default function StatsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSpots: 0,
    activeMembers: 0,
    topMembers: [] as MemberRank[],
    typesBreakdown: [] as StyleBreakdown[]
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (!isSupabaseConfigured) {
          setStats({
            totalSpots: MOCK_DATA.totalSpots,
            activeMembers: MOCK_DATA.activeMembers,
            topMembers: MOCK_DATA.topMembers,
            typesBreakdown: MOCK_DATA.typesBreakdown
          });
          setLoading(false);
          return;
        }

        const [profilesRes, spotsRes] = await Promise.all([
          supabase.from('profiles').select('*'),
          supabase.from('spots').select('*')
        ]);

        if (profilesRes.error) throw profilesRes.error;
        if (spotsRes.error) throw spotsRes.error;

        const profiles = (profilesRes.data || []) as DBProfile[];
        const spots = (spotsRes.data || []) as DBSpot[];

        const totalSpots = spots.length;
        const activeMembers = profiles.length;

        // Estilos de la Crew (Breakdown)
        const counts: Record<string, number> = {};
        spots.forEach(spot => {
          const t = (spot.type || 'tag').toLowerCase();
          counts[t] = (counts[t] || 0) + 1;
        });

        const styleColors: Record<string, string> = {
          bomba: "bg-[var(--color-neon-green)]",
          tag: "bg-[var(--color-neon-purple)]",
          pieza: "bg-blue-500",
          mural: "bg-pink-500",
          throwup: "bg-orange-500"
        };

        const typesBreakdown: StyleBreakdown[] = Object.keys(counts).map(key => {
          const percentage = totalSpots > 0 ? Math.round((counts[key] / totalSpots) * 100) : 0;
          
          let label = key.charAt(0).toUpperCase() + key.slice(1);
          if (label === 'Tag') label = 'Tags';
          else if (label === 'Bomba') label = 'Bombas';
          else if (label === 'Pieza') label = 'Piezas';
          else if (label === 'Mural') label = 'Murales';
          else if (label === 'Throwup') label = 'Throw Ups';
          else label = label + 's';

          return {
            label,
            percentage,
            color: styleColors[key] || "bg-gray-500"
          };
        }).sort((a, b) => b.percentage - a.percentage);

        // Ranking de Miembros
        const memberSpots: Record<string, { spots: number, types: Record<string, number>, role: string }> = {};

        profiles.forEach(p => {
          memberSpots[p.id] = {
            spots: 0,
            types: {},
            role: p.role || 'Miembro'
          };
        });

        spots.forEach(spot => {
          if (spot.user_id && memberSpots[spot.user_id]) {
            memberSpots[spot.user_id].spots += 1;
            const t = (spot.type || 'tag').toLowerCase();
            memberSpots[spot.user_id].types[t] = (memberSpots[spot.user_id].types[t] || 0) + 1;
          } else {
            const matchedProfile = profiles.find(p => p.alias?.toLowerCase() === spot.author?.toLowerCase());
            if (matchedProfile) {
              memberSpots[matchedProfile.id].spots += 1;
              const t = (spot.type || 'tag').toLowerCase();
              memberSpots[matchedProfile.id].types[t] = (memberSpots[matchedProfile.id].types[t] || 0) + 1;
            }
          }
        });

        const topMembers: MemberRank[] = profiles.map(p => {
          const mData = memberSpots[p.id];
          let maxType = 'Novato';
          let maxCount = 0;
          if (mData.spots > 0) {
            Object.keys(mData.types).forEach(t => {
              if (mData.types[t] > maxCount) {
                maxCount = mData.types[t];
                maxType = t;
              }
            });
            
            const titleMap: Record<string, string> = {
              bomba: "Bombardero",
              tag: "Tagger",
              pieza: "Escritor",
              mural: "Muralista",
              throwup: "Tirador de Throwups"
            };
            maxType = titleMap[maxType] || "Miembro DHW";
          }

          return {
            name: p.alias || 'Miembro DHW',
            spots: mData.spots,
            type: maxType
          };
        }).sort((a, b) => b.spots - a.spots);

        setStats({
          totalSpots,
          activeMembers,
          typesBreakdown,
          topMembers
        });
      } catch (err) {
        console.error('Error fetching stats from Supabase:', err);
        setStats({
          totalSpots: 0,
          activeMembers: 0,
          topMembers: [],
          typesBreakdown: []
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <main className="min-h-screen pt-8 px-4 pb-24 max-w-md mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-glow">Crew Stats</h1>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <span className="w-8 h-8 border-4 border-[var(--color-neon-green)] border-t-transparent rounded-full animate-spin"></span>
        </div>
      ) : (
        <>
          {/* Main KPI Cards */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center text-center">
              <Map className="text-[var(--color-neon-green)] mb-2" size={32} />
              <span className="text-3xl font-bold text-white">{stats.totalSpots}</span>
              <span className="text-xs text-gray-400">Pintas Totales</span>
            </div>
            <div className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center text-center">
              <Users className="text-[var(--color-neon-purple)] mb-2" size={32} />
              <span className="text-3xl font-bold text-white">{stats.activeMembers}</span>
              <span className="text-xs text-gray-400">Miembros Activos</span>
            </div>
          </div>

          {/* Types Progress Bar */}
          {stats.totalSpots > 0 && stats.typesBreakdown.length > 0 && (
            <div className="glass-panel p-5 rounded-xl mb-8">
              <h3 className="font-bold text-sm text-gray-300 mb-4 flex items-center gap-2">
                <TrendingUp size={16} /> Estilos de la Crew
              </h3>
              
              {/* Progress Bar */}
              <div className="w-full h-4 bg-gray-800 rounded-full flex overflow-hidden mb-4">
                {stats.typesBreakdown.map((type, i) => (
                  <div 
                    key={i}
                    className={`h-full ${type.color}`}
                    style={{ width: `${type.percentage}%` }}
                    title={`${type.label}: ${type.percentage}%`}
                  />
                ))}
              </div>

              {/* Legend */}
              <div className="grid grid-cols-2 gap-2">
                {stats.typesBreakdown.map((type, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
                    <div className={`w-3 h-3 rounded-full ${type.color}`} />
                    <span>{type.label} ({type.percentage}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Members Rankings */}
          <div className="glass-panel p-5 rounded-xl">
            <h3 className="font-bold text-sm text-gray-300 mb-4 flex items-center gap-2">
              <Award size={16} className="text-yellow-500" /> Ranking DHW
            </h3>
            
            {stats.topMembers.length === 0 ? (
              <p className="text-xs text-gray-500 italic text-center py-4">No hay miembros registrados todavía.</p>
            ) : (
              <div className="space-y-4">
                {stats.topMembers.map((member, i) => (
                  <div key={i} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-black ${i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : 'bg-orange-700'}`}>
                        {i + 1}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-white">{member.name}</div>
                        <div className="text-[10px] text-[var(--color-neon-purple)]">{member.type}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg text-[var(--color-neon-green)]">{member.spots}</div>
                      <div className="text-[10px] text-gray-500">spots</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
