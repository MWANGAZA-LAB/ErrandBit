/**
 * Location Picker Component
 * Auto-detects user location with option to manually pin on map
 */

import { useState, useEffect } from 'react';
import { MapPin, Navigation, Loader } from 'lucide-react';
import { getCurrentLocation, formatDistance, type Coordinates } from '../utils/geolocation';

interface LocationPickerProps {
  onLocationSelect: (lat: number, lng: number, address?: string) => void;
  initialLat?: number;
  initialLng?: number;
  label?: string;
  required?: boolean;
}

export default function LocationPicker({
  onLocationSelect,
  initialLat,
  initialLng,
  label = 'Location',
  required = false
}: LocationPickerProps) {
  const [loading, setLoading] = useState(false);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(
    initialLat && initialLng
      ? { latitude: initialLat, longitude: initialLng }
      : null
  );
  const [address, setAddress] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [useCurrentLocation, setUseCurrentLocation] = useState(true);

  // Auto-detect location on mount
  useEffect(() => {
    if (useCurrentLocation && !coordinates) {
      detectLocation();
    }
  }, []);

  const detectLocation = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await getCurrentLocation();

      if (result.error) {
        setError(result.error);
        setUseCurrentLocation(false);
      } else {
        setCoordinates(result.coordinates);
        setAddress(result.address || 'Location detected');
        onLocationSelect(
          result.coordinates.latitude,
          result.coordinates.longitude,
          result.address
        );
      }
    } catch (err) {
      setError('Failed to detect location');
      setUseCurrentLocation(false);
    } finally {
      setLoading(false);
    }
  };

  const handleManualLocation = () => {
    setUseCurrentLocation(false);
    // In a full implementation, this would open a map picker
    // For now, we'll just show a message
    alert('Map picker coming soon! For now, location will be auto-detected when you create the job.');
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* Auto-detect location button */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={detectLocation}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              <span>Detecting location...</span>
            </>
          ) : (
            <>
              <Navigation className="w-5 h-5" />
              <span>Use Current Location</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleManualLocation}
          className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          title="Pin location on map"
        >
          <MapPin className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Location display */}
      {coordinates && !error && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900">
                {address || 'Location detected'}
              </p>
              <p className="text-xs text-green-700 mt-1">
                {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
                {coordinates.accuracy && (
                  <span className="ml-2">
                    (±{Math.round(coordinates.accuracy)}m accuracy)
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
          <p className="text-xs text-red-600 mt-1">
            You can manually enter an address or enable location permissions in your browser settings.
          </p>
        </div>
      )}

      {/* Help text */}
      <p className="text-xs text-gray-500">
        We'll use your location to show nearby runners and estimate distances.
        Your exact location is never shared publicly.
      </p>
    </div>
  );
}
