export function fmtBytes(b: number): string {
  if (b < 1024) return b + ' B';
  if (b < 1024 ** 2) return (b / 1024).toFixed(1) + ' KB';
  if (b < 1024 ** 3) return (b / 1024 ** 2).toFixed(1) + ' MB';
  return (b / 1024 ** 3).toFixed(2) + ' GB';
}

export type FileIconKind = 'image' | 'video' | 'audio' | 'pdf' | 'archive' | 'text' | 'code' | 'file';

export function fileIconKind(mime: string): FileIconKind {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.includes('pdf')) return 'pdf';
  if (mime.includes('zip') || mime.includes('tar') || mime.includes('gzip') || mime.includes('7z') || mime.includes('rar')) return 'archive';
  if (mime.includes('javascript') || mime.includes('typescript') || mime.includes('python') || mime.includes('html') || mime.includes('css')) return 'code';
  if (mime.startsWith('text/') || mime.includes('json') || mime.includes('xml') || mime.includes('csv')) return 'text';
  return 'file';
}

export function isImage(mime: string): boolean {
  return mime.startsWith('image/');
}

export function isVideo(mime: string): boolean {
  return mime.startsWith('video/');
}

export function fmtSpeed(bps: number): string {
  if (bps <= 0) return '';
  if (bps < 1024) return `${Math.round(bps)} B/s`;
  if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(1)} KB/s`;
  return `${(bps / 1024 / 1024).toFixed(1)} MB/s`;
}

export function fmtEta(secs: number): string {
  if (secs <= 0) return '';
  if (secs < 60) return `~${Math.ceil(secs)}s left`;
  if (secs < 3600) return `~${Math.floor(secs / 60)}m ${Math.round(secs % 60)}s left`;
  return `~${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m left`;
}
