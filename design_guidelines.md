# Design Guidelines: Multi-Camera Tennis Match Viewer

## Design Approach
**System-Based Approach** - Drawing from YouTube and Netflix video player patterns for familiar, utility-focused media controls with emphasis on functionality and usability.

## Core Design Principles
1. **Video-First Interface** - Maximize screen real estate for video content
2. **Instant Recognition** - Camera angles clearly labeled and distinguishable
3. **Zero-Friction Switching** - Seamless angle transitions with visual feedback
4. **Precision Control** - Accurate timeline scrubbing with visual preview

---

## Layout System

**Spacing Units**: Use Tailwind spacing of 2, 4, and 8 (p-2, gap-4, m-8, etc.)

**Main Layout Structure**:
- Full viewport height application (h-screen)
- Main video: 70% of viewport width, aspect ratio 16:9
- Thumbnail grid: 30% width, stacked vertically in right sidebar
- Timeline controls: Fixed bottom bar, full width

**Responsive Breakpoints**:
- Desktop (lg+): Side-by-side layout (main left, thumbnails right)
- Tablet/Mobile (< lg): Stacked layout (main top, thumbnails horizontal scroll below)

---

## Typography

**Font Family**: Inter or system font stack for crisp UI text
**Hierarchy**:
- Camera labels: text-sm font-medium uppercase tracking-wide
- Time indicators: text-xs font-mono
- Control tooltips: text-xs font-normal

---

## Component Library

### 1. Main Video Player
- 16:9 aspect ratio container with rounded-lg corners
- Camera angle label overlay (top-left, p-4)
- Subtle gradient fade on edges for depth
- Active state indicator: subtle glow or border treatment

### 2. Thumbnail Previews (3 cameras)
- 16:9 aspect ratio, equal heights
- gap-4 between thumbnails
- Camera labels visible on hover/always on mobile
- Click target: entire thumbnail area with cursor-pointer
- Hover state: scale-105 transform, shadow-xl elevation
- Active/selected state: border treatment to show current main view

### 3. Timeline Scrubber
- Full-width progress bar with h-2 track
- Larger h-4 draggable thumb for precise control
- Time display: current/total (e.g., "2:34 / 10:00")
- Hover preview: thumbnail tooltip showing frame at hover position (optional enhancement)
- Buffered segments visualization

### 4. Playback Controls
- Centered control cluster: play/pause, volume, fullscreen
- Icons: 24px size from Heroicons
- Touch-friendly spacing (min 44px tap targets)
- Keyboard shortcuts displayed on first load (space = play/pause, arrow keys = seek)

### 5. Audio Indicator
- Small waveform or speaker icon showing audio is unified across all angles
- Position: near playback controls

---

## Interaction Patterns

**Angle Switching**:
- Instant swap animation (200ms ease-out)
- Thumbnail moves to previous main position
- No playback interruption during swap

**Timeline Scrubbing**:
- All 4 videos update synchronously
- Smooth seeking with debounced updates
- Visual loading states if buffering

**Auto-hide Controls**:
- Controls fade out after 3s of inactivity during playback
- Fade in on mouse movement or touch

---

## Visual States

**Video Loading**: Skeleton placeholder with camera label and loading spinner
**Buffering**: Subtle spinner overlay, doesn't block video
**Error**: Clear error message with retry option, preserves layout
**Paused**: Persistent play button overlay on main video (centered, large)

---

## Accessibility

- All controls keyboard navigable
- Tab order: main video → thumbnails 1-3 → timeline → playback controls
- ARIA labels for all interactive elements
- Focus visible states with outline
- Screen reader announcements for angle switches

---

## File Configuration Section

Create clearly commented configuration object at top of JavaScript:
```javascript
// VIDEO CONFIGURATION - Edit these paths and labels
const videoConfig = {
  angle1: { src: '/videos/court-view.mp4', label: 'Court View' },
  angle2: { src: '/videos/player-1.mp4', label: 'Player 1' },
  // ... etc
}
```

---

## Performance Considerations

- Preload metadata for all videos
- Lazy load thumbnail video elements
- Debounce timeline scrubbing (100ms)
- Use requestAnimationFrame for sync updates
- Consider video.js or similar library for robust playback controls