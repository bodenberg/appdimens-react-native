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

export default function App() {
  const styles = useStyles();
  return (
    <AppDimensProvider>
      <ScrollView contentContainerStyle={styles.screen}>
        <MetricsCard />
        <StrategiesCard />
        <ResizeCard />
      </ScrollView>
    </AppDimensProvider>
  );
}
