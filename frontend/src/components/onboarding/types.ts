export type DraftRoom = {
  clientId: string;
  name: string;
  capacity: number;
  bed_count?: number;
  bed_type?: string;
  check_in_time?: string;
  check_out_time?: string;
  amenities?: string[];
  photo_urls?: string[];
  weekday_price?: number;
  weekend_price?: number;
};

export type Step1Form = {
  name: string;
  email: string;
  contact_number: string;
  birth_date: string;
  personal_tin: string;
  owner_mailing_province_psgc: string | null;
  owner_mailing_city_municipality_psgc: string | null;
  owner_mailing_barangay_psgc: string | null;
  owner_mailing_barangay_name: string | null;
  owner_mailing_street_line: string;
  password: string;
  password_confirmation: string;
  accept_terms: boolean;
  accept_privacy: boolean;
  accept_information_certification: boolean;
};

export type Step2Form = {
  no_registered_business: boolean;
  business_name: string;
  business_address: string;
  business_contact_number: string;
  business_tin: string;
  sec_dti_number: string;
};

export type Step3Form = {
  property_name: string;
  hospitality_type: string;
  hospitality_type_other: string;
  planned_room_count: number;
  description: string;
  facebook_url: string;
  instagram_url: string;
  tiktok_url: string;
  website_url: string;
  address_province_psgc: string | null;
  address_city_municipality_psgc: string | null;
  address_barangay_psgc: string | null;
  address_barangay_name: string | null;
  address_street_line: string;
};

export type Step4Form = {
  logo_url: string | null;
  amenities: Record<string, string[]>;
  parking_enabled: boolean;
  parking_slots: number;
  rooms: DraftRoom[];
};

export type Step5Form = {
  rooms: Array<{
    name: string;
    weekday_price: string;
    weekend_price: string;
  }>;
};

export type Step6Form = {
  verification_method: string;
  stable_internet_acknowledged: boolean;
  government_id: File | null;
  property_tour: File | null;
  ownership_proof: File | null;
};
