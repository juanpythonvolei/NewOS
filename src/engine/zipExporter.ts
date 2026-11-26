import JSZip from 'jszip';
import { AetherConfig, GeneratedSourceFile } from '../types/aether';

export async function exportAetherBundleZip(
  config: AetherConfig,
  files: GeneratedSourceFile[]
): Promise<{ filename: string; sizeBytes: number; fileCount: number }> {
  const zip = new JSZip();
  const slug = config.visual.osName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'aetheros';

  const rootFolder = zip.folder(`${slug}-src`) ?? zip;

  for (const file of files) {
    rootFolder.file(file.path, file.content);
  }

  // Also include the exact workstation configuration JSON for re-importing later
  rootFolder.file('workstation-profile.json', JSON.stringify(config, null, 2));

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const filename = `${slug}-${config.visual.osVersion}-source-bundle.zip`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1500);

  return {
    filename,
    sizeBytes: blob.size,
    fileCount: files.length + 1,
  };
}
