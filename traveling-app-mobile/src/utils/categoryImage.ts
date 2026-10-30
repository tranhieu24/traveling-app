import Constants from 'expo-constants';

// Short media identifiers fit the existing categories.icon_name column.
// Icons and listing photographs are public assets; admin credentials stay server-side.
export function categoryImage(icon?: string): string | undefined {
  if (!icon || !/^media:[a-f0-9-]{36}\.(jpg|png|webp)$/.test(icon)) return undefined;
  const project = Constants.expoConfig?.extra?.supabaseUrl;
  return project
    ? `${project}/storage/v1/object/public/admin-listing-images/${icon.slice(6)}`
    : undefined;
}
