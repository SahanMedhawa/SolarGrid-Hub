import { useState, useRef } from 'react';
import { GoogleMap, Marker, Autocomplete, useJsApiLoader } from '@react-google-maps/api';

// Must be defined outside the component to avoid re-loading the script on every render.
const LIBRARIES = ['places'];
const DEFAULT_CENTER = { lat: 7.8731, lng: 80.7718 }; // Sri Lanka
const MAP_STYLE = { width: '100%', height: '280px', borderRadius: '8px' };

// Lets the user search for a place or click the map to pick coordinates.
// onChange receives { latitude, longitude, address }.
export default function LocationPicker({ latitude, longitude, onChange }) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES
  });
  const autocompleteRef = useRef(null);
  const mapRef = useRef(null);
  const [searchText, setSearchText] = useState('');

  const hasPosition = latitude !== '' && longitude !== '' && !isNaN(latitude) && !isNaN(longitude);
  const position = hasPosition ? { lat: Number(latitude), lng: Number(longitude) } : null;

  // Map click: set coordinates and reverse-geocode an address.
  function handleMapClick(e) {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      const address = status === 'OK' && results[0] ? results[0].formatted_address : '';
      onChange({ latitude: lat.toFixed(6), longitude: lng.toFixed(6), address });
    });
  }

  // Search box: pick a suggested place.
  function handlePlaceChanged() {
    const place = autocompleteRef.current?.getPlace();
    if (!place?.geometry?.location) return;
    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    mapRef.current?.panTo({ lat, lng });
    mapRef.current?.setZoom(15);
    onChange({
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
      address: place.formatted_address || place.name || ''
    });
    setSearchText('');
  }

  // Marker dragged: update coordinates.
  function handleDragEnd(e) {
    onChange({ latitude: e.latLng.lat().toFixed(6), longitude: e.latLng.lng().toFixed(6), address: undefined });
  }

  if (loadError) return <p className="text-muted">Failed to load Google Maps.</p>;
  if (!isLoaded) return <p className="text-muted">Loading map...</p>;

  return (
    <div className="form-group">
      <label className="form-label">Pick Location on Map</label>
      <Autocomplete onLoad={ref => (autocompleteRef.current = ref)} onPlaceChanged={handlePlaceChanged}>
        <input
          className="form-input mb-2"
          placeholder="Search for a place..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && e.preventDefault()} // don't submit the form
        />
      </Autocomplete>
      <GoogleMap
        mapContainerStyle={MAP_STYLE}
        center={position || DEFAULT_CENTER}
        zoom={position ? 15 : 7}
        onLoad={map => (mapRef.current = map)}
        onClick={handleMapClick}
      >
        {position && <Marker position={position} draggable onDragEnd={handleDragEnd} />}
      </GoogleMap>
      <small className="text-muted">
        {hasPosition ? `Selected: ${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}` : 'Click the map or search to select a location.'}
      </small>
    </div>
  );
}