/** Soft rotating gradient-blob loader, styled after resources/elaborate-svg-blob-loader
 *  (a CodePen/SVGator piece) but rebuilt as plain SVG + CSS keyframes in the app's own
 *  pastel palette -- the original's animation only plays via a script fetched from
 *  cdn.svgator.com, which isn't something worth depending on for a loading spinner inside
 *  a Telegram Mini App WebView. */
export default function BlobLoader({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="overflow-visible">
      <defs>
        <radialGradient id="blob-loader-a" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="var(--app-yellow)" />
          <stop offset="100%" stopColor="var(--app-yellow)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="blob-loader-b" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="var(--app-pink)" />
          <stop offset="100%" stopColor="var(--app-pink)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="blob-loader-c" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="var(--app-blue)" />
          <stop offset="100%" stopColor="var(--app-blue)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="blob-loader-core" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="var(--app-coral)" />
          <stop offset="100%" stopColor="var(--app-mint)" />
        </radialGradient>
        <filter id="blob-loader-blur" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      <g className="blob-loader-orbit" style={{ transformOrigin: "50px 50px" }} filter="url(#blob-loader-blur)">
        <ellipse cx="66" cy="30" rx="26" ry="26" fill="url(#blob-loader-a)" opacity="0.85" />
      </g>
      <g className="blob-loader-orbit-reverse" style={{ transformOrigin: "50px 50px" }} filter="url(#blob-loader-blur)">
        <ellipse cx="30" cy="66" rx="24" ry="24" fill="url(#blob-loader-b)" opacity="0.8" />
      </g>
      <g className="blob-loader-orbit" style={{ transformOrigin: "50px 50px", animationDuration: "11s" }} filter="url(#blob-loader-blur)">
        <ellipse cx="70" cy="70" rx="20" ry="20" fill="url(#blob-loader-c)" opacity="0.75" />
      </g>

      <circle
        className="blob-loader-core"
        style={{ transformOrigin: "50px 50px" }}
        cx="50"
        cy="50"
        r="19"
        fill="url(#blob-loader-core)"
        opacity="0.95"
      />
      <circle cx="50" cy="50" r="34" fill="none" stroke="var(--app-outline)" strokeOpacity="0.12" strokeWidth="1.5" />
    </svg>
  );
}
