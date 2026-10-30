// `name` is a sprite symbol id: "u-*" for monochrome UI icons, "i-*" for coloured ones.
export function Icon({ name, size = 16 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} aria-hidden="true">
      <use href={`#${name}`} />
    </svg>
  )
}
