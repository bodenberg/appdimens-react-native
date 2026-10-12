// Minimal react-native stub used by the smoke test of the compiled package.
'use strict';
const win = {width: 411, height: 914, scale: 2.625, fontScale: 1};
exports.Dimensions = {get: () => ({...win}), addEventListener: () => ({remove() {}})};
exports.PixelRatio = {get: () => win.scale, getFontScale: () => win.fontScale};
exports.AppState = {addEventListener: () => ({remove() {}})};
exports.Platform = {OS: 'android', isTV: false, select: o => o.android ?? o.default};
exports.StyleSheet = {create: s => s};
exports.View = () => null;
exports.Text = () => null;
