import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
const DEFAULT_CENTER = { lat: 7.8731, lng: 80.7718 };

export default function MapboxLocationMap({
  height = '280px',
  center = DEFAULT_CENTER,
  zoom = 12,
  markers = [],
  markerPosition = null,
  draggableMarker = false,
  onLocationSelect,
  onMarkerClick,
  fitAllOnLoad = false,
  showOverviewButton = false
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const pointMarkerRef = useRef(null);
  const nodeMarkersRef = useRef([]);
  const callbacksRef = useRef({ onLocationSelect, onMarkerClick });
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState('');

  callbacksRef.current = { onLocationSelect, onMarkerClick };
  const markerSignature = useMemo(
    () => markers.map(marker => `${marker.id}:${marker.longitude ?? marker.lng},${marker.latitude ?? marker.lat}:${marker.label ?? marker.name}`).join('|'),
    [markers]
  );

  useEffect(() => {
    if (!ACCESS_TOKEN) {
      setMapError('Set VITE_MAPBOX_ACCESS_TOKEN in WebAppReact/.env to load the map.');
      return undefined;
    }
    mapboxgl.accessToken = ACCESS_TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [center.lng, center.lat],
      zoom,
      attributionControl: true
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    map.on('load', () => setMapReady(true));
    map.on('error', event => {
      const message = event?.error?.message || '';
      if (/401|unauthorized|access token/i.test(message)) setMapError('Mapbox rejected the access token. Check VITE_MAPBOX_ACCESS_TOKEN.');
    });
    map.on('click', event => {
      callbacksRef.current.onLocationSelect?.({
        latitude: event.lngLat.lat,
        longitude: event.lngLat.lng,
        address: ''
      });
    });
    mapRef.current = map;
    return () => {
      setMapReady(false);
      map.remove();
      mapRef.current = null;
    };
    // The map instance is initialized once; camera updates are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    mapRef.current.jumpTo({ center: [Number(center.lng), Number(center.lat)], zoom });
  }, [mapReady, center.lat, center.lng, zoom]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    pointMarkerRef.current?.remove();
    pointMarkerRef.current = null;
    if (!markerPosition) return;

    const marker = new mapboxgl.Marker({ color: '#16a34a', draggable: draggableMarker })
      .setLngLat([Number(markerPosition.longitude), Number(markerPosition.latitude)])
      .addTo(mapRef.current);
    if (draggableMarker) {
      marker.on('dragend', () => {
        const position = marker.getLngLat();
        callbacksRef.current.onLocationSelect?.({ latitude: position.lat, longitude: position.lng, address: '' });
      });
    }
    pointMarkerRef.current = marker;
    return () => {
      marker.remove();
      if (pointMarkerRef.current === marker) pointMarkerRef.current = null;
    };
  }, [mapReady, markerPosition?.latitude, markerPosition?.longitude, draggableMarker]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    nodeMarkersRef.current.forEach(marker => marker.remove());
    nodeMarkersRef.current = markers.map(node => {
      const marker = new mapboxgl.Marker({ color: node.color || '#16a34a' })
        .setLngLat([Number(node.longitude ?? node.lng), Number(node.latitude ?? node.lat)])
        .addTo(mapRef.current);
      if (node.label || node.name) marker.setPopup(new mapboxgl.Popup({ offset: 24 }).setText(node.label || node.name));
      if (onMarkerClick && node.onClickData) {
        marker.getElement().addEventListener('click', event => {
          event.stopPropagation();
          callbacksRef.current.onMarkerClick?.(node.onClickData);
        });
      }
      return marker;
    });

    if (fitAllOnLoad && markers.length > 0) fitAllMarkers();
    // markerSignature captures coordinates and labels without rerunning for parent renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, markerSignature, fitAllOnLoad]);

  const fitAllMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map || markers.length === 0) return;
    if (markers.length === 1) {
      const marker = markers[0];
      map.flyTo({ center: [Number(marker.longitude ?? marker.lng), Number(marker.latitude ?? marker.lat)], zoom: 12 });
      return;
    }
    const bounds = new mapboxgl.LngLatBounds();
    markers.forEach(marker => bounds.extend([Number(marker.longitude ?? marker.lng), Number(marker.latitude ?? marker.lat)]));
    map.fitBounds(bounds, { padding: 56, maxZoom: 13, duration: 500 });
  }, [markers]);

  return (
    <div style={{ position: 'relative', width: '100%', height, minHeight: '220px', borderRadius: '8px', overflow: 'hidden' }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      {showOverviewButton && markers.length > 0 && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={fitAllMarkers} style={{ position: 'absolute', zIndex: 2, bottom: 12, left: 12 }}>
          Show all points
        </button>
      )}
      {mapError && <div role="alert" style={{ position: 'absolute', zIndex: 3, inset: 'auto 10px 10px', padding: '8px 10px', borderRadius: 6, background: '#fff', color: '#b91c1c' }}>{mapError}</div>}
    </div>
  );
}
