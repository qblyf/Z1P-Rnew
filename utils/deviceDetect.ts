/**
 * 检测设备类型
 * @returns 'mobile' | 'desktop'
 */
export function detectDeviceType(): 'mobile' | 'desktop' {
  if (typeof window === 'undefined') {
    return 'desktop';
  }

  const userAgent = window.navigator.userAgent.toLowerCase();

  // 常见的移动设备标识
  const mobilePatterns = [
    /android/,
    /webos/,
    /iphone/,
    /ipad/,
    /ipod/,
    /blackberry/,
    /windows phone/,
    /opera mini/,
    /mobile/,
  ];

  return mobilePatterns.some(pattern => pattern.test(userAgent))
    ? 'mobile'
    : 'desktop';
}
