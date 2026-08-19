declare module 'thai-address-database' {
  export interface ThaiAddressEntry {
    district: string;
    amphoe: string;
    province: string;
    zipcode: string | number;
  }

  export function searchAddressByDistrict(query: string, maxResult?: number): ThaiAddressEntry[];
  export function searchAddressByAmphoe(query: string, maxResult?: number): ThaiAddressEntry[];
  export function searchAddressByProvince(query: string, maxResult?: number): ThaiAddressEntry[];
  export function searchAddressByZipcode(query: string, maxResult?: number): ThaiAddressEntry[];
  export function splitAddress(fullAddress: string): {
    address: string;
    district: string;
    amphoe: string;
    province: string;
    zipcode: string;
  } | null;
}
