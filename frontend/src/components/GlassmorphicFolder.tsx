import { useId } from 'react'
import { getTagColor } from '../constants/tagColors'

interface GlassmorphicFolderProps {
  color?: string | null
  className?: string
  isHovered?: boolean
}

export function GlassmorphicFolder({
  color = null,
  className = 'w-36 h-34',
  isHovered = false,
}: GlassmorphicFolderProps) {
  const id = useId().replace(/:/g, '_')
  const tag = getTagColor(color)

  const backGradId = `bg_${id}`
  const backStrokeId = `bs_${id}`
  const paper1GradId = `p1_${id}`
  const paper2GradId = `p2_${id}`
  const paper3GradId = `p3_${id}`
  const frontGlassGradId = `fg_${id}`
  const glassBorderGradId = `gb_${id}`
  const folderShadowId = `fs_${id}`
  const flapShadowId = `fls_${id}`
  const paperShadowId = `ps_${id}`
  const paperBlurId = `pb_${id}`

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 164 156"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
      >
        <defs>
          {/* Back folder body gradient (dark charcoal/matte obsidian) */}
          <linearGradient id={backGradId} x1="82" y1="22" x2="82" y2="142" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2e3037" />
            <stop offset="40%" stopColor="#212228" />
            <stop offset="100%" stopColor="#131417" />
          </linearGradient>

          {/* Back folder stroke specular highlight */}
          <linearGradient id={backStrokeId} x1="82" y1="22" x2="82" y2="142" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={tag ? tag.glassRim : '#525562'} stopOpacity={tag ? 0.75 : 1} />
            <stop offset="100%" stopColor="#222328" />
          </linearGradient>

          {/* Paper 1 gradient (back left sheet) */}
          <linearGradient id={paper1GradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#dce0e8" />
          </linearGradient>

          {/* Paper 2 gradient (middle right sheet) */}
          <linearGradient id={paper2GradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e9edf4" />
          </linearGradient>

          {/* Paper 3 gradient (front sheet - crisp white) */}
          <linearGradient id={paper3GradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f5f7fa" />
          </linearGradient>

          {/* Front Frosted Glass Flap Gradient (Translucent Smoky Glass with soft luminous color shade) */}
          <linearGradient id={frontGlassGradId} x1="20" y1="48" x2="144" y2="142" gradientUnits="userSpaceOnUse">
            <stop
              offset="0%"
              stopColor={tag ? tag.glassTintTop : '#525562'}
              stopOpacity={tag ? 0.82 : 0.82}
            />
            <stop
              offset="35%"
              stopColor={tag ? tag.glassTintBottom : '#32343d'}
              stopOpacity={tag ? 0.74 : 0.72}
            />
            <stop offset="100%" stopColor="#16171b" stopOpacity="0.88" />
          </linearGradient>

          {/* Front Glass Border Specular Highlight */}
          <linearGradient id={glassBorderGradId} x1="30" y1="48" x2="140" y2="142" gradientUnits="userSpaceOnUse">
            <stop
              offset="0%"
              stopColor={tag ? tag.glassRim : '#ffffff'}
              stopOpacity={tag ? 0.85 : 0.55}
            />
            <stop offset="35%" stopColor="#ffffff" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.06" />
          </linearGradient>

          {/* Ambient Diffuse Folder Shadow */}
          <filter id={folderShadowId} x="-25%" y="-20%" width="150%" height="150%">
            <feDropShadow dx="0" dy="12" stdDeviation="14" floodColor="#000000" floodOpacity="0.65" />
          </filter>

          {/* Front Flap Shadow */}
          <filter id={flapShadowId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="5" stdDeviation="7" floodColor="#000000" floodOpacity="0.5" />
          </filter>

          {/* Paper Drop Shadow */}
          <filter id={paperShadowId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000000" floodOpacity="0.3" />
          </filter>

          {/* Frosted Glass Internal Blur Filter */}
          <filter id={paperBlurId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" />
          </filter>
        </defs>

        {/* 1. Back Plate (Square Squircle proportion: 132 x 120, rx=24) */}
        <rect
          x="16"
          y="22"
          width="132"
          height="120"
          rx="24"
          fill={`url(#${backGradId})`}
          stroke={`url(#${backStrokeId})`}
          strokeWidth="1.2"
          filter={`url(#${folderShadowId})`}
        />

        {/* Ambient Top Colored Reflection if tag present */}
        {tag && (
          <circle
            cx="116"
            cy="40"
            r="28"
            fill={tag.hex}
            opacity="0.22"
            filter={`url(#${paperBlurId})`}
          />
        )}

        {/* 2. Paper Stack: Interactive lift on hover */}
        <g
          className="transition-transform duration-300 ease-out origin-bottom"
          style={{
            transform: isHovered ? 'translateY(-6px)' : 'translateY(0px)',
          }}
        >
          {/* Paper 1: Back Left Sheet (tilted -8deg) */}
          <g transform="rotate(-8 58 46)">
            <rect
              x="26"
              y="14"
              width="62"
              height="62"
              rx="6"
              fill={`url(#${paper1GradId})`}
              filter={`url(#${paperShadowId})`}
            />
            {/* Document Lines */}
            <line x1="34" y1="24" x2="68" y2="24" stroke="#a0a5b2" strokeWidth="2" strokeLinecap="round" opacity="0.65" />
            <line x1="34" y1="30" x2="76" y2="30" stroke="#a0a5b2" strokeWidth="2" strokeLinecap="round" opacity="0.65" />
            <line x1="34" y1="36" x2="60" y2="36" stroke="#a0a5b2" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
          </g>

          {/* Paper 2: Middle Right Sheet (tilted +6deg) */}
          <g transform="rotate(6 104 48)">
            <rect
              x="74"
              y="16"
              width="60"
              height="60"
              rx="6"
              fill={`url(#${paper2GradId})`}
              filter={`url(#${paperShadowId})`}
            />
            {/* Document Lines */}
            <line x1="82" y1="26" x2="118" y2="26" stroke="#a5abb8" strokeWidth="2" strokeLinecap="round" opacity="0.65" />
            <line x1="82" y1="32" x2="124" y2="32" stroke="#a5abb8" strokeWidth="2" strokeLinecap="round" opacity="0.65" />
            <line x1="82" y1="38" x2="108" y2="38" stroke="#a5abb8" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
          </g>

          {/* Paper 3: Front Sheet (tilted -2deg, crisp white) */}
          <g transform="rotate(-2 80 44)">
            <rect
              x="46"
              y="10"
              width="68"
              height="66"
              rx="7"
              fill={`url(#${paper3GradId})`}
              filter={`url(#${paperShadowId})`}
            />
            {/* Mini Header & Text Lines on Front Sheet */}
            <rect x="54" y="19" width="18" height="3.5" rx="1.75" fill="#8b92a3" opacity="0.75" />
            <line x1="54" y1="28" x2="102" y2="28" stroke="#9ba2b3" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
            <line x1="54" y1="34" x2="106" y2="34" stroke="#9ba2b3" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
            <line x1="54" y1="40" x2="96" y2="40" stroke="#9ba2b3" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
            <line x1="54" y1="46" x2="86" y2="46" stroke="#9ba2b3" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
          </g>

          {/* Blurred Silhouette of papers visible through frosted glass */}
          <g filter={`url(#${paperBlurId})`} opacity="0.4" clipPath={`url(#frontFlapClip_${id})`}>
            <rect x="32" y="52" width="58" height="46" rx="5" fill="#ffffff" />
            <rect x="78" y="54" width="56" height="44" rx="5" fill="#ffffff" />
            <rect x="50" y="48" width="64" height="50" rx="5" fill="#ffffff" />
            <line x1="58" y1="64" x2="100" y2="64" stroke="#808796" strokeWidth="2.5" />
            <line x1="58" y1="72" x2="106" y2="72" stroke="#808796" strokeWidth="2.5" />
            <line x1="58" y1="80" x2="92" y2="80" stroke="#808796" strokeWidth="2.5" />
          </g>
        </g>

        {/* Clip Path for the front flap area */}
        <clipPath id={`frontFlapClip_${id}`}>
          <path d="M 12 70 C 12 56 20 48 32 48 L 68 48 C 76 48 84 54 90 59 C 95 63 100 66 108 66 L 134 66 C 145 66 152 73 152 84 L 152 122 C 152 134 142 142 130 142 L 34 142 C 22 142 12 134 12 122 Z" />
        </clipPath>

        {/* 3. Front Frosted Glass Flap with Tab Profile (Square proportion) */}
        <path
          d="M 12 70 C 12 56 20 48 32 48 L 68 48 C 76 48 84 54 90 59 C 95 63 100 66 108 66 L 134 66 C 145 66 152 73 152 84 L 152 122 C 152 134 142 142 130 142 L 34 142 C 22 142 12 134 12 122 Z"
          fill={`url(#${frontGlassGradId})`}
          stroke={`url(#${glassBorderGradId})`}
          strokeWidth="1.3"
          filter={`url(#${flapShadowId})`}
        />

        {/* Internal Luminous Glass Tint wash if tag present */}
        {tag && (
          <ellipse
            cx="108"
            cy="84"
            rx="44"
            ry="34"
            fill={tag.hex}
            opacity="0.28"
            filter={`url(#${paperBlurId})`}
            clipPath={`url(#frontFlapClip_${id})`}
          />
        )}

        {/* Specular Highlight along top tab edge contour */}
        <path
          d="M 18 60 C 22 50 27 49 34 49 L 68 49 C 75 49 83 54.5 89 59.5 C 94 63.5 100 67 108 67 L 134 67 C 143 67 148 71 150 78"
          stroke={tag ? tag.glassRim : 'rgba(255, 255, 255, 0.65)'}
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}

