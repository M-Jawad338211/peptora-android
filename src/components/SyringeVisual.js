import { useRef, useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Svg, {
  Defs, LinearGradient, Stop, ClipPath,
  Rect, Line, Path, G, Text as SvgText,
} from 'react-native-svg'
import { colors, fonts } from '../lib/theme'

export default function SyringeVisual({ units, maxUnits = 100 }) {
  const [currentPct, setCurrentPct] = useState(0)
  const pctRef = useRef(0)
  const rafRef = useRef(null)

  const targetPct = Math.min((units / maxUnits) * 100, 100)
  const isOverflow = units > maxUnits

  useEffect(() => {
    const from = pctRef.current
    const to = targetPct
    if (Math.abs(from - to) < 0.01) return

    const t0 = performance.now()
    const dur = 900

    const tick = (now) => {
      const t = Math.min((now - t0) / dur, 1)
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
      const val = from + (to - from) * ease
      pctRef.current = val
      setCurrentPct(val)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }

    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [targetPct])

  // SVG geometry — same coordinate space as the web version
  const W = 640, H = 116
  const bX = 72, bY = 24, bW = 460, bH = 52
  const cy = bY + bH / 2 // 50

  const fillW = (currentPct / 100) * bW
  const gX = bX + bW - fillW
  const flangeLeft = bX - 1
  const flangeRight = bX - 1 + 13
  const rodAStart = 36
  const rodAWidth = flangeLeft - 6 - rodAStart

  const fillColor = isOverflow ? '#ff6060' : 'url(#sg-fill)'

  return (
    <View style={s.wrap}>
      <View style={s.header}>
        <Text style={s.headerLabel}>SYRINGE FILL LEVEL</Text>
        <Text style={[s.headerValue, isOverflow && s.overflow]}>
          {units.toFixed(1)} / {maxUnits} IU{isOverflow ? '  ⚠ overflow' : ''}
        </Text>
      </View>

      <Svg viewBox={`0 0 ${W} ${H}`} style={s.svg}>
        <Defs>
          <LinearGradient id="sg-fill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#00f0a0" stopOpacity="0.92" />
            <Stop offset="100%" stopColor="#00b877" stopOpacity="0.96" />
          </LinearGradient>
          <ClipPath id="sg-barrel">
            <Rect x={bX} y={bY} width={bW} height={bH} rx={4} />
          </ClipPath>
        </Defs>

        {/* Barrel background */}
        <Rect x={bX} y={bY} width={bW} height={bH} rx={4}
          fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.17)" strokeWidth={1.5} />

        {/* Liquid fill */}
        <Rect x={gX} y={bY + 5} width={fillW} height={bH - 10} rx={3}
          fill={fillColor} clipPath="url(#sg-barrel)" />

        {/* Glass highlight */}
        <Rect x={bX + 3} y={bY + 5} width={bW - 6} height={4} rx={2}
          fill="rgba(255,255,255,0.06)" clipPath="url(#sg-barrel)" />

        {/* Rod B — inside barrel, thumb-pad side */}
        <Rect x={flangeRight} y={cy - 2}
          width={Math.max(gX - 5 - flangeRight, 0)} height={4} rx={0}
          fill="rgba(255,255,255,0.14)" />

        {/* Flange */}
        <Rect x={flangeLeft} y={bY - 14} width={13} height={bH + 28} rx={4}
          fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.16)" strokeWidth={1} />

        {/* Thumb pad */}
        <Rect x={14} y={bY - 14} width={14} height={bH + 28} rx={5}
          fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.18)" strokeWidth={1} />

        {/* Rod A — outside barrel */}
        <Rect x={rodAStart} y={cy - 2} width={rodAWidth} height={4} rx={2}
          fill="rgba(255,255,255,0.10)" />

        {/* Tick marks */}
        {Array.from({ length: 21 }, (_, i) => i * 5).map((u) => {
          const x = bX + bW - (u / maxUnits) * bW
          const major = u % 10 === 0
          return (
            <G key={u}>
              <Line
                x1={x} y1={bY + bH + 2} x2={x} y2={bY + bH + (major ? 12 : 7)}
                stroke={major ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.18)'}
                strokeWidth={major ? 1.5 : 1}
              />
              {major && u > 0 && (
                <SvgText x={x} y={bY + bH + 25}
                  textAnchor="middle" fontSize={8.5}
                  fill="rgba(255,255,255,0.30)" fontFamily={fonts.mono}>
                  {u}
                </SvgText>
              )}
            </G>
          )
        })}

        {/* Plunger gasket */}
        <Rect x={gX - 5} y={bY + 2} width={10} height={bH - 4} rx={2}
          fill="rgba(160,185,255,0.50)" stroke="rgba(180,200,255,0.35)" strokeWidth={1} />

        {/* Needle hub */}
        <Path
          d={`M ${bX + bW + 14},${cy - 3} L ${bX + bW},${bY + 10} L ${bX + bW},${bY + bH - 10} L ${bX + bW + 14},${cy + 3} Z`}
          fill="rgba(180,210,230,0.15)" stroke="rgba(180,210,230,0.30)" strokeWidth={0.8} />

        {/* Needle shaft */}
        <Line x1={bX + bW + 14} y1={cy} x2={W - 8} y2={cy}
          stroke="rgba(180,210,230,0.55)" strokeWidth={2.5} strokeLinecap="round" />
      </Svg>

      {isOverflow && (
        <Text style={s.overflowMsg}>
          Dose exceeds 100-unit syringe capacity — split into multiple draws or use a larger syringe.
        </Text>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { marginTop: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  headerLabel: { fontFamily: fonts.mono, fontSize: 10, color: colors.tx3, letterSpacing: 0.5 },
  headerValue: { fontFamily: fonts.mono, fontSize: 10, color: colors.tx2 },
  overflow: { color: '#ff6060' },
  svg: { width: '100%', aspectRatio: 640 / 116 },
  overflowMsg: {
    fontFamily: fonts.mono, fontSize: 11, color: '#ff6060',
    marginTop: 6, lineHeight: 17,
  },
})
