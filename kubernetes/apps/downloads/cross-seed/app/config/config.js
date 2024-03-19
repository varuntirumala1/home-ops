module.exports = {
  delay: 20,
  qbittorrentUrl: "http://qbittorrent.downloads.svc.cluster.local:8080",
  torznab: [
    "http://prowlarr.downloads.svc.cluster.local:9696/5/api?apikey={{ .API_KEY }}",  // tl
    "http://prowlarr.downloads.svc.cluster.local:9696/4/api?apikey={{ .API_KEY }}",  // ipt
    "http://prowlarr.downloads.svc.cluster.local:9696/73/api?apikey={{ .API_KEY }}",  // fnp
    "http://prowlarr.downloads.svc.cluster.local:9696/106/api?apikey={{ .API_KEY }}", // dc
    "http://prowlarr.downloads.svc.cluster.local:9696/71/api?apikey={{ .API_KEY }}", // oe
    "http://prowlarr.downloads.svc.cluster.local:9696/107/api?apikey={{ .API_KEY }}", // ulcx
    "http://prowlarr.downloads.svc.cluster.local:9696/141/api?apikey={{ .API_KEY }}", // ar
    "http://prowlarr.downloads.svc.cluster.local:9696/142/api?apikey={{ .API_KEY }}", // hds
  ],
  action: "inject",
  includeEpisodes: true,
  includeNonVideos: true,
  duplicateCategories: true,
  matchMode: "safe",
  skipRecheck: true,
  linkType: "hardlink",
  linkDir: "/media/torrents/cross-seed",
  dataDirs: [
    "/media/torrents/prowlarr",
    "/media/torrents/movies",
    "/media/torrents/tv",
  ],
  maxDataDepth: 1,
  outputDir: "/config/xseeds",
  torrentDir: "/config/qBittorrent/BT_backup",
};
