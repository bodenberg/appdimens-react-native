/**
 * AppDimens Dynamic for React Native — usage tour.
 *
 * Drop this file into any React Native / Expo app (after `npm i appdimens-react-native`) and
 * render <App />. Rotate the device, resize the window or change the font size to see every
 * value update. It is type-checked in CI (`npm run typecheck`).
 */
import React from 'react';
import {ScrollView, Text, View} from 'react-native';
import {
  AppDimensProvider,
  DpQualifier,
  DimenStyleSheet,
  Orientation,
  UiModeType,
  createDimenStyles,
  hdp,
  scaledDp,
  sdp,
  sdpRotate,
  sdpScreen,
  sem,
  ssp,
  useDimenMetrics,
  wdp,
} from '../src';
import {pwsdp, pwssp} from '../src/strategies/power';
import {fsdp} from '../src/strategies/fluid';
import {spaceW} from '../src/strategies/percent';
import {AutoResizeText, useAutoResizeSquareSize} from '../src/resize';
import {
  CustomPresets,
  CustomStrategyProvider,
  customScaleStrategy,
  defineCustomStrategy,
  useCustomStrategy,
} from '../src/custom';
import {mm} from '../src/units';

// 1) Styles computed once per window snapshot and shared by every component.
const useStyles = createDimenStyles(() => ({
  screen: {padding: sdp(16), gap: sdp(12)},
  card: {padding: sdp(12), borderRadius: sdp(12), backgroundColor: '#eef2ff'},
  title: {fontSize: ssp(20), fontWeight: '700' as const},
  body: {fontSize: ssp(14)},
}));

// 2) Token style sheets, if you prefer declaring units in strings.
const useTokens = DimenStyleSheet.create({
  badge: {paddingHorizontal: '8sdp', paddingVertical: '4hdp', borderRadius: '6sdp'},
  badgeText: {fontSize: '12ssp'},
});

// 3) Builders: declare once, read anywhere (Android `scaledDp().screen(...)`).
const avatar = scaledDp(48)
  .screen(UiModeType.TELEVISION, 96)
  .screen(DpQualifier.SMALL_WIDTH, 600, 72)
  .screen(Orientation.LANDSCAPE, 40);

function MetricsCard() {
  const m = useDimenMetrics(); // re-render on rotation / resize / font scale
  const styles = useStyles();
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Window</Text>
      <Text style={styles.body}>
        {m.screenWidthDp}×{m.screenHeightDp} dp · sw {m.smallestWidthDp} · {m.orientation} ·{' '}
        {m.uiModeType} · font ×{m.fontScale}
      </Text>
    </View>
  );
}

function StrategiesCard() {
  useDimenMetrics();
  const styles = useStyles();
  const rows: Array<[string, number]> = [
    ['sdp(16)', sdp(16)],
    ['hdp(16)', hdp(16)],
    ['wdp(16)', wdp(16)],
    ['pwsdp(16) power', pwsdp(16)],
    ['fsdp(16) fluid', fsdp(16)],
    ['spaceW(10) 10% width', spaceW(10)],
    ['mm(10) physical', mm(10)],
    ['sdpRotate(80, 50)', sdpRotate(80, 50)],
    [
      'sdpScreen(70,150,TV,sw,600)',
      sdpScreen(70, 150, UiModeType.TELEVISION, DpQualifier.SMALL_WIDTH, 600),
    ],
    ['avatar builder', avatar.sdp],
  ];
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Strategies</Text>
      {rows.map(([label, value]) => (
        <Text key={label} style={styles.body}>
          {label} = {value.toFixed(2)} dp
        </Text>
      ))}
      <Text style={{fontSize: pwssp(14)}}>pwssp(14) — power font</Text>
      <Text style={{fontSize: sem(14)}}>sem(14) — ignores the user font scale</Text>
    </View>
  );
}

function ResizeCard() {
  const styles = useStyles();
  const tokens = useTokens();
  const {size, onLayout} = useAutoResizeSquareSize({min: 24, max: 160, step: 4});
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Resize</Text>
      <AutoResizeText minSp={12} maxSp={32} maxLines={1} style={{fontWeight: '600'}}>
        A headline that always fits on one line
      </AutoResizeText>
      <View style={{height: hdp(120)}} onLayout={onLayout}>
        <View
          style={{width: size, height: size, backgroundColor: '#6366f1', borderRadius: sdp(8)}}
        />
      </View>
      <View style={[tokens.badge, {backgroundColor: '#c7d2fe', alignSelf: 'flex-start'}]}>
        <Text style={tokens.badgeText}>token styles</Text>
      </View>
    </View>
  );
}

// Your own strategy: same JSON shape on every AppDimens platform.
const brand = defineCustomStrategy({
  id: 'brand',
  reference: {width: 360, height: 640},
  curve: {type: 'power', exponent: 0.8},
  clamp: {min: 0.85, max: 1.6},
  fontScale: {max: 1.3},
  rules: [
    {
      name: 'large',
      when: {device: ['tablet', 'desktop']},
      set: {curve: {type: 'logarithmic', k: 0.4}},
    },
  ],
});

// Simplest forms: the formula is the value, or a factor computed in code.
const product = customScaleStrategy(({width, clamp}) => clamp(width / 360, 0.85, 1.8));

function CustomCard() {
  const styles = useStyles();
  const s = useCustomStrategy(); // brand, from CustomStrategyProvider
  const hud = useCustomStrategy(CustomPresets.GAME_HUD);
  const formula = useCustomStrategy('base * (tablet ? 0.9 : 1) * clamp(sw / 360, 0.85, 1.6)');
  const factor = useCustomStrategy(product);
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Custom strategy</Text>
      <Text style={{fontSize: s.sp(11)}}>{s.explain()}</Text>
      <View style={{flexDirection: 'row', gap: s.dp(8)}}>
        <View style={{width: s.dp(48), height: s.dp(48), backgroundColor: '#6a1b9a'}} />
        <View style={{width: hud.dp(48), height: hud.dp(48), backgroundColor: '#ab47bc'}} />
        <View style={{width: formula.dp(48), height: formula.dp(48), backgroundColor: '#ce93d8'}} />
        <View style={{width: factor.dp(48), height: factor.dp(48), backgroundColor: '#e1bee7'}} />
      </View>
    </View>
  );
}

export default function App() {
  const styles = useStyles();
  return (
    <AppDimensProvider>
      <ScrollView contentContainerStyle={styles.screen}>
        <MetricsCard />
        <StrategiesCard />
        <ResizeCard />
        <CustomStrategyProvider strategy={brand}>
          <CustomCard />
        </CustomStrategyProvider>
      </ScrollView>
    </AppDimensProvider>
  );
}
