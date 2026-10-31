export const timeKo = {
  locale: "ko-KR",
  justNow: "방금",
  ago: "전",
  expired: "만료됨",
  expiresSoon: "곧 만료",
  expiresIn: (duration: string) => `${duration} 후 만료`,
  yesterday: (time: string) => `어제 ${time}`,
  tomorrow: (time: string) => `내일 ${time}`,
  seconds: (count: number) => `${count}초`,
  minutes: (count: number) => `${count}분`,
  hours: (count: number) => `${count}시간`,
  days: (count: number) => `${count}일`,
} as const;
