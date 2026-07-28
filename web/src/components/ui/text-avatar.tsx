type TextAvatarSize = 'md' | 'sm';

export interface TextAvatarProps {
  initials: string;
  label: string;
  size?: TextAvatarSize;
}

export function TextAvatar({ initials, label, size = 'sm' }: TextAvatarProps) {
  return (
    <span
      aria-label={label}
      className={`cn-text-avatar cn-text-avatar-${size}`}
      data-cenio-text-avatar="true"
    >
      {initials}
    </span>
  );
}
