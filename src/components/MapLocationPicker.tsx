import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Input } from '@/components/ui/input';
import { MapPin } from 'lucide-react';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

interface MapLocationPickerProps {
  value: string;
  onChange: (location: string) => void;
}

export default function MapLocationPicker({ value, onChange }: MapLocationPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [isMapOpen, setIsMapOpen] = useState(false);

  useEffect(() => {
    if (!isMapOpen || !mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [78.4867, 17.385],
      zoom: 12,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    marker.current = new mapboxgl.Marker({ draggable: true, color: 'hsl(var(--primary))' })
      .setLngLat([78.4867, 17.385])
      .addTo(map.current);

    const reverseGeocode = async (lng: number, lat: number) => {
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}`
        );
        const data = await res.json();
        if (data.features?.length > 0) {
          onChange(data.features[0].place_name);
        } else {
          onChange(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
      } catch {
        onChange(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    };

    marker.current.on('dragend', () => {
      const lngLat = marker.current!.getLngLat();
      reverseGeocode(lngLat.lng, lngLat.lat);
    });

    map.current.on('click', (e) => {
      marker.current!.setLngLat(e.lngLat);
      reverseGeocode(e.lngLat.lng, e.lngLat.lat);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [isMapOpen]);

  const handleSearch = async (query: string) => {
    onChange(query);
    if (query.length < 3) return;
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxgl.accessToken}&limit=1`
      );
      const data = await res.json();
      if (data.features?.length > 0 && map.current && marker.current) {
        const [lng, lat] = data.features[0].center;
        map.current.flyTo({ center: [lng, lat], zoom: 15 });
        marker.current.setLngLat([lng, lat]);
      }
    } catch {
      // silent
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          placeholder="Search or click on map to set location"
          value={value}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => setIsMapOpen(true)}
          required
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setIsMapOpen(!isMapOpen)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
        >
          <MapPin className="h-5 w-5" />
        </button>
      </div>
      {isMapOpen && (
        <div
          ref={mapContainer}
          className="h-[250px] w-full rounded-lg border border-border overflow-hidden"
        />
      )}
    </div>
  );
}
