"use client";

import * as React from "react";

/**
 * Zëri i dhomës, drejt mes shfletuesve (WebRTC, rrjet i plotë).
 *
 * Çdo pjesëmarrës lidhet me secilin tjetër. Kush ka të drejtë të flasë e shton
 * mikrofonin në çdo lidhje; dëgjuesit vetëm marrin. Serveri nuk e prek zërin:
 * te `/api/zeri/[id]/sinjal` kalojnë vetëm ofertat, përgjigjet dhe kandidatët.
 * Negocimi ndjek modelin «perfect negotiation», që dy oferta njëkohësisht të mos
 * e bllokojnë lidhjen: njëra palë është e sjellshme dhe tërhiqet.
 *
 * Kush po flet matet këtu, nga vetë zëri që vjen: niveli i çdo rrjedhe lexohet
 * me një analizues dhe unaza ndizet mbi pragun. Pa server, pa vonesë.
 *
 * I njëjti rrjet shërben edhe thirrjet te biseda (`signalUrl` tjetër). Aty kamera
 * ndizet e fiket kur të duash, edhe në thirrje zanore, dhe kthehet përpara ose
 * mbrapa pa e prishur lidhjen. Cilësia është sa jep pajisja: zëri me pastrim
 * jehone e zhurme, pamja deri në 1080p me 30 kuadro, me bitrate të lartë.
 */

type Peer = {
  pc: RTCPeerConnection;
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  pending: RTCIceCandidateInit[];
  audio: HTMLAudioElement | null;
  analyser: AnalyserNode | null;
};

type Signal = { to: string; kind: "offer" | "answer" | "candidate"; payload: string };
export type Facing = "user" | "environment";
/** Ku del zëri i të tjerëve: altoparlanti (zë i lartë) ose te veshi (zë i ulët, privat). */
export type AudioOutput = "speaker" | "earpiece";

/** Te veshi: kur shfletuesi nuk lejon zgjedhjen e daljes, zëri ulet sa për t'u dëgjuar afër. */
const EARPIECE_VOLUME = 0.35;

function isTouchDevice() {
  return typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
}

/**
 * Dalja e zërit për një element. Ku shfletuesi e lejon (`setSinkId`), zgjidhet vërtet
 * pajisja: altoparlanti ose dëgjuesja e telefonit. Ku jo (Safari në iPhone), telefoni
 * vendos vetë daljen, dhe «te veshi» e ul zërin.
 */
async function applyOutput(audio: HTMLAudioElement, output: AudioOutput) {
  audio.dataset.output = output;
  audio.volume = output === "earpiece" ? EARPIECE_VOLUME : 1;
  const element = audio as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> };
  if (!element.setSinkId || !navigator.mediaDevices?.enumerateDevices) return;
  try {
    const outputs = (await navigator.mediaDevices.enumerateDevices()).filter((device) => device.kind === "audiooutput");
    const pattern = output === "earpiece" ? /earpiece|receiver|handset|dëgjuese/i : /speaker|altoparlant/i;
    const match = outputs.find((device) => pattern.test(device.label));
    if (match) {
      await element.setSinkId(match.deviceId);
      // Pajisja e duhur u gjet: zëri mbetet i plotë.
      audio.volume = 1;
    } else if (output === "speaker") {
      await element.setSinkId("");
    }
  } catch {
    // Dalja nuk ndryshoi: mbetet vëllimi.
  }
}

/** Mbi këtë nivel (0 deri 1) quhet se dikush po flet. */
const SPEAKING_LEVEL = 0.045;
const FAST_POLL_MS = 700;
const SLOW_POLL_MS = 2500;

/** Zëri: i pastër dhe i plotë, me pastrimin që bën vetë pajisja. */
const AUDIO: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
  sampleRate: 48_000,
};
/** Sa bit në sekondë për zërin (Opus) dhe pamjen. Shfletuesi ulet vetë kur rrjeti s'mban. */
const AUDIO_BITRATE = 96_000;
const VIDEO_BITRATE = 2_500_000;

function videoConstraints(facing: Facing): MediaTrackConstraints {
  // Në telefon kamera jep pamjen e vet, në këmbë si te aplikacioni i kamerës: pa
  // e detyruar në shtrirje, që të mos pritet. Në kompjuter, deri në 1080p.
  if (isTouchDevice()) return { facingMode: facing, height: { ideal: 1920 }, frameRate: { ideal: 30 } };
  // «ideal», jo «exact»: pajisja jep rezolucionin më të mirë që ka deri në 1080p.
  return { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } };
}

async function tune(sender: RTCRtpSender) {
  const kind = sender.track?.kind;
  if (!kind) return;
  try {
    const params = sender.getParameters();
    if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
    params.encodings[0].maxBitrate = kind === "audio" ? AUDIO_BITRATE : VIDEO_BITRATE;
    if (kind === "video") params.degradationPreference = "balanced";
    await sender.setParameters(params);
  } catch {
    // Disa shfletues nuk e lejojnë para negocimit: provohet prapë kur lidhja hapet.
  }
}

export function useVoiceMesh({
  roomId,
  meId,
  peerIds,
  canTalk,
  muted,
  signalUrl,
  camera = false,
  facing = "user",
  speakerOn = true,
  output = "speaker",
}: {
  roomId: string;
  meId: string;
  /** Të tjerët brenda dhomës tani. */
  peerIds: string[];
  /** Roli im lejon të flas. */
  canTalk: boolean;
  muted: boolean;
  /** Ku kalojnë sinjalet. Parazgjedhja është dhoma e zërit. */
  signalUrl?: string;
  /** Kamera e ndezur tani. */
  camera?: boolean;
  /** Kamera e përparme ose e pasme. */
  facing?: Facing;
  /** Zëri i të tjerëve: i ndezur ose i heshtur te unë. */
  speakerOn?: boolean;
  /** Ku del zëri i të tjerëve. Thirrjet e zgjedhin; dhoma e zërit mbetet te altoparlanti. */
  output?: AudioOutput;
}) {
  const url = signalUrl ?? `/api/zeri/${roomId}/sinjal`;
  const [speaking, setSpeaking] = React.useState<Set<string>>(() => new Set());
  const [streams, setStreams] = React.useState<Record<string, MediaStream>>({});
  const [localStream, setLocalStream] = React.useState<MediaStream | null>(null);
  const [needsGesture, setNeedsGesture] = React.useState(false);
  const [micError, setMicError] = React.useState(false);
  const [cameraError, setCameraError] = React.useState(false);

  const peersRef = React.useRef(new Map<string, Peer>());
  const iceRef = React.useRef<RTCIceServer[]>([{ urls: "stun:stun.l.google.com:19302" }]);
  const localRef = React.useRef<MediaStream | null>(null);
  const localAnalyserRef = React.useRef<AnalyserNode | null>(null);
  const contextRef = React.useRef<AudioContext | null>(null);
  const outboxRef = React.useRef<Signal[]>([]);
  const flushTimerRef = React.useRef<number | null>(null);
  const activityRef = React.useRef(Date.now());
  const mutedRef = React.useRef(muted);
  const speakerRef = React.useRef(speakerOn);
  const outputRef = React.useRef<AudioOutput>(output);

  /** Rrjedha ime e përbashkët: zëri dhe kamera shtohen te e njëjta, që tjetri t'i marrë bashkë. */
  const local = React.useCallback(() => {
    if (!localRef.current) localRef.current = new MediaStream();
    return localRef.current;
  }, []);
  const publishLocal = React.useCallback(() => {
    const stream = localRef.current;
    setLocalStream(stream && stream.getTracks().length > 0 ? new MediaStream(stream.getTracks()) : null);
  }, []);

  const audioContext = React.useCallback(() => {
    if (!contextRef.current) contextRef.current = new AudioContext();
    return contextRef.current;
  }, []);

  const analyserFor = React.useCallback(
    (stream: MediaStream) => {
      const context = audioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      // Vetëm matje: nuk lidhet me daljen, që zëri të mos dëgjohet dy herë.
      context.createMediaStreamSource(new MediaStream(stream.getAudioTracks())).connect(analyser);
      return analyser;
    },
    [audioContext],
  );

  /** Sinjalet grumbullohen dhe dërgohen bashkë: kandidatët ICE vijnë shumë njëherësh. */
  const send = React.useCallback(
    (signal: Signal) => {
      activityRef.current = Date.now();
      outboxRef.current.push(signal);
      if (flushTimerRef.current) return;
      flushTimerRef.current = window.setTimeout(() => {
        flushTimerRef.current = null;
        const batch = outboxRef.current.splice(0, outboxRef.current.length);
        if (batch.length === 0) return;
        void fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ signals: batch }),
        }).catch(() => undefined);
      }, 200);
    },
    [url],
  );

  const closePeer = React.useCallback((id: string) => {
    const peer = peersRef.current.get(id);
    if (!peer) return;
    peer.pc.close();
    if (peer.audio) {
      peer.audio.srcObject = null;
      peer.audio.remove();
    }
    peersRef.current.delete(id);
    setStreams((current) => {
      if (!(id in current)) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);

  /** Shton një gjurmë te lidhja, pa e shtuar dy herë. Videoja zë vendin e transmetuesit të saj. */
  const attach = React.useCallback((pc: RTCPeerConnection, track: MediaStreamTrack, stream: MediaStream) => {
    if (pc.getSenders().some((sender) => sender.track === track)) return;
    if (track.kind === "video") {
      const transceiver = pc.getTransceivers().find((item) => item.receiver.track.kind === "video" && item.currentDirection !== "stopped");
      if (transceiver) {
        void transceiver.sender.replaceTrack(track).then(() => tune(transceiver.sender));
        if (transceiver.direction === "recvonly" || transceiver.direction === "inactive") transceiver.direction = "sendrecv";
        transceiver.sender.setStreams?.(stream);
        return;
      }
    }
    try {
      const sender = pc.addTrack(track, stream);
      void tune(sender);
    } catch {
      // U shtua ndërkohë nga një rrugë tjetër.
    }
  }, []);

  const peerFor = React.useCallback(
    (id: string): Peer => {
      const existing = peersRef.current.get(id);
      if (existing) return existing;

      const pc = new RTCPeerConnection({ iceServers: iceRef.current });
      const peer: Peer = { pc, polite: meId > id, makingOffer: false, ignoreOffer: false, pending: [], audio: null, analyser: null };
      peersRef.current.set(id, peer);

      pc.onicecandidate = ({ candidate }) => {
        if (candidate) send({ to: id, kind: "candidate", payload: JSON.stringify(candidate) });
      };

      pc.onnegotiationneeded = async () => {
        try {
          peer.makingOffer = true;
          await pc.setLocalDescription();
          send({ to: id, kind: "offer", payload: JSON.stringify(pc.localDescription) });
        } catch {
          // Lidhja u mbyll ndërkohë: s'ka çfarë të bëhet.
        } finally {
          peer.makingOffer = false;
        }
      };

      pc.ontrack = (event) => {
        const stream = event.streams[0] ?? new MediaStream([event.track]);
        if (event.track.kind === "audio") {
          if (!peer.audio) {
            const audio = document.createElement("audio");
            audio.autoplay = true;
            audio.dataset.voicePeer = id;
            audio.style.display = "none";
            document.body.appendChild(audio);
            peer.audio = audio;
          }
          // Vetëm zëri: e njëjta rrjedhë në dy elemente (zë dhe pamje) e ndal zërin në iPhone.
          const voice = new MediaStream([event.track]);
          peer.audio.srcObject = voice;
          peer.audio.muted = !speakerRef.current;
          void applyOutput(peer.audio, outputRef.current);
          // Shfletuesi mund ta ndalojë zërin pa një prekje: atëherë del butoni «Dëgjo».
          void peer.audio.play().catch(() => setNeedsGesture(true));
          peer.analyser = analyserFor(voice);
        }
        setStreams((current) => ({ ...current, [id]: stream }));
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") pc.restartIce();
        // Pas lidhjes bitrate-i vendoset me siguri: kodimet tani ekzistojnë.
        if (pc.connectionState === "connected") for (const sender of pc.getSenders()) void tune(sender);
      };

      const stream = localRef.current;
      if (stream) for (const track of stream.getTracks()) attach(pc, track, stream);
      return peer;
    },
    [analyserFor, attach, meId, send],
  );

  const handleSignal = React.useCallback(
    async (from: string, kind: string, payload: string) => {
      activityRef.current = Date.now();
      const peer = peerFor(from);
      const { pc } = peer;
      try {
        if (kind === "offer") {
          const description = JSON.parse(payload) as RTCSessionDescriptionInit;
          const collision = peer.makingOffer || pc.signalingState !== "stable";
          peer.ignoreOffer = !peer.polite && collision;
          if (peer.ignoreOffer) return;
          await pc.setRemoteDescription(description);
          await pc.setLocalDescription();
          send({ to: from, kind: "answer", payload: JSON.stringify(pc.localDescription) });
        } else if (kind === "answer") {
          if (pc.signalingState !== "have-local-offer") return;
          await pc.setRemoteDescription(JSON.parse(payload) as RTCSessionDescriptionInit);
        } else if (kind === "candidate") {
          const candidate = JSON.parse(payload) as RTCIceCandidateInit;
          if (!pc.remoteDescription) {
            peer.pending.push(candidate);
            return;
          }
          await pc.addIceCandidate(candidate);
        }
        // Kandidatët që erdhën para përshkrimit hyjnë tani.
        if (pc.remoteDescription && peer.pending.length > 0) {
          for (const candidate of peer.pending.splice(0)) await pc.addIceCandidate(candidate).catch(() => undefined);
        }
      } catch {
        // Një sinjal i prishur nuk e rrëzon dhomën; lidhja riprovon vetë.
      }
    },
    [peerFor, send],
  );

  // Marrja e sinjaleve: shpejt kur po lidhemi, rrallë kur gjithçka është e qetë.
  React.useEffect(() => {
    let cancelled = false;
    let timer = 0;

    async function poll() {
      const response = await fetch(url, { cache: "no-store" }).catch(() => null);
      if (cancelled) return;
      if (response?.ok) {
        const data = (await response.json()) as {
          iceServers?: RTCIceServer[];
          signals?: { from: string; kind: string; payload: string }[];
        };
        if (data.iceServers?.length) iceRef.current = data.iceServers;
        for (const signal of data.signals ?? []) await handleSignal(signal.from, signal.kind, signal.payload);
      }
      if (cancelled) return;
      const busy = Date.now() - activityRef.current < 15_000;
      timer = window.setTimeout(poll, busy ? FAST_POLL_MS : SLOW_POLL_MS);
    }

    void poll();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [url, handleSignal]);

  // Lidhjet ndjekin listën: të rinjtë lidhen, kush doli mbyllet.
  const peerKey = [...peerIds].sort().join(",");
  React.useEffect(() => {
    const wanted = new Set(peerKey ? peerKey.split(",") : []);
    for (const id of wanted) {
      if (!peersRef.current.has(id)) {
        peerFor(id);
        activityRef.current = Date.now();
      }
    }
    for (const id of [...peersRef.current.keys()]) if (!wanted.has(id)) closePeer(id);
  }, [peerKey, peerFor, closePeer]);

  // Mikrofoni: hapet kur roli lejon të flas, mbyllet kur jo.
  React.useEffect(() => {
    let cancelled = false;

    async function open() {
      if (localRef.current?.getAudioTracks().length) return;
      try {
        const captured = await navigator.mediaDevices.getUserMedia({ audio: AUDIO });
        if (cancelled) {
          captured.getTracks().forEach((track) => track.stop());
          return;
        }
        const stream = local();
        for (const track of captured.getAudioTracks()) {
          track.enabled = !mutedRef.current;
          track.contentHint = "speech";
          stream.addTrack(track);
          for (const peer of peersRef.current.values()) attach(peer.pc, track, stream);
        }
        localAnalyserRef.current = analyserFor(stream);
        setMicError(false);
        publishLocal();
      } catch {
        setMicError(true);
      }
    }

    function shut() {
      const stream = localRef.current;
      if (!stream) return;
      for (const peer of peersRef.current.values()) {
        for (const sender of peer.pc.getSenders()) if (sender.track) peer.pc.removeTrack(sender);
      }
      stream.getTracks().forEach((track) => track.stop());
      localRef.current = null;
      localAnalyserRef.current = null;
      publishLocal();
    }

    if (canTalk) void open();
    else shut();
    return () => {
      cancelled = true;
    };
  }, [canTalk, analyserFor, attach, local, publishLocal]);

  /*
    Kamera: ndizet kur studenti e do, edhe në mes të një thirrjeje zanore, dhe
    kthehet përpara ose mbrapa. Gjurma e re zë vendin e së vjetrës te çdo lidhje
    (`replaceTrack`), kështu tjetri nuk e humb as zërin, as pamjen.

    Zëri dhe pamja kapen bashkë. Në iPhone një kapje e dytë vetëm për kamerën e
    hesht mikrofonin e kapur më parë, dhe tjetri pushonte së të dëgjuari sapo
    ndizej kamera. Me kapjen e përbashkët, mikrofoni i ri zë vendin e të vjetrit.
  */
  React.useEffect(() => {
    let cancelled = false;
    const stream = localRef.current;
    const current = stream?.getVideoTracks()[0] ?? null;

    /** Zëri i tjetrit niset prapë: telefoni e ndal kur kamera hapet ose mbyllet. */
    function wake() {
      void contextRef.current?.resume().catch(() => undefined);
      for (const peer of peersRef.current.values()) {
        if (!peer.audio) continue;
        void applyOutput(peer.audio, outputRef.current);
        void peer.audio.play().catch(() => undefined);
      }
    }

    function drop() {
      if (!current || !stream) return;
      for (const peer of peersRef.current.values()) {
        const sender = peer.pc.getSenders().find((item) => item.track === current);
        if (!sender) continue;
        void sender.replaceTrack(null);
        /*
          Pa këtë, te tjetri mbetej ngrirë kuadri i fundit: gjurma s'merrte më
          pamje, por askush s'i thoshte që kamera u fik. Drejtimi «vetëm marr» e
          rinegocion lidhjen, gjurma e tjetrit heshtet (`mute`) dhe del fotoja e
          profilit, si në thirrje zanore. Kur kamera ndizet prapë, `attach` e kthen.
        */
        const transceiver = peer.pc.getTransceivers().find((item) => item.sender === sender);
        if (transceiver && transceiver.direction === "sendrecv") transceiver.direction = "recvonly";
        else if (transceiver && transceiver.direction === "sendonly") transceiver.direction = "inactive";
      }
      stream.removeTrack(current);
      current.stop();
      publishLocal();
      wake();
    }

    if (!camera || !canTalk) {
      drop();
      return;
    }
    // E njëjta kamerë e ndezur: s'ka pse të hapet prapë.
    if (current && current.getSettings().facingMode === facing) return;

    async function capture() {
      try {
        return await navigator.mediaDevices.getUserMedia({ audio: AUDIO, video: videoConstraints(facing) });
      } catch {
        // Pa mikrofon (leje ose pajisje), kamera hapet vetëm, dhe zëri mbetet ai që ishte.
        return navigator.mediaDevices.getUserMedia({ video: videoConstraints(facing) });
      }
    }

    async function openCamera() {
      try {
        const captured = await capture();
        const track = captured.getVideoTracks()[0];
        const voice = captured.getAudioTracks()[0] ?? null;
        if (cancelled || !track) {
          captured.getTracks().forEach((item) => item.stop());
          return;
        }
        track.contentHint = "motion";
        if (voice) {
          voice.enabled = !mutedRef.current;
          voice.contentHint = "speech";
        }

        const target = local();
        const old = target.getVideoTracks()[0];
        const oldVoice = target.getAudioTracks()[0] ?? null;
        for (const peer of peersRef.current.values()) {
          const sender = old ? peer.pc.getSenders().find((item) => item.track === old) : undefined;
          if (sender) void sender.replaceTrack(track).then(() => tune(sender));
          else attach(peer.pc, track, target);

          if (voice) {
            const voiceSender = oldVoice ? peer.pc.getSenders().find((item) => item.track === oldVoice) : undefined;
            if (voiceSender) void voiceSender.replaceTrack(voice).then(() => tune(voiceSender));
            else attach(peer.pc, voice, target);
          }
        }
        if (old) {
          target.removeTrack(old);
          old.stop();
        }
        if (voice) {
          if (oldVoice) {
            target.removeTrack(oldVoice);
            oldVoice.stop();
          }
          target.addTrack(voice);
          localAnalyserRef.current = analyserFor(new MediaStream([voice]));
        }
        target.addTrack(track);
        setCameraError(false);
        publishLocal();
        wake();
      } catch {
        if (!cancelled) setCameraError(true);
      }
    }

    void openCamera();
    return () => {
      cancelled = true;
    };
  }, [camera, facing, canTalk, attach, local, publishLocal, analyserFor]);

  // Heshtja nuk e rinegocion lidhjen: gjurma thjesht fiket.
  React.useEffect(() => {
    mutedRef.current = muted;
    for (const track of localRef.current?.getAudioTracks() ?? []) track.enabled = !muted;
  }, [muted]);

  // Altoparlanti: zëri i të tjerëve heshtet ose ndizet te unë, lidhja mbetet.
  React.useEffect(() => {
    speakerRef.current = speakerOn;
    for (const peer of peersRef.current.values()) if (peer.audio) peer.audio.muted = !speakerOn;
  }, [speakerOn]);

  // Dalja: altoparlanti ose te veshi, për çdo zë që vjen.
  React.useEffect(() => {
    outputRef.current = output;
    for (const peer of peersRef.current.values()) if (peer.audio) void applyOutput(peer.audio, output);
  }, [output]);

  // Kush po flet: matje e shpeshtë, gjendje e re vetëm kur ndryshon grupi.
  React.useEffect(() => {
    const buffer = new Float32Array(512);
    const level = (analyser: AnalyserNode | null) => {
      if (!analyser) return 0;
      analyser.getFloatTimeDomainData(buffer);
      let sum = 0;
      for (const value of buffer) sum += value * value;
      return Math.sqrt(sum / buffer.length);
    };

    const timer = window.setInterval(() => {
      const next = new Set<string>();
      if (!mutedRef.current && level(localAnalyserRef.current) > SPEAKING_LEVEL) next.add(meId);
      for (const [id, peer] of peersRef.current) if (level(peer.analyser) > SPEAKING_LEVEL) next.add(id);
      setSpeaking((current) =>
        current.size === next.size && [...next].every((id) => current.has(id)) ? current : next,
      );
    }, 150);
    return () => window.clearInterval(timer);
  }, [meId]);

  // Dalja nga faqja mbyll gjithçka: lidhjet, mikrofonin, kamerën, zërin.
  React.useEffect(() => {
    const peers = peersRef.current;
    return () => {
      for (const id of [...peers.keys()]) closePeer(id);
      localRef.current?.getTracks().forEach((track) => track.stop());
      localRef.current = null;
      void contextRef.current?.close().catch(() => undefined);
      contextRef.current = null;
    };
  }, [closePeer]);

  /** Pas prekjes së studentit: zëri dhe matja nisin edhe kur shfletuesi i kishte ndaluar. */
  const resume = React.useCallback(() => {
    void contextRef.current?.resume().catch(() => undefined);
    for (const peer of peersRef.current.values()) void peer.audio?.play().catch(() => undefined);
    setNeedsGesture(false);
  }, []);

  return { speaking, needsGesture, resume, micError, cameraError, streams, localStream };
}
