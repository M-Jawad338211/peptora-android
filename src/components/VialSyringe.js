import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { PanResponder, StyleSheet, Text, View } from "react-native";
import Svg, { ClipPath, Defs, G, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import { colors, fonts } from "../lib/theme";
import { tick } from "../lib/haptics";
import { trimNum } from "../lib/format";

/**
 * The picture that goes with the arithmetic: a vial and a U-100 syringe,
 * drawn flat, that follow the numbers as they are typed.
 *
 * Two ways to interact with it:
 *   - drag the plunger, and the syringe reports the units it is set to, so
 *     the conversion can be run backwards (units to amount);
 *   - a caller can drive `setProgress(0..1)` through the ref, which replays
 *     the draw from empty up to the mark. The hold buttons use that.
 *
 * Everything shown is derived from the props. The component holds no numbers
 * of its own, so it can never disagree with the results beside it.
 */

// ── syringe geometry, in viewBox units ──────────────────────────────────────
const SW = 340;
const SH = 92;
const B_X = 60; // barrel left edge (the 100 mark)
const B_W = 232; // barrel length
const B_Y = 22;
const B_H = 32;
const B_RIGHT = B_X + B_W; // needle end (the 0 mark)
const CY = B_Y + B_H / 2;

// ── vial geometry ───────────────────────────────────────────────────────────
const VW = 84;
const VH = 118;
const V_BODY = { x: 12, y: 30, w: 60, h: 80, r: 10 };
const V_INNER = { x: 14.5, y: 32.5, w: 55, h: 75 };

const LIQUID = colors.teal;
const OVER = colors.red;
const GLASS = "rgba(255,255,255,0.30)";
const GLASS_FILL = "rgba(255,255,255,0.04)";

function clamp(n, lo, hi) {
  return Math.min(Math.max(n, lo), hi);
}

/** Position of the plunger stopper for a number of units. */
export function stopperX(units, maxUnits = 100) {
  return B_RIGHT - (clamp(units, 0, maxUnits) / maxUnits) * B_W;
}

/** Units for a horizontal position on the rendered syringe (inverse of stopperX). */
export function unitsAtX(x, renderedWidth, maxUnits = 100) {
  if (!renderedWidth) return 0;
  const vx = (x / renderedWidth) * SW;
  return clamp(Math.round(((B_RIGHT - vx) / B_W) * maxUnits), 0, maxUnits);
}

/**
 * How full to draw the vial. A vial is rarely filled to the brim, so the
 * scale is the smallest common vial size that holds the water entered.
 */
export function vialLevel(waterMl) {
  if (!waterMl || waterMl <= 0) return 0;
  const capacity = waterMl <= 3 ? 3 : waterMl <= 5 ? 5 : waterMl <= 10 ? 10 : waterMl;
  return clamp(waterMl / capacity, 0, 1) * 0.92;
}

function fmt(n, digits) {
  return trimNum(n, digits);
}

function Vial({ vialMg, waterMl, drawnMl }) {
  const remaining = Math.max((waterMl || 0) - (drawnMl || 0), 0);
  const level = vialLevel(waterMl) * (waterMl > 0 ? remaining / waterMl : 0);
  const liquidH = level * V_INNER.h;
  const liquidY = V_INNER.y + V_INNER.h - liquidH;
  const hasPowder = !(waterMl > 0) && vialMg > 0;

  return (
    <Svg width={VW} height={VH} viewBox={`0 0 ${VW} ${VH}`}>
      <Defs>
        <ClipPath id="vial-inner">
          <Rect x={V_INNER.x} y={V_INNER.y} width={V_INNER.w} height={V_INNER.h} rx={8} />
        </ClipPath>
      </Defs>

      {/* Crimp cap and neck */}
      <Rect x={25} y={5} width={34} height={13} rx={3} fill="#5d6f86" />
      <Rect x={25} y={14} width={34} height={2} fill="rgba(0,0,0,0.22)" />
      <Rect x={31} y={18} width={22} height={13} fill={GLASS_FILL} stroke={GLASS} strokeWidth={1.4} />

      {/* Body */}
      <Rect
        x={V_BODY.x} y={V_BODY.y} width={V_BODY.w} height={V_BODY.h} rx={V_BODY.r}
        fill={GLASS_FILL} stroke={GLASS} strokeWidth={1.6}
      />

      <G clipPath="url(#vial-inner)">
        {liquidH > 0.5 && (
          <>
            <Rect x={V_INNER.x} y={liquidY} width={V_INNER.w} height={liquidH} fill={LIQUID} fillOpacity={0.3} />
            <Line
              x1={V_INNER.x} y1={liquidY} x2={V_INNER.x + V_INNER.w} y2={liquidY}
              stroke={LIQUID} strokeWidth={1.6} strokeOpacity={0.9}
            />
          </>
        )}
        {hasPowder && (
          <Rect
            x={V_INNER.x + 5} y={V_INNER.y + V_INNER.h - 11} width={V_INNER.w - 10} height={9} rx={3}
            fill="rgba(232,237,245,0.72)"
          />
        )}
      </G>

      {/* The vial's label, so the amount stays readable at any liquid level */}
      {vialMg > 0 && (
        <>
          <Rect
            x={V_BODY.x + 5} y={V_BODY.y + 26} width={V_BODY.w - 10} height={24} rx={4}
            fill={colors.navy} fillOpacity={0.9} stroke={GLASS} strokeWidth={1}
          />
          <SvgText
            x={VW / 2} y={V_BODY.y + 42.5} textAnchor="middle"
            fontSize={12} fontWeight="700" fill={colors.tx} fontFamily={fonts.mono}
          >
            {`${fmt(vialMg, 2)} mg`}
          </SvgText>
        </>
      )}
    </Svg>
  );
}

function Syringe({ units, maxUnits, overflow, draggable, dragging }) {
  const gx = stopperX(units, maxUnits);
  const fillW = B_RIGHT - gx;
  const ticks = useMemo(
    () => Array.from({ length: 11 }, (_, i) => (i * maxUnits) / 10),
    [maxUnits],
  );
  const liquid = overflow ? OVER : LIQUID;
  const handle = dragging ? colors.tx : colors.teal;

  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${SW} ${SH}`}>
      {/* Thumb pad and the part of the rod outside the barrel */}
      <Rect x={12} y={B_Y - 4} width={11} height={B_H + 8} rx={4} fill="rgba(255,255,255,0.16)" />
      <Rect x={23} y={CY - 2.5} width={B_X - 9 - 23} height={5} fill="rgba(255,255,255,0.14)" />
      {/* Finger flange */}
      <Rect x={B_X - 9} y={B_Y - 9} width={9} height={B_H + 18} rx={3} fill="rgba(255,255,255,0.16)" />

      {/* Barrel */}
      <Rect x={B_X} y={B_Y} width={B_W} height={B_H} rx={5} fill={GLASS_FILL} />
      {/* Rod inside the barrel, up to the stopper */}
      <Rect x={B_X} y={CY - 2.5} width={Math.max(gx - B_X - 4, 0)} height={5} fill="rgba(255,255,255,0.12)" />
      {/* Liquid, from the stopper to the needle end */}
      {fillW > 0.4 && (
        <Rect x={gx} y={B_Y + 3} width={fillW} height={B_H - 6} rx={3} fill={liquid} fillOpacity={0.82} />
      )}
      <Rect x={B_X} y={B_Y} width={B_W} height={B_H} rx={5} fill="none" stroke={GLASS} strokeWidth={1.6} />

      {/* Stopper */}
      <Rect x={gx - 4} y={B_Y + 2} width={8} height={B_H - 4} rx={2} fill="#a9bbd6" />

      {/* Grab handle above the stopper, only where the plunger can be dragged */}
      {draggable && (
        <G>
          <Line x1={gx} y1={B_Y - 2} x2={gx} y2={B_Y + 2} stroke={handle} strokeWidth={2} />
          <Rect x={gx - 13} y={B_Y - 16} width={26} height={14} rx={7} fill={handle} />
          <Path
            d={`M ${gx - 3.5},${B_Y - 12.5} L ${gx - 7},${B_Y - 9} L ${gx - 3.5},${B_Y - 5.5} M ${gx + 3.5},${B_Y - 12.5} L ${gx + 7},${B_Y - 9} L ${gx + 3.5},${B_Y - 5.5}`}
            stroke="#021a0e"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </G>
      )}

      {/* Needle hub and needle */}
      <Path
        d={`M ${B_RIGHT},${B_Y + 8} L ${B_RIGHT + 12},${CY - 3} L ${B_RIGHT + 12},${CY + 3} L ${B_RIGHT},${B_Y + B_H - 8} Z`}
        fill="rgba(255,255,255,0.14)" stroke={GLASS} strokeWidth={1}
      />
      <Line
        x1={B_RIGHT + 12} y1={CY} x2={SW - 8} y2={CY}
        stroke="rgba(200,215,235,0.7)" strokeWidth={2.2} strokeLinecap="round"
      />

      {/* Scale: a mark every 10 units, a number every 20 */}
      {ticks.map((u) => {
        const x = stopperX(u, maxUnits);
        const major = Math.round((u / maxUnits) * 10) % 2 === 0;
        return (
          <G key={u}>
            <Line
              x1={x} y1={B_Y + B_H + 3} x2={x} y2={B_Y + B_H + (major ? 13 : 8)}
              stroke={major ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.3)"}
              strokeWidth={major ? 1.6 : 1.1}
            />
            {major && (
              <SvgText
                x={x} y={B_Y + B_H + 27} textAnchor="middle"
                fontSize={11} fontWeight="600" fill="rgba(255,255,255,0.62)" fontFamily={fonts.mono}
              >
                {String(u)}
              </SvgText>
            )}
          </G>
        );
      })}
    </Svg>
  );
}

const VialSyringe = forwardRef(function VialSyringe(
  {
    vialMg,
    waterMl,
    units,
    maxUnits = 100,
    onUnitsChange,
    onInteraction,
    hint,
  },
  ref,
) {
  const target = units != null && isFinite(units) ? Math.max(units, 0) : null;
  const overflow = target != null && target > maxUnits;
  const draggable = typeof onUnitsChange === "function" && vialMg > 0 && waterMl > 0;

  const [shown, setShown] = useState(target ?? 0);
  const [progress, setProgressState] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [width, setWidth] = useState(0);

  const shownRef = useRef(shown);
  const raf = useRef(null);
  const draggingRef = useRef(false);
  const lastUnit = useRef(null);
  const progressTicks = useRef(0);

  useImperativeHandle(ref, () => ({
    /** 0..1 while a hold is running; null hands control back to the numbers. */
    setProgress(p) {
      if (p == null || p <= 0) {
        progressTicks.current = 0;
        setProgressState(null);
        return;
      }
      const clamped = clamp(p, 0, 1);
      // A light tick for every tenth of the way, like marks passing.
      const step = Math.floor(clamped * 10);
      if (step > progressTicks.current) {
        progressTicks.current = step;
        tick();
      }
      setProgressState(clamped);
    },
  }), []);

  // Ease towards a new result, unless a finger or a hold is driving the picture.
  useEffect(() => {
    cancelAnimationFrame(raf.current);
    const to = Math.min(target ?? 0, maxUnits);
    if (draggingRef.current) {
      shownRef.current = to;
      setShown(to);
      return;
    }
    const from = shownRef.current;
    if (Math.abs(from - to) < 0.05) {
      shownRef.current = to;
      setShown(to);
      return;
    }
    const t0 = Date.now();
    const duration = 420;
    const step = () => {
      const t = Math.min((Date.now() - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = from + (to - from) * eased;
      shownRef.current = value;
      setShown(value);
      if (t < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, maxUnits]);

  const widthRef = useRef(0);
  widthRef.current = width;
  const callbacks = useRef({});
  callbacks.current = { onUnitsChange, onInteraction, draggable, maxUnits };

  const pan = useMemo(() => {
    const move = (evt) => {
      const { onUnitsChange: change, maxUnits: max } = callbacks.current;
      const value = unitsAtX(evt.nativeEvent.locationX, widthRef.current, max);
      if (value === lastUnit.current) return;
      lastUnit.current = value;
      if (value % 5 === 0) tick();
      change?.(value);
    };
    const end = () => {
      draggingRef.current = false;
      lastUnit.current = null;
      setDragging(false);
      callbacks.current.onInteraction?.(false);
    };
    return PanResponder.create({
      // Only a sideways drag claims the touch, so a thumb resting on the
      // picture can still scroll the page up and down.
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        !!callbacks.current.draggable && Math.abs(g.dx) > 4 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: (evt) => {
        draggingRef.current = true;
        setDragging(true);
        callbacks.current.onInteraction?.(true);
        move(evt);
      },
      onPanResponderMove: move,
      onPanResponderRelease: end,
      onPanResponderTerminate: end,
      onPanResponderTerminationRequest: () => false,
    });
  }, []);

  const holding = progress != null;
  const displayUnits = holding ? Math.min(target ?? 0, maxUnits) * progress : shown;
  const drawnMl = holding && target != null ? (Math.min(target, maxUnits) / maxUnits) * progress : 0;

  return (
    <View>
      <View style={s.top}>
        <Vial vialMg={vialMg} waterMl={waterMl} drawnMl={drawnMl} />
        <View style={s.readout}>
          <Text style={s.readoutLabel}>U-100 syringe</Text>
          <View style={s.unitsRow}>
            <Text style={[s.unitsNum, overflow && s.over]}>
              {target == null ? "0" : holding ? String(Math.round(displayUnits)) : fmt(target, 1)}
            </Text>
            <Text style={s.unitsWord}>units</Text>
          </View>
          <Text style={s.readoutSub}>
            {waterMl > 0 ? `${fmt(waterMl, 2)} mL in the vial` : "No water entered yet"}
          </Text>
        </View>
      </View>

      <View
        style={s.syringe}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        accessible
        accessibilityRole={draggable ? "adjustable" : "image"}
        accessibilityLabel={
          target == null
            ? "Syringe, empty"
            : `Syringe set to ${fmt(target, 1)} of ${maxUnits} units`
        }
        accessibilityActions={draggable ? [{ name: "increment" }, { name: "decrement" }] : undefined}
        onAccessibilityAction={(e) => {
          if (!draggable) return;
          const current = Math.round(target ?? 0);
          if (e.nativeEvent.actionName === "increment") onUnitsChange(clamp(current + 1, 0, maxUnits));
          if (e.nativeEvent.actionName === "decrement") onUnitsChange(clamp(current - 1, 0, maxUnits));
        }}
      >
        <Syringe
          units={displayUnits}
          maxUnits={maxUnits}
          overflow={overflow}
          draggable={draggable}
          dragging={dragging}
        />
        <View style={StyleSheet.absoluteFill} {...pan.panHandlers} />
      </View>

      {hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
});

export default VialSyringe;

const s = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", gap: 16 },
  readout: { flex: 1 },
  readoutLabel: {
    color: colors.tx3, fontSize: 11, fontWeight: "700",
    textTransform: "uppercase", letterSpacing: 0.5,
  },
  unitsRow: { flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 2 },
  unitsNum: { color: colors.teal, fontSize: 40, fontWeight: "800", fontFamily: fonts.mono },
  unitsWord: { color: colors.tx2, fontSize: 15, fontWeight: "600" },
  over: { color: colors.red },
  readoutSub: { color: colors.tx3, fontSize: 12, marginTop: 2 },
  syringe: { width: "100%", aspectRatio: SW / SH, marginTop: 6 },
  hint: { color: colors.tx3, fontSize: 12, textAlign: "center", marginTop: 4 },
});
