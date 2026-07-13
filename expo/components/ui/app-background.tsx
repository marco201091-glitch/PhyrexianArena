import { PropsWithChildren } from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';
import { backgroundArt, colors } from '@/constants/theme';

const backgroundImage = require('@/assets/app-background.png');

export function AppBackground({ children }: PropsWithChildren) {
  return (
    <View style={styles.root}>
      <ImageBackground
        source={backgroundImage}
        style={styles.image}
        imageStyle={styles.imageFocus}
        resizeMode="cover"
      >
        <View pointerEvents="none" style={styles.overlayStack}>
          <View style={styles.overlayBandTop} />
          <View style={styles.overlayBandMid} />
          <View style={styles.overlayBandBottom} />
        </View>
        {children}
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  image: {
    flex: 1,
  },
  imageFocus: {
    width: `${backgroundArt.scale * 100}%`,
    height: `${backgroundArt.scale * 100}%`,
    left: `${backgroundArt.offsetX * 100}%`,
    top: `${backgroundArt.offsetY * 100}%`,
  },
  overlayStack: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayBandTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: colors.overlayLight,
  },
  overlayBandMid: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: '15%',
    backgroundColor: colors.overlayMid,
  },
  overlayBandBottom: {
    position: 'absolute',
    top: '65%',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlayHeavy,
  },
});