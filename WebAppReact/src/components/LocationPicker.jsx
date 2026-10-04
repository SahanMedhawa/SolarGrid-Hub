import MapboxLocationMap from './MapboxLocationMap';

const DEFAULT_CENTER = { lat: 7.8731, lng: 80.7718 };
const ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

export default function LocationPicker({ latitude, longitude, onChange }) {
  const hasPosition = latitude !== '' && longitude !== '' && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));
  const position = hasPosition
    ? { latitude: Number(latitude), longitude: Number(longitude) }
    : null;
  const center = position
    ? { lat: position.latitude, lng: position.longitude }
    : DEFAULT_CENTER;

  async function handleLocationSelect(location) {
    let address = location.address || '';
    if (!address && ACCESS_TOKEN) {
      try {
        const url = new URL('https://api.mapbox.com/search/geocode/v6/reverse');
        url.searchParams.set('longitude', String(location.longitude));
        url.searchParams.set('latitude', String(location.latitude));
        url.searchParams.set('access_token', ACCESS_TOKEN);
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          address = data.features?.[0]?.properties?.full_address || data.features?.[0]?.properties?.name || '';
        }
      } catch {
        // The selected coordinates are still saved if address lookup is unavailable.
      }
    }
    onChange({
      latitude: Number(location.latitude).toFixed(6),
      longitude: Number(location.longitude).toFixed(6),
      address: address || undefined
    });
  }

  return (
    <div className="form-group">
      <MapboxLocationMap
        center={center}
        zoom={position ? 15 : 7}
        height="280px"
        markerPosition={position}
        draggableMarker
        onLocationSelect={handleLocationSelect}
      />
      <small className="text-muted">
        {hasPosition
          ? `Selected: ${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`
          : 'Search for a place or click the map to select a location.'}
      </small>
    </div>
  );
}
