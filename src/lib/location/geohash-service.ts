/**
 * Privacy-Preserving Location Service
 * Uses geohashing to provide approximate location without revealing exact coordinates
 */

/**
 * Geohash precision levels:
 * 1: ±2500 km
 * 2: ±630 km
 * 3: ±78 km
 * 4: ±20 km  <- Used for city-level matching
 * 5: ±2.4 km <- Used for neighborhood matching
 * 6: ±610 m
 * 7: ±76 m
 * 8: ±19 m
 */

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export interface GeohashInfo {
  hash: string;
  precision: number;
  approximateLocation: string;
  privacyLevel: 'city' | 'neighborhood' | 'block';
}

/**
 * Encode coordinates to geohash
 */
export function encodeGeohash(
  latitude: number,
  longitude: number,
  precision: number = 5
): string {
  let lat = latitude;
  let lon = longitude;
  let latRange = [-90, 90];
  let lonRange = [-180, 180];
  let hash = '';
  let bits = 0;
  let bit = 0;
  let ch = 0;

  while (hash.length < precision) {
    if (bit % 2 === 0) {
      // Longitude
      const mid = (lonRange[0] + lonRange[1]) / 2;
      if (lon > mid) {
        ch |= 1 << (4 - bits);
        lonRange[0] = mid;
      } else {
        lonRange[1] = mid;
      }
    } else {
      // Latitude
      const mid = (latRange[0] + latRange[1]) / 2;
      if (lat > mid) {
        ch |= 1 << (4 - bits);
        latRange[0] = mid;
      } else {
        latRange[1] = mid;
      }
    }

    bit++;
    bits++;

    if (bits === 5) {
      hash += BASE32[ch];
      bits = 0;
      ch = 0;
    }
  }

  return hash;
}

/**
 * Decode geohash to coordinates (center of box)
 */
export function decodeGeohash(geohash: string): LocationCoords {
  let latRange = [-90, 90];
  let lonRange = [-180, 180];
  let isEven = true;

  for (let i = 0; i < geohash.length; i++) {
    const ch = BASE32.indexOf(geohash[i]);
    if (ch === -1) throw new Error('Invalid geohash');

    for (let bit = 4; bit >= 0; bit--) {
      const bitValue = (ch >> bit) & 1;

      if (isEven) {
        // Longitude
        const mid = (lonRange[0] + lonRange[1]) / 2;
        if (bitValue === 1) {
          lonRange[0] = mid;
        } else {
          lonRange[1] = mid;
        }
      } else {
        // Latitude
        const mid = (latRange[0] + latRange[1]) / 2;
        if (bitValue === 1) {
          latRange[0] = mid;
        } else {
          latRange[1] = mid;
        }
      }

      isEven = !isEven;
    }
  }

  return {
    latitude: (latRange[0] + latRange[1]) / 2,
    longitude: (lonRange[0] + lonRange[1]) / 2,
  };
}

/**
 * Calculate distance between two geohashes (approximate, in meters)
 */
export function geohashDistance(hash1: string, hash2: string): number {
  const coord1 = decodeGeohash(hash1);
  const coord2 = decodeGeohash(hash2);

  return haversineDistance(coord1, coord2);
}

/**
 * Haversine formula for calculating distance between two coordinates
 */
export function haversineDistance(coord1: LocationCoords, coord2: LocationCoords): number {
  const R = 6371000; // Earth's radius in meters
  const lat1 = (coord1.latitude * Math.PI) / 180;
  const lat2 = (coord2.latitude * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Get user's location with privacy controls
 */
export async function getUserLocation(
  privacyLevel: 'city' | 'neighborhood' | 'block' = 'neighborhood'
): Promise<GeohashInfo> {
  try {
    // Request browser geolocation
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false, // Don't need exact coordinates
        timeout: 10000,
        maximumAge: 300000, // Cache for 5 minutes
      });
    });

    const { latitude, longitude } = position.coords;

    // Determine precision based on privacy level
    const precision = privacyLevel === 'city' ? 4 : privacyLevel === 'neighborhood' ? 5 : 6;

    // Generate geohash
    const hash = encodeGeohash(latitude, longitude, precision);

    // Get approximate location name (would use reverse geocoding API in production)
    const approximateLocation = await getApproximateLocation(latitude, longitude, privacyLevel);

    return {
      hash,
      precision,
      approximateLocation,
      privacyLevel,
    };
  } catch (error) {
    console.error('Failed to get location:', error);
    throw new Error('Location access denied or unavailable');
  }
}

/**
 * Get approximate location name without revealing exact address
 */
async function getApproximateLocation(
  lat: number,
  lon: number,
  privacyLevel: string
): Promise<string> {
  try {
    // Use reverse geocoding API (e.g., Nominatim)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=${
        privacyLevel === 'city' ? 10 : 13
      }`
    );

    const data = await response.json();

    // Return only city/neighborhood, not full address
    if (privacyLevel === 'city') {
      return data.address?.city || data.address?.town || data.address?.village || 'Unknown';
    } else {
      return (
        data.address?.neighbourhood ||
        data.address?.suburb ||
        data.address?.city ||
        'Unknown Area'
      );
    }
  } catch (error) {
    console.error('Failed to get location name:', error);
    return 'Unknown Location';
  }
}

/**
 * Get nearby geohashes for discovery
 * Returns all geohashes within radius
 */
export function getNearbyGeohashes(centerHash: string, radiusKm: number): string[] {
  const nearby: string[] = [centerHash];

  // Get neighbors (8 surrounding geohashes)
  const neighbors = getNeighbors(centerHash);
  nearby.push(...neighbors);

  // For larger radius, include second-order neighbors
  if (radiusKm > 5) {
    neighbors.forEach((neighbor) => {
      const secondOrder = getNeighbors(neighbor);
      nearby.push(...secondOrder);
    });
  }

  // Remove duplicates
  return [...new Set(nearby)];
}

/**
 * Get all 8 neighboring geohashes
 */
function getNeighbors(geohash: string): string[] {
  const coords = decodeGeohash(geohash);
  const precision = geohash.length;

  // Approximate offset for one geohash unit
  const latOffset = precision === 5 ? 0.02 : 0.002;
  const lonOffset = precision === 5 ? 0.02 : 0.002;

  const directions = [
    [0, lonOffset], // East
    [0, -lonOffset], // West
    [latOffset, 0], // North
    [-latOffset, 0], // South
    [latOffset, lonOffset], // NE
    [latOffset, -lonOffset], // NW
    [-latOffset, lonOffset], // SE
    [-latOffset, -lonOffset], // SW
  ];

  return directions.map(([dLat, dLon]) =>
    encodeGeohash(coords.latitude + dLat, coords.longitude + dLon, precision)
  );
}

/**
 * Check if user is within range using ZK-friendly comparison
 */
export function isWithinRange(hash1: string, hash2: string, maxDistanceKm: number): boolean {
  const distance = geohashDistance(hash1, hash2);
  return distance <= maxDistanceKm * 1000; // Convert km to meters
}

/**
 * Convert geohash to uint32 for on-chain storage
 */
export function geohashToUint32(geohash: string): number {
  // Take first 6 characters and convert to number
  const truncated = geohash.substring(0, 6);
  let value = 0;

  for (let i = 0; i < truncated.length; i++) {
    const charValue = BASE32.indexOf(truncated[i]);
    value = value * 32 + charValue;
  }

  return value >>> 0; // Convert to unsigned 32-bit
}

/**
 * Convert uint32 back to geohash
 */
export function uint32ToGeohash(value: number): string {
  let geohash = '';
  let remaining = value;

  for (let i = 0; i < 6; i++) {
    const charValue = remaining % 32;
    geohash = BASE32[charValue] + geohash;
    remaining = Math.floor(remaining / 32);
  }

  return geohash;
}

/**
 * Get privacy-safe distance description
 */
export function getDistanceDescription(distanceMeters: number): string {
  if (distanceMeters < 1000) {
    return 'Less than 1 km away';
  } else if (distanceMeters < 5000) {
    return 'Within 5 km';
  } else if (distanceMeters < 10000) {
    return 'Within 10 km';
  } else if (distanceMeters < 25000) {
    return 'Within 25 km';
  } else if (distanceMeters < 50000) {
    return 'Within 50 km';
  } else {
    return '50+ km away';
  }
}
