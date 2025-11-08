/**
 * Geolocation Utility
 * Handles automatic location detection and reverse geocoding
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface LocationResult {
  coordinates: Coordinates;
  address?: string;
  error?: string;
}

/**
 * Get user's current location using browser Geolocation API
 */
export async function getCurrentLocation(): Promise<LocationResult> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({
        coordinates: { latitude: 0, longitude: 0 },
        error: 'Geolocation is not supported by your browser'
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coordinates: Coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };

        // Try to get address from coordinates
        const address = await reverseGeocode(coordinates);

        resolve({
          coordinates,
          address
        });
      },
      (error) => {
        let errorMessage = 'Unable to retrieve your location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location access.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }

        resolve({
          coordinates: { latitude: 0, longitude: 0 },
          error: errorMessage
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // Cache for 5 minutes
      }
    );
  });
}

/**
 * Reverse geocode coordinates to human-readable address
 * Uses Nominatim (OpenStreetMap) - free, no API key required
 */
export async function reverseGeocode(coords: Coordinates): Promise<string | undefined> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'ErrandBit/1.0'
        }
      }
    );

    if (!response.ok) {
      return undefined;
    }

    const data = await response.json();
    
    // Format address nicely
    const address = data.address;
    const parts = [];
    
    if (address.road) parts.push(address.road);
    if (address.house_number) parts.push(address.house_number);
    if (address.suburb || address.neighbourhood) parts.push(address.suburb || address.neighbourhood);
    if (address.city || address.town) parts.push(address.city || address.town);
    if (address.state) parts.push(address.state);
    
    return parts.join(', ') || data.display_name;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return undefined;
  }
}

/**
 * Calculate distance between two coordinates in kilometers
 * Uses Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Format distance for display
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}

/**
 * Check if location permissions are granted
 */
export async function checkLocationPermission(): Promise<boolean> {
  if (!navigator.permissions) {
    return false;
  }

  try {
    const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    return result.state === 'granted';
  } catch {
    return false;
  }
}

/**
 * Request location permission
 */
export async function requestLocationPermission(): Promise<boolean> {
  try {
    const location = await getCurrentLocation();
    return !location.error;
  } catch {
    return false;
  }
}
