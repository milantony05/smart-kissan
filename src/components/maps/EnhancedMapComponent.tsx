import React, { useState, useEffect, useRef } from 'react';
import MapComponent from './MapComponent';
import { useUser } from '../../contexts/UserContext';
import useTranslation from '../../hooks/useTranslation';

interface EnhancedMapComponentProps {
  markers?: {
    position: [number, number];
    title: string;
    popup?: string;
  }[];
  height?: string;
  width?: string;
  onMapClick?: (e: L.LeafletMouseEvent) => void;
  showSatellite?: boolean;
  showCurrentLocationButton?: boolean;
  onLocationDetected?: (location: [number, number]) => void;
  zoomLevel?: number;
}

const EnhancedMapComponent: React.FC<EnhancedMapComponentProps> = ({
  markers = [],
  height,
  width,
  onMapClick,
  showSatellite = false,
  showCurrentLocationButton = true,
  onLocationDetected,
  zoomLevel = 13,
}) => {
  const { preferences, updatePreferences } = useUser();
  const { t } = useTranslation();
  const [center, setCenter] = useState<[number, number]>(preferences.defaultLocation);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [currentLocationMarker, setCurrentLocationMarker] = useState<{
    position: [number, number];
    title: string;
    popup: string;
  } | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  
  // When preferences change, update the center but don't detect location automatically
  useEffect(() => {
    setCenter(preferences.defaultLocation);
  }, [preferences.defaultLocation]);

  // Save map reference when it becomes available
  const handleMapReady = (map: L.Map) => {
    mapRef.current = map;
  };

  // Detect user's current location only when requested
  const detectCurrentLocation = () => {
    if ('geolocation' in navigator) {
      setIsLocating(true);
      setLocationError('');
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation: [number, number] = [
            position.coords.latitude,
            position.coords.longitude,
          ];
          // Update the center and add the marker
          setCenter(newLocation);
          
          // If we have a map reference, set the view with the desired zoom level
          if (mapRef.current) {
            mapRef.current.setView(newLocation, zoomLevel);
          }
          
          setCurrentLocationMarker({
            position: newLocation,
            title: 'Your Location',
            popup: 'You are here'
          });
          
          // Save to preferences if the user has opted in
          if (preferences.useCurrentLocation) {
            updatePreferences({ defaultLocation: newLocation });
          }
          
          // Notify parent component of the detected location
          if (onLocationDetected) {
            onLocationDetected(newLocation);
          }
          
          setIsLocating(false);
        },
        (error) => {
          setLocationError(t('map.locationPermission'));
          setIsLocating(false);
          console.error('Error getting location:', error);
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    } else {
      setLocationError('Geolocation is not supported by your browser');
    }
  };

  // Combine the current location marker with other markers if available
  const allMarkers = [
    ...markers,
    ...(currentLocationMarker ? [currentLocationMarker] : [])
  ];

  return (
    <div className="relative">
      <MapComponent
        center={center}
        zoom={10}
        markers={allMarkers}
        height={height}
        width={width}
        onMapClick={onMapClick}
        showSatellite={showSatellite}
        onMapReady={handleMapReady}
      />
      
      {showCurrentLocationButton && (
        <div className="absolute top-4 right-4 z-[1000]">
          <div className="relative">
            <button
              onClick={detectCurrentLocation}
              disabled={isLocating}
              className="bg-white p-2 rounded-md shadow-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-white"
              title={t('settings.useCurrentLocation')}
              aria-label="Detect my location"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onFocus={() => setShowTooltip(true)}
              onBlur={() => setShowTooltip(false)}
            >
              {isLocating ? (
                <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            
            {showTooltip && (
              <div className="absolute right-0 mt-2 w-64 p-2 bg-white dark:bg-gray-800 rounded-md shadow-lg z-[1001] text-xs border border-gray-200 dark:border-gray-700">
                <div className="text-gray-700 dark:text-gray-300">
                  <strong>Privacy Notice:</strong> Clicking this button will request your current location. Your location data is only used for this session and is not stored unless you enable "Use Current Location" in settings.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {locationError && (
        <div className="absolute bottom-4 left-4 right-4 bg-red-100 text-red-700 p-3 rounded-md shadow-md z-[1000] text-sm">
          {locationError}
        </div>
      )}
    </div>
  );
};

export default EnhancedMapComponent;