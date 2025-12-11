import { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  SkipBack,
  SkipForward,
  Camera,
} from "lucide-react";
import Hls from "hls.js";

// ===========================
// HLS-Compatible VideoPlayer
// ===========================
const VideoPlayer = forwardRef(function VideoPlayer(
  {
    src,
    onTimeUpdate,
    onLoadedMetadata,
    onCanPlay,
    onPlay,
    onPause,
    muted = false,
  }: {
    src: string;
    onTimeUpdate?: () => void;
    onLoadedMetadata?: () => void;
    onCanPlay?: () => void;
    onPlay?: () => void;
    onPause?: () => void;
    muted?: boolean;
  },
  ref: React.Ref<HTMLVideoElement>
) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  useImperativeHandle(ref, () => videoRef.current!);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (src.endsWith(".m3u8") && Hls.isSupported()) {
      const hls = new Hls({
        maxBufferSize: 0,
        maxBufferLength: 10,
        liveSyncDurationCount: 3,
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      hlsRef.current = hls;

      // Trigger onLoadedMetadata when manifest parsed
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (onLoadedMetadata) onLoadedMetadata();
      });
    } else {
      video.src = src;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, onLoadedMetadata]);

  return (
    <video
      ref={videoRef}
      controls={false}
      playsInline
      muted={muted}
      onTimeUpdate={onTimeUpdate}
      onLoadedMetadata={onLoadedMetadata}
      onCanPlay={onCanPlay}
      onPlay={onPlay}
      onPause={onPause}
      preload="auto"
      className="absolute inset-0 w-full h-full object-contain"
    />
  );
});


// ===========================
// VIDEO CONFIG
// ===========================
const VIDEO_CONFIG = {
  angle1: {
    id: "angle1",
    src: "https://pub-51abfb3ede7e43b4b2d539bcec8990ae.r2.dev/output.m3u8",
    label: "View 1",
    description: "",
  },
  angle2: {
    id: "angle2",
    src: "https://pub-51abfb3ede7e43b4b2d539bcec8990ae.r2.dev/videoB.m3u8",
    label: "View 2",
    description: "",
  },
  angle3: {
    id: "angle3",
    src: "https://pub-51abfb3ede7e43b4b2d539bcec8990ae.r2.dev/videoC.m3u8",
    label: "View 3",
    description: "",
  },
  angle4: {
    id: "angle4",
    src: "https://pub-51abfb3ede7e43b4b2d539bcec8990ae.r2.dev/videoD.m3u8",
    label: "View 4",
    description: "",
  },
};

type VideoAngle = keyof typeof VIDEO_CONFIG;

// ===========================
// MULTICAM VIEWER
// ===========================
export default function MultiCamViewer() {
  const VIDEO_DURATION = 4 * 60 + 44; // 4 minutes 44 seconds
  const allAngles: VideoAngle[] = ["angle1", "angle2", "angle3", "angle4"];
  const [mainAngle, setMainAngle] = useState<VideoAngle>("angle1");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number>(VIDEO_DURATION);
  const [isLoading, setIsLoading] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const mainVideoRef = useRef<HTMLVideoElement | null>(null);
  const thumbnailRefs = useRef<Map<VideoAngle, HTMLVideoElement>>(new Map());

  const thumbnailAngles = allAngles.filter((angle) => angle !== mainAngle);

  const getAllVideos = useCallback(() => {
    const videos: HTMLVideoElement[] = [];
    if (mainVideoRef.current) videos.push(mainVideoRef.current);
    thumbnailRefs.current.forEach((v) => videos.push(v));
    return videos;
  }, []);

  const syncAllVideos = useCallback(
    (targetTime: number) => {
      getAllVideos().forEach((video) => {
        if (Math.abs(video.currentTime - targetTime) > 0.1) {
          video.currentTime = targetTime;
        }
      });
    },
    [getAllVideos]
  );

  // ===========================
  // VIDEO EVENT HANDLERS
  // ===========================
  const handleTimeUpdate = useCallback(() => {
    const mainVideo = mainVideoRef.current;
    if (mainVideo) {
      setCurrentTime(mainVideo.currentTime);
      thumbnailRefs.current.forEach((video) => {
        if (Math.abs(video.currentTime - mainVideo.currentTime) > 0.5) {
          video.currentTime = mainVideo.currentTime;
        }
      });
    }
  }, []);

  const handlePlayPause = useCallback(() => {
    const allVideos = getAllVideos();
    if (isPlaying) {
      allVideos.forEach((v) => v.pause());
      setIsPlaying(false);
    } else {
      const playPromises = allVideos.map((v) => v.play().catch(() => {}));
      Promise.all(playPromises).then(() => setIsPlaying(true));
    }
  }, [isPlaying, getAllVideos]);

  const handleSeek = useCallback(
    (value: number[]) => {
      const newTime = value[0];
      setCurrentTime(newTime);
      syncAllVideos(newTime);
    },
    [syncAllVideos]
  );

  const handleSkip = useCallback(
    (seconds: number) => {
      const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
      setCurrentTime(newTime);
      syncAllVideos(newTime);
    },
    [currentTime, duration, syncAllVideos]
  );

  const handleMuteToggle = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const handleAngleSwitch = useCallback(
    (newAngle: VideoAngle) => {
      if (newAngle === mainAngle) return;
      const wasPlaying = isPlaying;
      const currentTimeSnapshot = currentTime;

      getAllVideos().forEach((v) => v.pause());
      setMainAngle(newAngle);

      setTimeout(() => {
        const newMainVideo = mainVideoRef.current;
        if (newMainVideo) {
          newMainVideo.currentTime = currentTimeSnapshot;
          thumbnailRefs.current.forEach((video) => {
            video.currentTime = currentTimeSnapshot;
          });

          if (wasPlaying) {
            const allVideos = getAllVideos();
            Promise.all(allVideos.map((v) => v.play().catch(() => {}))).then(
              () => {
                setIsPlaying(true);
              }
            );
          }
        }
      }, 50);
    },
    [mainAngle, isPlaying, currentTime, getAllVideos]
  );

  const handleFullscreen = useCallback(() => {
    const mainVideo = mainVideoRef.current;
    if (mainVideo) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        mainVideo.requestFullscreen();
      }
    }
  }, []);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    }
  }, [isPlaying]);

  // ===========================
  // KEYBOARD SHORTCUTS
  // ===========================
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          handlePlayPause();
          break;
        case "ArrowLeft":
          e.preventDefault();
          handleSkip(-5);
          break;
        case "ArrowRight":
          e.preventDefault();
          handleSkip(5);
          break;
        case "m":
          handleMuteToggle();
          break;
        case "f":
          handleFullscreen();
          break;
        case "1":
        case "2":
        case "3":
        case "4":
          handleAngleSwitch(`angle${e.key}` as VideoAngle);
          break;
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [handlePlayPause, handleSkip, handleMuteToggle, handleFullscreen, handleAngleSwitch]);

  // ===========================
  // RENDER
  // ===========================
  return (
    <div
      className="min-h-screen bg-background"
      onMouseMove={showControls}
      onTouchStart={showControls}
    >
      <div className="flex flex-col lg:flex-row h-screen">
        {/* MAIN VIDEO SECTION */}
        <div className="flex-1 flex flex-col p-4 lg:p-6">
          <div className="relative flex-1 bg-black rounded-lg overflow-hidden group">
            {/* MAIN VIDEO */}
            <VideoPlayer
              ref={mainVideoRef}
              src={VIDEO_CONFIG[mainAngle].src}
              onTimeUpdate={handleTimeUpdate}
              muted={isMuted}
            />

            {/* Play Overlay */}
            {!isPlaying && (
              <button
                onClick={handlePlayPause}
                className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 transition-opacity"
              >
                <div className="w-20 h-20 flex items-center justify-center rounded-full bg-primary/90 backdrop-blur-sm">
                  <Play className="w-10 h-10 text-primary-foreground ml-1" />
                </div>
              </button>
            )}
          </div>

          {/* CONTROLS BAR */}
          <div
            className={`mt-4 p-4 bg-card rounded-lg border border-card-border transition-opacity duration-300 ${
              controlsVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            {/* Timeline */}
            <div className="flex items-center gap-4 mb-4">
              <span className="text-xs font-mono text-muted-foreground min-w-[45px]">
                {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60)
                  .toString()
                  .padStart(2, "0")}
              </span>
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={0.1}
                onValueChange={handleSeek}
                className="flex-1"
              />
              <span className="text-xs font-mono text-muted-foreground min-w-[45px]">
                {Math.floor(duration / 60)}:{Math.floor(duration % 60)
                  .toString()
                  .padStart(2, "0")}
              </span>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => handleSkip(-10)}>
                    <SkipBack className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Skip back 10s</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="default" size="icon" onClick={handlePlayPause}>
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isPlaying ? "Pause" : "Play"}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => handleSkip(10)}>
                    <SkipForward className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Skip forward 10s</TooltipContent>
              </Tooltip>

              <div className="w-px h-6 bg-border mx-2" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={handleMuteToggle}>
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isMuted ? "Unmute" : "Mute"}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={handleFullscreen}>
                    <Maximize className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Fullscreen</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* THUMBNAILS */}
        <div className="w-full lg:w-80 xl:w-96 p-4 lg:p-6 lg:pl-0 flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-2">
            <Camera className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Choose your view point
            </h2>
          </div>

          <div className="flex lg:flex-col gap-4 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 lg:flex-1">
            {thumbnailAngles.map((angle) => (
              <ThumbnailPreview
                key={angle}
                angle={angle}
                config={VIDEO_CONFIG[angle]}
                videoRef={(el) => {
                  if (el) thumbnailRefs.current.set(angle, el!);
                  else thumbnailRefs.current.delete(angle);
                }}
                onSelect={() => handleAngleSwitch(angle)}
                currentTime={currentTime}
                isPlaying={isPlaying}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================
// THUMBNAIL PREVIEW COMPONENT
// ===========================
interface ThumbnailPreviewProps {
  angle: VideoAngle;
  config: (typeof VIDEO_CONFIG)[VideoAngle];
  videoRef: (el: HTMLVideoElement | null) => void;
  onSelect: () => void;
  currentTime: number;
  isPlaying: boolean;
}

function ThumbnailPreview({ angle, config, videoRef, onSelect, currentTime, isPlaying }: ThumbnailPreviewProps) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleRef = useCallback(
    (el: HTMLVideoElement | null) => {
      localVideoRef.current = el;
      videoRef(el);
    },
    [videoRef]
  );

  useEffect(() => {
    const video = localVideoRef.current;
    if (video && isLoaded) {
      if (isPlaying) video.play().catch(() => {});
      else video.pause();
    }
  }, [isPlaying, isLoaded]);

  useEffect(() => {
    const video = localVideoRef.current;
    if (video && isLoaded && !isPlaying) {
      if (Math.abs(video.currentTime - currentTime) > 0.5) video.currentTime = currentTime;
    }
  }, [currentTime, isLoaded, isPlaying]);

  return (
    <button
      onClick={onSelect}
      className="relative flex-shrink-0 w-48 lg:w-full aspect-video bg-black rounded-lg overflow-visible cursor-pointer group hover-elevate active-elevate-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
    >
      {!isLoaded && (
        <div className="absolute inset-0 bg-muted animate-pulse rounded-lg flex items-center justify-center">
          <Camera className="w-6 h-6 text-muted-foreground" />
        </div>
      )}

      <video
        ref={handleRef}
        className={`w-full h-full object-cover rounded-lg transition-opacity ${isLoaded ? "opacity-100" : "opacity-0"}`}
        muted
        playsInline
        preload="auto"
        onCanPlayThrough={() => setIsLoaded(true)}
        onLoadedData={() => setIsLoaded(true)}
      >
        <source src={config.src} type="video/mp4" />
      </video>

      <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded text-xs font-medium text-white uppercase tracking-wide">
        {config.label}
      </div>
    </button>
  );
}
