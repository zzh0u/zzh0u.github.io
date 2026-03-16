export const SITE = {
  website: "https://zzh0u.github.io/",
  author: "Jovi Zhou",
  title: "0x772B",
  profile: "https://github.com/zzh0u",
  desc: "请洒潘江，各倾陆海云尔",
  ogImage: "Akaza.webp", // located in the public folder
  lightAndDarkMode: true,
  postPerIndex: 6,
  postPerPage: 9,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: true,
  showGalleries: true,
  showBackButton: true, // show back button in post detail
  editPost: {
    enabled: false,
    text: "Edit this post",
    url: "https://github.com/zzh0u/zzh0u.github.io/edit/main/",
  },
  dynamicOgImage: true,
  dir: "ltr", // "rtl" | "auto"
  lang: "en", // html lang code. Set this empty and default will be "en"
  timezone: "Asia/Shanghai", // Default global timezone (IANA format) 
  introAudio: {
    enabled: true, // show/hide the player in the hero
    src: "/audio/intro-web.mp3", // path to the file (relative to /public)
    label: "INTRO.MP3", // display label in the player
    duration: 30, // duration in seconds (for the fixed progress bar)
  },
} as const;
