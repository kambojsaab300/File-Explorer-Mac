// `name` is a sprite symbol id: "u-*" for monochrome UI icons, "i-*" for coloured ones.
export function Icon({ name, size = 16, className }: { name: string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} aria-hidden="true" className={className}>
      <use href={`#${name}`} />
    </svg>
  )
}
