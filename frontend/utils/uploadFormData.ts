/**
 * FormData용 파일 객체 생성 (Android/iOS 호환)
 * expo-image-picker URI를 multipart 업로드용으로 변환
 * content:// URI 등에서 filename 추출 실패 시 defaultName 사용
 */
export function createFormDataFile(imageUri: string, defaultName = 'image.jpg') {
  const segments = imageUri.split('/');
  let filename = segments[segments.length - 1] || defaultName;
  // content:// URI 등에서 query string 제거
  if (filename.includes('?')) {
    filename = filename.split('?')[0];
  }
  const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
  };
  const type = mimeMap[ext] || 'image/jpeg';
  const name = filename.includes('.') ? filename : defaultName;
  return {
    uri: imageUri,
    type,
    name,
  };
}
