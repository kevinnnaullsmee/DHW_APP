import { supabase } from '@/lib/supabase';

export interface SpotVersionRow {
  id: string;
  spot_id: string;
  date_updated: string;
  image_url: string | null;
  description?: string | null;
  created_at: string;
  category?: string | null;
  version_number?: number | null;
}

export interface SpotRow {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  author: string;
  type: string;
  image_url: string;
  description?: string;
  created_at: string;
  user_id?: string;
}

export async function fetchLatestVersionImages(
  spotIds: string[]
): Promise<Record<string, string | null>> {
  if (!spotIds.length) return {};

  const { data } = await supabase
    .from('spot_versions')
    .select('spot_id, image_url, created_at')
    .in('spot_id', spotIds)
    .order('created_at', { ascending: false });

  const latest: Record<string, string | null> = {};
  data?.forEach((version) => {
    if (!(version.spot_id in latest)) {
      latest[version.spot_id] = version.image_url;
    }
  });
  return latest;
}

export function resolveSpotImage(
  spotImageUrl: string,
  latestVersionImage?: string | null
): string {
  return latestVersionImage || spotImageUrl || '';
}

export function getVersionImage(
  version: SpotVersionRow,
  versions: SpotVersionRow[],
  spotImage: string
): string | null {
  if (version.image_url) return version.image_url;
  const isOriginal =
    version.id === versions[0]?.id ||
    versions.indexOf(version) === 0;
  if (isOriginal && spotImage) return spotImage;
  return null;
}

export function findActiveZoneCenter(
  spots: { lat: number; lng: number }[]
): { latitude: number; longitude: number; zoom: number } {
  const defaultView = { latitude: 4.6097, longitude: -74.0817, zoom: 13 };

  if (spots.length === 0) return defaultView;
  if (spots.length === 1) {
    return { latitude: spots[0].lat, longitude: spots[0].lng, zoom: 15 };
  }

  const cellSize = 0.008;
  const cells = new Map<
    string,
    { count: number; latSum: number; lngSum: number }
  >();

  for (const spot of spots) {
    const key = `${Math.floor(spot.lat / cellSize)}_${Math.floor(spot.lng / cellSize)}`;
    const cell = cells.get(key) || { count: 0, latSum: 0, lngSum: 0 };
    cell.count += 1;
    cell.latSum += spot.lat;
    cell.lngSum += spot.lng;
    cells.set(key, cell);
  }

  let best = { count: 0, latSum: 0, lngSum: 0 };
  cells.forEach((cell) => {
    if (cell.count > best.count) best = cell;
  });

  const zoom =
    best.count >= 8 ? 14 : best.count >= 4 ? 14.5 : best.count >= 2 ? 15 : 15.5;

  return {
    latitude: best.latSum / best.count,
    longitude: best.lngSum / best.count,
    zoom,
  };
}

export async function createFeedPost(params: {
  spotId: string;
  versionId: string;
  author: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  latitude: number;
  longitude: number;
  userId: string;
  category?: string;
}) {
  const { error } = await supabase.from('posts').insert([
    {
      spot_id: params.spotId,
      version_id: params.versionId,
      author: params.author,
      title: params.title,
      description: params.description || null,
      image_url: params.imageUrl || null,
      latitude: params.latitude,
      longitude: params.longitude,
      user_id: params.userId,
      category: params.category || 'actualización',
      likes: 0,
      comments_count: 0,
      created_at: new Date().toISOString(),
    },
  ]);

  if (error) {
    console.warn('No se pudo crear la publicación en el feed:', error.message);
  }
}

export async function deleteSpotCascade(spotId: string) {
  const { data: posts } = await supabase
    .from('posts')
    .select('id')
    .eq('spot_id', spotId);

  const postIds = posts?.map((p) => p.id) || [];

  if (postIds.length > 0) {
    await supabase.from('post_comments').delete().in('post_id', postIds);
    await supabase.from('posts').delete().eq('spot_id', spotId);
  }

  await supabase.from('spot_versions').delete().eq('spot_id', spotId);

  const { error } = await supabase.from('spots').delete().eq('id', spotId);
  return error;
}
