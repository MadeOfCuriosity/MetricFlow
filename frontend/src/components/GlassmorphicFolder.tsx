import { useId } from 'react'
import { getTagColor } from '../constants/tagColors'
import { useTheme } from '../context/ThemeContext'

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
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'
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
  const frontFlapClipId = `ffc_${id}`
  const upperClipId = `uc_${id}`
  const tintGradId = `tg_${id}`

  const renderPapers = (isBlurred = false) => (
    <>
      {/* Paper 1: Back Left Sheet (tilted -8deg) */}
      <g transform="rotate(-8 58 46)">
        <rect
          x="26"
          y="14"
          width="62"
          height="92"
          rx="6"
          fill={`url(#${paper1GradId})`}
          stroke={isLight ? 'rgba(203, 213, 225, 0.7)' : 'rgba(255, 255, 255, 0.08)'}
          strokeWidth={0.8}
          filter={isBlurred ? undefined : `url(#${paperShadowId})`}
        />
        {/* Document Lines */}
        <line x1="34" y1="24" x2="68" y2="24" stroke={isLight ? '#94a3b8' : '#a0a5b2'} strokeWidth={isBlurred ? 2.5 : 2} strokeLinecap="round" opacity="0.65" />
        <line x1="34" y1="30" x2="76" y2="30" stroke={isLight ? '#94a3b8' : '#a0a5b2'} strokeWidth={isBlurred ? 2.5 : 2} strokeLinecap="round" opacity="0.65" />
        <line x1="34" y1="36" x2="60" y2="36" stroke={isLight ? '#94a3b8' : '#a0a5b2'} strokeWidth={isBlurred ? 2.5 : 2} strokeLinecap="round" opacity="0.5" />
        <line x1="34" y1="44" x2="74" y2="44" stroke={isLight ? '#94a3b8' : '#a0a5b2'} strokeWidth={isBlurred ? 2.5 : 2} strokeLinecap="round" opacity="0.5" />
        <line x1="34" y1="52" x2="70" y2="52" stroke={isLight ? '#94a3b8' : '#a0a5b2'} strokeWidth={isBlurred ? 2.5 : 2} strokeLinecap="round" opacity="0.5" />
        <line x1="34" y1="60" x2="78" y2="60" stroke={isLight ? '#94a3b8' : '#a0a5b2'} strokeWidth={isBlurred ? 2.5 : 2} strokeLinecap="round" opacity="0.5" />
        <line x1="34" y1="68" x2="64" y2="68" stroke={isLight ? '#94a3b8' : '#a0a5b2'} strokeWidth={isBlurred ? 2.5 : 2} strokeLinecap="round" opacity="0.45" />
        <line x1="34" y1="76" x2="72" y2="76" stroke={isLight ? '#94a3b8' : '#a0a5b2'} strokeWidth={isBlurred ? 2.5 : 2} strokeLinecap="round" opacity="0.4" />
        <line x1="34" y1="84" x2="58" y2="84" stroke={isLight ? '#94a3b8' : '#a0a5b2'} strokeWidth={isBlurred ? 2.5 : 2} strokeLinecap="round" opacity="0.35" />
      </g>

      {/* Paper 2: Middle Right Sheet (tilted +6deg) */}
      <g transform="rotate(6 104 48)">
        <rect
          x="74"
          y="16"
          width="60"
          height="90"
          rx="6"
          fill={`url(#${paper2GradId})`}
          stroke={isLight ? 'rgba(203, 213, 225, 0.7)' : 'rgba(255, 255, 255, 0.08)'}
          strokeWidth={0.8}
          filter={isBlurred ? undefined : `url(#${paperShadowId})`}
        />
        {/* Document Lines */}
        <line x1="82" y1="26" x2="118" y2="26" stroke={isLight ? '#94a3b8' : '#a5abb8'} strokeWidth={isBlurred ? 2.5 : 2} strokeLinecap="round" opacity="0.65" />
        <line x1="82" y1="32" x2="124" y2="32" stroke={isLight ? '#94a3b8' : '#a5abb8'} strokeWidth={isBlurred ? 2.5 : 2} strokeLinecap="round" opacity="0.65" />
        <line x1="82" y1="38" x2="108" y2="38" stroke={isLight ? '#94a3b8' : '#a5abb8'} strokeWidth={isBlurred ? 2.5 : 2} strokeLinecap="round" opacity="0.5" />
        <line x1="82" y1="46" x2="120" y2="46" stroke={isLight ? '#94a3b8' : '#a5abb8'} strokeWidth={isBlurred ? 2.5 : 2} strokeLinecap="round" opacity="0.5" />
        <line x1="82" y1="54" x2="114" y2="54" stroke={isLight ? '#94a3b8' : '#a5abb8'} strokeWidth={isBlurred ? 2.5 : 2} strokeLinecap="round" opacity="0.5" />
        <line x1="82" y1="62" x2="122" y2="62" stroke={isLight ? '#94a3b8' : '#a5abb8'} strokeWidth={isBlurred ? 2.5 : 2} strokeLinecap="round" opacity="0.45" />
        <line x1="82" y1="70" x2="110" y2="70" stroke={isLight ? '#94a3b8' : '#a5abb8'} strokeWidth={isBlurred ? 2.5 : 2} strokeLinecap="round" opacity="0.4" />
        <line x1="82" y1="78" x2="118" y2="78" stroke={isLight ? '#94a3b8' : '#a5abb8'} strokeWidth={isBlurred ? 2.5 : 2} strokeLinecap="round" opacity="0.35" />
      </g>

      {/* Paper 3: Front Sheet (tilted -2deg, crisp white) */}
      <g transform="rotate(-2 80 44)">
        <rect
          x="46"
          y="10"
          width="68"
          height="96"
          rx="7"
          fill={`url(#${paper3GradId})`}
          stroke={isLight ? 'rgba(203, 213, 225, 0.75)' : 'rgba(255, 255, 255, 0.12)'}
          strokeWidth={0.8}
          filter={isBlurred ? undefined : `url(#${paperShadowId})`}
        />
        {/* Mini Header & Text Lines on Front Sheet */}
        <rect x="54" y="19" width="18" height="3.5" rx="1.75" fill={isLight ? '#64748b' : '#8b92a3'} opacity="0.75" />
        <line x1="54" y1="28" x2="102" y2="28" stroke={isLight ? '#64748b' : '#9ba2b3'} strokeWidth={isBlurred ? 2.5 : 2} strokeLinecap="round" opacity="0.7" />
        <line x1="54" y1="34" x2="106" y2="34" stroke={isLight ? '#64748b' : '#9ba2b3'} strokeWidth={isBlurred ? 2.5 : 2} strokeLinecap="round" opacity="0.7" />
        <line x1="54" y1="40" x2="96" y2="40" stroke={isLight ? '#64748b' : '#9ba2b3'} strokeWidth={isBlurred ? 2.5 : 2} strokeLinecap="round" opacity="0.7" />
        <line x1="54" y1="46" x2="86" y2="46" stroke={isLight ? '#64748b' : '#9ba2b3'} strokeWidth={isBlurred ? 2.5 : 2} strokeLinecap="round" opacity="0.5" />
        <line x1="54" y1="54" x2="104" y2="54" stroke={isLight ? '#64748b' : '#9ba2b3'} strokeWidth={isBlurred ? 2.5 : 2} strokeLinecap="round" opacity="0.6" />
        <line x1="54" y1="62" x2="98" y2="62" stroke={isLight ? '#64748b' : '#9ba2b3'} strokeWidth={isBlurred ? 2.5 : 2} strokeLinecap="round" opacity="0.55" />
        <line x1="54" y1="70" x2="102" y2="70" stroke={isLight ? '#64748b' : '#9ba2b3'} strokeWidth={isBlurred ? 2.5 : 2} strokeLinecap="round" opacity="0.5" />
        <line x1="54" y1="78" x2="90" y2="78" stroke={isLight ? '#64748b' : '#9ba2b3'} strokeWidth={isBlurred ? 2.5 : 2} strokeLinecap="round" opacity="0.45" />
        <line x1="54" y1="86" x2="96" y2="86" stroke={isLight ? '#64748b' : '#9ba2b3'} strokeWidth={isBlurred ? 2.5 : 2} strokeLinecap="round" opacity="0.4" />
      </g>
    </>
  )

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 164 156"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
      >
        <defs>
          {/* Back folder body gradient (neutral glass; tag tint is layered on top) */}
          <linearGradient id={backGradId} x1="82" y1="22" x2="82" y2="142" gradientUnits="userSpaceOnUse">
            {isLight ? (
              <>
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.96" />
                <stop offset="50%" stopColor="#f1f5f9" stopOpacity="0.90" />
                <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.92" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#2c2e37" />
                <stop offset="50%" stopColor="#1e2026" />
                <stop offset="100%" stopColor="#121316" />
              </>
            )}
          </linearGradient>

          {/* Light tag tint wash (matches KPICard: tag color at low alpha fading out by ~60%) */}
          {tag && (
            <linearGradient id={tintGradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={tag.hex} stopOpacity={isLight ? 0.26 : 0.32} />
              <stop offset="75%" stopColor={tag.hex} stopOpacity="0.04" />
            </linearGradient>
          )}

          {/* Back folder stroke specular highlight */}
          <linearGradient id={backStrokeId} x1="82" y1="22" x2="82" y2="142" gradientUnits="userSpaceOnUse">
            {isLight ? (
              <>
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.90" />
                <stop offset="100%" stopColor={tag ? tag.hex : '#cbd5e1'} stopOpacity={tag ? 0.40 : 0.55} />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor={tag ? tag.glassRim : '#525562'} stopOpacity={tag ? 0.7 : 0.80} />
                <stop offset="100%" stopColor={tag ? tag.hex : '#1e2026'} stopOpacity={tag ? 0.25 : 0.40} />
              </>
            )}
          </linearGradient>

          {/* Paper 1 gradient (back left sheet) */}
          <linearGradient id={paper1GradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor={isLight ? '#f1f5f9' : '#dce0e8'} />
          </linearGradient>

          {/* Paper 2 gradient (middle right sheet) */}
          <linearGradient id={paper2GradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor={isLight ? '#f8fafc' : '#e9edf4'} />
          </linearGradient>

          {/* Paper 3 gradient (front sheet - crisp white) */}
          <linearGradient id={paper3GradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor={isLight ? '#f8fafc' : '#f5f7fa'} />
          </linearGradient>

          {/* Front Frosted Glass Flap Gradient: Translucent matte etched glass (neutral) */}
          <linearGradient id={frontGlassGradId} x1="20" y1="48" x2="144" y2="142" gradientUnits="userSpaceOnUse">
            {isLight ? (
              <>
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.72" />
                <stop offset="40%" stopColor="#f8fafc" stopOpacity="0.52" />
                <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.62" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#4f5362" stopOpacity="0.58" />
                <stop offset="40%" stopColor="#2a2c37" stopOpacity="0.44" />
                <stop offset="100%" stopColor="#15161c" stopOpacity="0.56" />
              </>
            )}
          </linearGradient>

          {/* Front Frosted Glass Border: Delicate 1px matte satin edge */}
          <linearGradient id={glassBorderGradId} x1="30" y1="48" x2="140" y2="142" gradientUnits="userSpaceOnUse">
            {isLight ? (
              tag ? (
                <>
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.80" />
                  <stop offset="50%" stopColor={tag.lightTintTop} stopOpacity="0.50" />
                  <stop offset="100%" stopColor={tag.hex} stopOpacity="0.35" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
                  <stop offset="50%" stopColor="#e2e8f0" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.30" />
                </>
              )
            ) : (
              tag ? (
                <>
                  <stop offset="0%" stopColor={tag.glassRim} stopOpacity="0.5" />
                  <stop offset="50%" stopColor={tag.hex} stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0.08" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
                  <stop offset="50%" stopColor="#ffffff" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0.04" />
                </>
              )
            )}
          </linearGradient>

          {/* Ambient Diffuse Folder Shadow */}
          <filter id={folderShadowId} x="-25%" y="-20%" width="150%" height="150%">
            <feDropShadow
              dx="0"
              dy={isLight ? 8 : 10}
              stdDeviation={isLight ? 10 : 12}
              floodColor={isLight ? (tag ? tag.hex : '#0f172a') : '#000000'}
              floodOpacity={isLight ? (tag ? 0.08 : 0.07) : 0.45}
            />
          </filter>

          {/* Front Flap Soft Drop Shadow */}
          <filter id={flapShadowId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow
              dx="0"
              dy={isLight ? 3 : 4}
              stdDeviation={isLight ? 4 : 5}
              floodColor={isLight ? '#0f172a' : '#000000'}
              floodOpacity={isLight ? 0.06 : 0.35}
            />
          </filter>

          {/* Paper Drop Shadow for sheets in open air */}
          <filter id={paperShadowId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow
              dx="0"
              dy={isLight ? 2 : 3}
              stdDeviation={isLight ? 3 : 4}
              floodColor={isLight ? '#0f172a' : '#000000'}
              floodOpacity={isLight ? 0.06 : 0.25}
            />
          </filter>

          {/* Frosted Glass Internal Diffusion Filter */}
          <filter id={paperBlurId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" />
          </filter>

          {/* Clip Path for the front flap area */}
          <clipPath id={frontFlapClipId}>
            <path d="M 12 70 C 12 56 20 48 32 48 L 68 48 C 76 48 84 54 90 59 C 95 63 100 66 108 66 L 134 66 C 145 66 152 73 152 84 L 152 122 C 152 134 142 142 130 142 L 34 142 C 22 142 12 134 12 122 Z" />
          </clipPath>

          {/* Clip Path for the upper area above the front flap */}
          <clipPath id={upperClipId}>
            <path d="M 0 0 L 164 0 L 164 68 L 134 68 C 108 68 95 65 90 61 C 84 56 76 50 68 50 L 32 50 C 20 50 12 58 12 72 L 0 72 Z" />
          </clipPath>
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
          strokeWidth={1.0}
          filter={`url(#${folderShadowId})`}
        />

        {/* Light tag tint over back plate */}
        {tag && <rect x="16" y="22" width="132" height="120" rx="24" fill={`url(#${tintGradId})`} />}

        {/* 2. Paper Stack: Interactive lift on hover */}
        <g
          className="transition-transform duration-300 ease-out origin-bottom"
          style={{
            transform: isHovered ? 'translateY(-6px)' : 'translateY(0px)',
          }}
        >
          {/* Upper portion: Crisp sheets sticking out in open air */}
          <g clipPath={`url(#${upperClipId})`}>
            {renderPapers(false)}
          </g>

          {/* Lower portion: Diffused sheets softly visible through frosted glass */}
          <g clipPath={`url(#${frontFlapClipId})`} filter={`url(#${paperBlurId})`}>
            {renderPapers(true)}
          </g>
        </g>

        {/* 3. Front Frosted Glass Flap (Square proportion, matte finish) */}
        <path
          d="M 12 70 C 12 56 20 48 32 48 L 68 48 C 76 48 84 54 90 59 C 95 63 100 66 108 66 L 134 66 C 145 66 152 73 152 84 L 152 122 C 152 134 142 142 130 142 L 34 142 C 22 142 12 134 12 122 Z"
          fill={`url(#${frontGlassGradId})`}
          stroke={`url(#${glassBorderGradId})`}
          strokeWidth="1"
          filter={`url(#${flapShadowId})`}
        />

        {/* Light tag tint over front flap */}
        {tag && (
          <path
            d="M 12 70 C 12 56 20 48 32 48 L 68 48 C 76 48 84 54 90 59 C 95 63 100 66 108 66 L 134 66 C 145 66 152 73 152 84 L 152 122 C 152 134 142 142 130 142 L 34 142 C 22 142 12 134 12 122 Z"
            fill={`url(#${tintGradId})`}
          />
        )}

        {/* Specular Highlight along top tab edge contour */}
        <path
          d="M 18 60 C 22 50 27 49 34 49 L 68 49 C 75 49 83 54.5 89 59.5 C 94 63.5 100 67 108 67 L 134 67 C 143 67 148 71 150 78"
          stroke={tag ? tag.glassRim : (isLight ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.45)')}
          strokeWidth="1.2"
          strokeOpacity={tag ? 0.75 : 1}
          strokeLinecap="round"
          fill="none"
        />
      </svg>

      {/* Ambient Radiant Glow behind folder if tag present */}
      {tag && (
        <div
          className="absolute inset-1 rounded-3xl pointer-events-none transition-all duration-300 -z-10"
          style={{
            background: isLight ? tag.lightGlow : tag.ambientGlow,
            filter: 'blur(16px)',
            opacity: isHovered ? 0.55 : 0.32,
            transform: isHovered ? 'scale(1.06)' : 'scale(1)',
          }}
        />
      )}
    </div>
  )
}
