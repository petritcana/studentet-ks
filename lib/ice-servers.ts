/** Serverat ICE: STUN publik, plus TURN kur është konfiguruar (rrjetet që e bllokojnë lidhjen e drejtë). */
export function iceServers() {
  const servers: { urls: string | string[]; username?: string; credential?: string }[] = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ];
  const turn = process.env.VOICE_TURN_URLS?.split(",").map((url) => url.trim()).filter(Boolean);
  if (turn?.length) {
    servers.push({
      urls: turn,
      username: process.env.VOICE_TURN_USERNAME,
      credential: process.env.VOICE_TURN_CREDENTIAL,
    });
  }
  return servers;
}
