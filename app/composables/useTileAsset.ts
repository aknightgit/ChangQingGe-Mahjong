const tileAssetModules = import.meta.glob('../../assets/tileset/**/*.{png,jpg,jpeg,webp}', {
  eager: true,
  import: 'default',
}) as Record<string, string>

const tileAssetMap = new Map<string, string>()
for (const [path, url] of Object.entries(tileAssetModules)) {
  const normalized = path.replace('../../assets/tileset/', '')
  tileAssetMap.set(normalized, url)
}

export const getTileAssetUrl = (relativePath: string): string | null => {
  return tileAssetMap.get(relativePath) || null
}
