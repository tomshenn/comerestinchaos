import { useRef, useState, useEffect, useCallback } from "react";
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

/* =============================================================================
 * VIDEO CONFIGURATION
 * =============================================================================
 * Edit these paths and labels to change the video sources.
 *
 * Each video should be a 1920x1080 MP4 file.
 *
 * For Cloudflare R2 integration (future):
 * Replace the 'src' values with your R2 bucket URLs, e.g.:
 * src: 'https://your-bucket.r2.cloudflarestorage.com/videos/court-view.mp4'
 *
 * Current placeholder videos are served from the local /videos directory.
 * ============================================================================= */
const VIDEO_CONFIG = {
  angle1: {
    id: "angle1",
    src: "/videos/angle1.mp4",
    label: "Court View",
    description: "Wide angle overhead view of the entire court",
  },
  angle2: {
    id: "angle2",
    src: "/videos/angle2.mp4",
    label: "Player 1",
    description: "Close-up camera following Player 1",
  },
  angle3: {
    id: "angle3",
    src: "/videos/angle3.mp4",
    label: "Player 2",
    description: "Close-up camera following Player 2",
  },
  angle4: {
    id: "angle4",
    src: "/videos/angle4.mp4",
    label: "Net Cam",
    description: "Camera positioned at the net level",
  },
};

type VideoAngle = keyof typeof VIDEO_CONFIG;

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const allAngles: VideoAngle[] = ["angle1", "angle2", "angle3", "angle4"];

export default function MultiCamViewer() {
  const [mainAngle, setMainAngle] = useState<VideoAngle>("angle1");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
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
    [getAllVideos],
  );

  useEffect(() => {
    const mainVideo = mainVideoRef.current;
    if (!mainVideo) return;

    const handleLoadedMetadata = () => {
      const dur = mainVideo.duration;
      if (dur && isFinite(dur) && dur > 0) {
        setDuration(dur);
        setIsLoading(false);
      }
    };

    const handleCanPlay = () => {
      const dur = mainVideo.duration;
      if (dur && isFinite(dur) && dur > 0) {
        setDuration(dur);
      }
      setIsLoading(false);
    };

    const handleError = () => {
      console.error("Video load error for angle:", mainAngle);
      setIsLoading(false);
    };

    mainVideo.addEventListener("loadedmetadata", handleLoadedMetadata);
    mainVideo.addEventListener("canplay", handleCanPlay);
    mainVideo.addEventListener("error", handleError);

    mainVideo.load();

    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 8000);

    return () => {
      mainVideo.removeEventListener("loadedmetadata", handleLoadedMetadata);
      mainVideo.removeEventListener("canplay", handleCanPlay);
      mainVideo.removeEventListener("error", handleError);
      clearTimeout(timeout);
    };
  }, [mainAngle]);

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
    [syncAllVideos],
  );

  const handleSkip = useCallback(
    (seconds: number) => {
      const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
      setCurrentTime(newTime);
      syncAllVideos(newTime);
    },
    [currentTime, duration, syncAllVideos],
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
              },
            );
          }
        }
      }, 50);
    },
    [mainAngle, isPlaying, currentTime, getAllVideos],
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
  }, [
    handlePlayPause,
    handleSkip,
    handleMuteToggle,
    handleFullscreen,
    handleAngleSwitch,
  ]);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      setControlsVisible(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    }
  }, [isPlaying]);

  const handleMainVideoLoaded = useCallback(() => {
    const mainVideo = mainVideoRef.current;
    if (mainVideo) {
      const dur = mainVideo.duration;
      if (dur && isFinite(dur) && dur > 0) {
        setDuration(dur);
        setIsLoading(false);
      }
    }
  }, []);

  return (
    <div
      className="min-h-screen bg-background"
      onMouseMove={showControls}
      onTouchStart={showControls}
    >
      <div className="flex flex-col lg:flex-row h-screen">
        {/* Main Video Section */}
        <div className="flex-1 flex flex-col p-4 lg:p-6">
          {/* Main Video Container */}
          <div className="relative flex-1 bg-black rounded-lg overflow-hidden group">
            {/* Loading Overlay */}
            {isLoading && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground font-medium">
                    Loading video...
                  </p>
                </div>
              </div>
            )}

            {/* Camera Label Overlay */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-md">
              <Camera className="w-4 h-4 text-primary" />
              <span
                className="text-sm font-medium text-white uppercase tracking-wide"
                data-testid="text-main-camera-label"
              >
                {VIDEO_CONFIG[mainAngle].label}
              </span>
            </div>

            {/* Main Video - Single video element that changes src */}
            <video
              key={mainAngle}
              ref={mainVideoRef}
              className="absolute inset-0 w-full h-full object-contain"
              muted={isMuted}
              playsInline
              preload="auto"
              onLoadedMetadata={handleMainVideoLoaded}
              onCanPlayThrough={handleMainVideoLoaded}
              onLoadedData={handleMainVideoLoaded}
              onTimeUpdate={handleTimeUpdate}
              onError={(e) => console.error("Video error:", e)}
              data-testid={`video-main`}
            >
              <source src={VIDEO_CONFIG[mainAngle].src} type="video/mp4" />
            </video>

            {/* Play Button Overlay (when paused) */}
            {!isPlaying && !isLoading && (
              <button
                onClick={handlePlayPause}
                className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 transition-opacity"
                data-testid="button-play-overlay"
              >
                <div className="w-20 h-20 flex items-center justify-center rounded-full bg-primary/90 backdrop-blur-sm">
                  <Play className="w-10 h-10 text-primary-foreground ml-1" />
                </div>
              </button>
            )}
          </div>

          {/* Controls Bar */}
          <div
            className={`mt-4 p-4 bg-card rounded-lg border border-card-border transition-opacity duration-300 ${
              controlsVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            {/* Timeline Scrubber */}
            <div className="flex items-center gap-4 mb-4">
              <span
                className="text-xs font-mono text-muted-foreground min-w-[45px]"
                data-testid="text-current-time"
              >
                {formatTime(currentTime)}
              </span>
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={0.1}
                onValueChange={handleSeek}
                className="flex-1"
                data-testid="slider-timeline"
              />
              <span
                className="text-xs font-mono text-muted-foreground min-w-[45px]"
                data-testid="text-duration"
              >
                {formatTime(duration)}
              </span>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleSkip(-10)}
                    data-testid="button-skip-back"
                  >
                    <SkipBack className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Skip back 10s</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="default"
                    size="icon"
                    onClick={handlePlayPause}
                    className="w-12 h-12"
                    data-testid="button-play-pause"
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6" />
                    ) : (
                      <Play className="w-6 h-6 ml-0.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isPlaying ? "Pause (Space)" : "Play (Space)"}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleSkip(10)}
                    data-testid="button-skip-forward"
                  >
                    <SkipForward className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Skip forward 10s</TooltipContent>
              </Tooltip>

              <div className="w-px h-6 bg-border mx-2" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleMuteToggle}
                    data-testid="button-mute"
                  >
                    {isMuted ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isMuted ? "Unmute (M)" : "Mute (M)"}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleFullscreen}
                    data-testid="button-fullscreen"
                  >
                    <Maximize className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Fullscreen (F)</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Thumbnail Sidebar */}
        <div className="w-full lg:w-80 xl:w-96 p-4 lg:p-6 lg:pl-0 flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-2">
            <Camera className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Choose your view point
            </h2>
          </div>

          {/* Horizontal scroll on mobile, vertical stack on desktop */}
          <div className="flex lg:flex-col gap-4 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 lg:flex-1">
            {thumbnailAngles.map((angle) => (
              <ThumbnailPreview
                key={angle}
                angle={angle}
                config={VIDEO_CONFIG[angle]}
                videoRef={(el) => {
                  if (el) {
                    thumbnailRefs.current.set(angle, el);
                  } else {
                    thumbnailRefs.current.delete(angle);
                  }
                }}
                onSelect={() => handleAngleSwitch(angle)}
                currentTime={currentTime}
                isPlaying={isPlaying}
              />
            ))}
          </div>

          {/* Keyboard Shortcuts Help */}
          <div className="hidden lg:block mt-auto pt-4 border-t border-border">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Keyboard Shortcuts
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-0.5 bg-muted rounded text-muted-foreground font-mono">
                  Space
                </kbd>
                <span className="text-muted-foreground">Play/Pause</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-0.5 bg-muted rounded text-muted-foreground font-mono">
                  M
                </kbd>
                <span className="text-muted-foreground">Mute</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-0.5 bg-muted rounded text-muted-foreground font-mono">
                  ←/→
                </kbd>
                <span className="text-muted-foreground">Seek ±5s</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-0.5 bg-muted rounded text-muted-foreground font-mono">
                  1-4
                </kbd>
                <span className="text-muted-foreground">Switch angle</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ThumbnailPreviewProps {
  angle: VideoAngle;
  config: (typeof VIDEO_CONFIG)[VideoAngle];
  videoRef: (el: HTMLVideoElement | null) => void;
  onSelect: () => void;
  currentTime: number;
  isPlaying: boolean;
}

function ThumbnailPreview({
  angle,
  config,
  videoRef,
  onSelect,
  currentTime,
  isPlaying,
}: ThumbnailPreviewProps) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleRef = useCallback(
    (el: HTMLVideoElement | null) => {
      localVideoRef.current = el;
      videoRef(el);
    },
    [videoRef],
  );

  useEffect(() => {
    const video = localVideoRef.current;
    if (video && isLoaded) {
      if (isPlaying) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    }
  }, [isPlaying, isLoaded]);

  useEffect(() => {
    const video = localVideoRef.current;
    if (video && isLoaded && !isPlaying) {
      if (Math.abs(video.currentTime - currentTime) > 0.5) {
        video.currentTime = currentTime;
      }
    }
  }, [currentTime, isLoaded, isPlaying]);

  return (
    <button
      onClick={onSelect}
      className="relative flex-shrink-0 w-48 lg:w-full aspect-video bg-black rounded-lg overflow-visible cursor-pointer group hover-elevate active-elevate-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
      data-testid={`button-thumbnail-${angle}`}
    >
      {/* Loading skeleton */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-muted animate-pulse rounded-lg flex items-center justify-center">
          <Camera className="w-6 h-6 text-muted-foreground" />
        </div>
      )}

      {/* Thumbnail video */}
      <video
        ref={handleRef}
        className={`w-full h-full object-cover rounded-lg transition-opacity ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
        muted
        playsInline
        preload="auto"
        onCanPlayThrough={() => setIsLoaded(true)}
        onLoadedData={() => setIsLoaded(true)}
      >
        <source src={config.src} type="video/mp4" />
      </video>

      {/* Hover overlay with label */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-sm font-medium text-white">{config.label}</p>
          <p className="text-xs text-white/70 mt-0.5">{config.description}</p>
        </div>
      </div>

      {/* Always-visible label */}
      <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded text-xs font-medium text-white uppercase tracking-wide">
        {config.label}
      </div>

      {/* Click to switch indicator */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
          <Camera className="w-5 h-5 text-white" />
        </div>
      </div>
    </button>
  );
}
