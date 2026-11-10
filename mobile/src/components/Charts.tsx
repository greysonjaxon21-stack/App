import { useState } from "react";
import { StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from "react-native-svg";
import { colors } from "../lib/theme.ts";

function useWidth(): [number, (e: LayoutChangeEvent) => void] {
  const [w, setW] = useState(0);
  return [w, (e) => setW(e.nativeEvent.layout.width)];
}

export function LineChart({ points, goal, height = 180, format }: { points: { label: string; value: number }[]; goal?: number; height?: number; format: (n: number) => string }) {
  const [width, onLayout] = useWidth();
  if (points.length === 0) {
    return <Text style={s.empty}>No data yet</Text>;
  }
  const values = points.map((p) => p.value).concat(goal != null ? [goal] : []);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (max - min < 2) {
    min -= 1;
    max += 1;
  }
  const padL = 44;
  const padR = 10;
  const padT = 10;
  const padB = 22;
  const innerW = Math.max(1, width - padL - padR);
  const innerH = height - padT - padB;
  const x = (i: number) => padL + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => padT + (1 - (v - min) / (max - min)) * innerH;
  const ticks = [max, (max + min) / 2, min];
  const labelIdx = points.length <= 1 ? [0] : [0, points.length - 1];

  return (
    <View onLayout={onLayout} style={{ height }}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          {ticks.map((t, i) => (
            <Line key={i} x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} stroke={colors.border} strokeDasharray="4 4" />
          ))}
          {ticks.map((t, i) => (
            <SvgText key={`t${i}`} x={padL - 6} y={y(t) + 4} fontSize={11} fill={colors.muted} textAnchor="end">
              {format(t)}
            </SvgText>
          ))}
          {goal != null ? <Line x1={padL} x2={width - padR} y1={y(goal)} y2={y(goal)} stroke={colors.accent} strokeWidth={1.5} /> : null}
          <Polyline points={points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ")} fill="none" stroke={colors.text} strokeWidth={2.5} />
          {points.map((p, i) => (
            <Circle key={i} cx={x(i)} cy={y(p.value)} r={3.5} fill={colors.card} stroke={colors.text} strokeWidth={2} />
          ))}
          {labelIdx.map((i) => (
            <SvgText key={`l${i}`} x={x(i)} y={height - 4} fontSize={11} fill={colors.muted} textAnchor={points.length === 1 ? "middle" : i === 0 ? "start" : "end"}>
              {points[i].label}
            </SvgText>
          ))}
        </Svg>
      ) : null}
    </View>
  );
}

export function BarChart({ bars, goal, height = 170 }: { bars: { label: string; value: number }[]; goal: number; height?: number }) {
  const [width, onLayout] = useWidth();
  const max = Math.max(goal * 1.2, ...bars.map((b) => b.value), 1);
  const padB = 20;
  const innerH = height - padB;
  const slot = width / Math.max(1, bars.length);
  const barW = Math.min(28, slot * 0.55);
  const y = (v: number) => innerH - (v / max) * innerH;
  return (
    <View onLayout={onLayout} style={{ height }}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Line x1={0} x2={width} y1={y(goal)} y2={y(goal)} stroke={colors.accent} strokeDasharray="5 4" strokeWidth={1.5} />
          {bars.map((b, i) => {
            const h = innerH - y(b.value);
            const cx = slot * i + slot / 2;
            return (
              <Rect
                key={i}
                x={cx - barW / 2}
                y={y(b.value)}
                width={barW}
                height={Math.max(0, h)}
                rx={6}
                fill={b.value > goal ? colors.danger : colors.text}
              />
            );
          })}
          {bars.map((b, i) => (
            <SvgText key={`l${i}`} x={slot * i + slot / 2} y={height - 4} fontSize={11} fill={colors.muted} textAnchor="middle">
              {b.label}
            </SvgText>
          ))}
        </Svg>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  empty: { color: colors.muted, textAlign: "center", paddingVertical: 30 },
});
