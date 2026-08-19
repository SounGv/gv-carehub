'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { Check, Loader2, LocateFixed, MapPin, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const AddressMapInner = dynamic(() => import('./address-map-inner'), {
  ssr: false,
  loading: () => <div className="flex h-72 items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-400">กำลังโหลดแผนที่...</div>,
});

export interface MapAddressResult {
  house_no?: string;
  road?: string;
  tambon?: string;
  amphoe?: string;
  province?: string;
  zipcode?: string;
}

const DEFAULT_CENTER: [number, number] = [13.7563, 100.5018]; // Bangkok
const DEFAULT_ZOOM = 6;

/** OpenStreetMap contributors don't tag Thai admin levels consistently (Bangkok
 * เขต/แขวง land in different keys than upcountry อำเภอ/ตำบล), so each field tries
 * several fallback keys rather than trusting one — the customer can still fix
 * whatever comes back wrong or blank before submitting. */
function mapNominatimAddress(addr: Record<string, string> | undefined): MapAddressResult {
  if (!addr) return {};
  return {
    house_no: addr.house_number || '',
    road: addr.road || '',
    tambon: addr.suburb || addr.village || addr.hamlet || addr.quarter || addr.neighbourhood || '',
    amphoe: addr.city_district || addr.county || addr.district || addr.town || '',
    province: addr.state || addr.province || '',
    zipcode: addr.postcode || '',
  };
}

export function AddressMapPicker({ onSelect }: { onSelect: (result: MapAddressResult) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [marker, setMarker] = useState<[number, number] | null>(null);
  const [label, setLabel] = useState('');
  const [locating, setLocating] = useState(false);

  async function reverseGeocode(lat: number, lon: number) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=th&addressdetails=1`,
      );
      const data = await res.json();
      setLabel(data.display_name || '');
      onSelect(mapNominatimAddress(data.address));
    } catch {
      // Lookup failed — the pin is still placed, customer fills the fields manually.
    }
  }

  function handlePick(lat: number, lon: number) {
    setMarker([lat, lon]);
    reverseGeocode(lat, lon);
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      toast.error('อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง กรุณาเลือกตำแหน่งเองบนแผนที่');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCenter([latitude, longitude]);
        setZoom(17);
        setMarker([latitude, longitude]);
        reverseGeocode(latitude, longitude);
        setLocating(false);
      },
      () => {
        setLocating(false);
        toast.error('ไม่สามารถระบุตำแหน่งได้ กรุณาอนุญาตการเข้าถึงตำแหน่ง หรือเลือกตำแหน่งเองบนแผนที่');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function handleSearch() {
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(trimmed)}&countrycodes=th&addressdetails=1&limit=1&accept-language=th`,
      );
      const results = await res.json();
      const first = results[0];
      if (!first) return;
      const lat = Number(first.lat);
      const lon = Number(first.lon);
      setCenter([lat, lon]);
      setZoom(16);
      setMarker([lat, lon]);
      setLabel(first.display_name || '');
      onSelect(mapNominatimAddress(first.address));
    } finally {
      setSearching(false);
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <MapPin className="h-4 w-4" /> เลือกที่อยู่จากแผนที่
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      {/* Not a <form>: this whole picker sits inside the wizard's own outer <form>, and nested forms are invalid HTML. */}
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSearch();
            }
          }}
          placeholder="พิมพ์ที่อยู่หรือชื่อสถานที่ แล้วกดค้นหา"
        />
        <Button type="button" variant="outline" onClick={handleSearch} disabled={searching}>
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
        <Button type="button" variant="outline" onClick={handleUseMyLocation} disabled={locating} title="ตำแหน่งของฉัน">
          {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
          <span className="hidden sm:inline">ตำแหน่งของฉัน</span>
        </Button>
      </div>
      <AddressMapInner center={center} zoom={zoom} marker={marker} onPick={handlePick} />
      {label && <p className="text-xs text-slate-500">{label}</p>}
      <p className="text-xs text-slate-400">
        คลิกหรือลากหมุดบนแผนที่เพื่อเลือกตำแหน่ง ระบบจะกรอกที่อยู่ให้อัตโนมัติ (กรุณาตรวจสอบความถูกต้องอีกครั้งก่อนส่ง)
      </p>
      <div className="flex justify-end">
        <Button type="button" variant="brand" onClick={() => setOpen(false)} disabled={!marker}>
          <Check className="h-4 w-4" /> ยืนยันตำแหน่ง
        </Button>
      </div>
    </div>
  );
}
