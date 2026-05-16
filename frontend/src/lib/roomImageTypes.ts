export type RoomImageRow = {
  id: number;
  url: string;
  is_primary: boolean;
  original_name: string;
  /** API marks rows whose storage key is missing or invalid (e.g. failed R2 upload). */
  broken?: boolean;
};
