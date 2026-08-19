import {
  searchAddressByAmphoe,
  searchAddressByDistrict,
  searchAddressByProvince,
  searchAddressByZipcode,
} from 'thai-address-database';

export interface ThaiAddressMatch {
  tambon?: string;
  amphoe?: string;
  province: string;
  zipcode?: string;
}

export type ThaiAddressField = 'tambon' | 'amphoe' | 'province' | 'zipcode';

const SEARCHERS: Record<ThaiAddressField, (q: string, maxResult?: number) => { district: string; amphoe: string; province: string; zipcode: string | number }[]> = {
  tambon: searchAddressByDistrict,
  amphoe: searchAddressByAmphoe,
  province: searchAddressByProvince,
  zipcode: searchAddressByZipcode,
};

/** Same subdistrict name can repeat across provinces (e.g. หนองบัว) — always show
 * the full ตำบล/อำเภอ/จังหวัด/รหัสไปรษณีย์ combo, never just the matched field alone. */
export function searchThaiAddress(field: ThaiAddressField, query: string, maxResult = 8): ThaiAddressMatch[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const raw = SEARCHERS[field](trimmed, maxResult);

  // จังหวัด is unambiguous by itself (unlike ตำบล, which repeats across many
  // provinces) — showing up to 8 arbitrary ตำบลs from inside the matched
  // province was confusing when the customer is just confirming the province
  // name, so collapse to one suggestion per distinct province instead, and
  // leave tambon/amphoe/zipcode out of the match entirely (fillFromMatch only
  // touches fields present on the match, so this never clears what's already
  // been filled in on the other fields).
  if (field === 'province') {
    const seenProvince = new Set<string>();
    const provinceOut: ThaiAddressMatch[] = [];
    for (const r of raw) {
      const province = String(r.province);
      if (seenProvince.has(province)) continue;
      seenProvince.add(province);
      provinceOut.push({ province });
    }
    return provinceOut;
  }

  const seen = new Set<string>();
  const out: ThaiAddressMatch[] = [];
  for (const r of raw) {
    const match: ThaiAddressMatch = {
      tambon: String(r.district),
      amphoe: String(r.amphoe),
      province: String(r.province),
      zipcode: String(r.zipcode),
    };
    const key = `${match.tambon}|${match.amphoe}|${match.province}|${match.zipcode}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(match);
  }
  return out;
}
