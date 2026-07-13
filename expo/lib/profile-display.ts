export interface ProfileNameFields {
  username: string;
  display_name: string | null;
}

export function getProfileDisplayName(profile: Pick<ProfileNameFields, 'username' | 'display_name'> | null | undefined) {
  return profile?.display_name?.trim() || profile?.username || '';
}