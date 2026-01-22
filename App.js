import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, PanResponder, Animated, Easing, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { registerRootComponent } from 'expo';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const App = () => {
  const [gameState, setGameState] = useState('START');
  const [score, setScore] = useState(20);

  // プレイヤーの座標（Animatedで管理してGPUに送る）
  const playerPos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const playerRadius = useRef(new Animated.Value(20)).current;
  
  // 速度データ（物理計算用）
  const velocity = useRef({ x: 0, y: 0 });
  
  // 星のデータ
  const [stars, setStars] = useState([]);
  const starsRef = useRef([]);

  // ゲームループ
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    let frame;
    const update = () => {
      // 1. 速度を座標に反映
      const currentPos = playerPos.__getValue();
      playerPos.setValue({
        x: currentPos.x + velocity.current.x,
        y: currentPos.y + velocity.current.y
      });

      // 2. 衝突判定（5フレームに1回程度に間引くとさらに軽い）
      checkCollisions(currentPos);

      frame = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(frame);
  }, [gameState]);

  const checkCollisions = (pos) => {
    const currentRadius = playerRadius.__getValue();
    let hit = false;

    starsRef.current = starsRef.current.filter(star => {
      const dx = pos.x - star.x;
      const dy = pos.y - star.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < currentRadius + star.radius) {
        if (currentRadius > star.radius) {
          const newR = currentRadius + 1;
          playerRadius.setValue(newR);
          setScore(Math.floor(newR));
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          hit = true;
          return false;
        }
      }
      return dist < SCREEN_WIDTH * 3; // 遠すぎる星を削除
    });

    if (hit || starsRef.current.length < 30) {
      spawnStars(pos);
    }
  };

  const spawnStars = (pos) => {
    const newStars = [...starsRef.current];
    while (newStars.length < 50) {
      const angle = Math.random() * Math.PI * 2;
      const dist = SCREEN_WIDTH + Math.random() * SCREEN_WIDTH;
      newStars.push({
        id: Math.random().toString(),
        x: pos.x + Math.cos(angle) * dist,
        y: pos.y + Math.sin(angle) * dist,
        radius: Math.random() * 12 + 4,
        color: ['#00F2FF', '#0072FF', '#FFFFFF', '#FF00DE'][Math.floor(Math.random() * 4)]
      });
    }
    starsRef.current = newStars;
    setStars(newStars);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, g) => {
        velocity.current = { x: g.dx * 0.05, y: g.dy * 0.05 };
      },
      onPanResponderRelease: () => {
        // 離すと徐々に減速（慣性）
        const slowDown = () => {
          velocity.current.x *= 0.95;
          velocity.current.y *= 0.95;
          if (Math.abs(velocity.current.x) > 0.1) requestAnimationFrame(slowDown);
        };
        slowDown();
      }
    })
  ).current;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <StatusBar style="light" />

      {gameState === 'PLAYING' && (
        <Animated.View style={{
          flex: 1,
          transform: [
            { translateX: Animated.multiply(playerPos.x, -1) },
            { translateY: Animated.multiply(playerPos.y, -1) },
            { translateX: SCREEN_WIDTH / 2 },
            { translateY: SCREEN_HEIGHT / 2 },
          ]
        }}>
          {stars.map(star => (
            <View key={star.id} style={[styles.star, {
              left: star.x,
              top: star.y,
              width: star.radius * 2,
              height: star.radius * 2,
              borderRadius: star.radius,
              backgroundColor: star.color,
              shadowColor: star.color,
              shadowOpacity: 0.5,
              shadowRadius: 5,
            }]} />
          ))}

          <Animated.View style={[styles.player, {
            left: playerPos.x,
            top: playerPos.y,
            width: Animated.multiply(playerRadius, 2),
            height: Animated.multiply(playerRadius, 2),
            borderRadius: playerRadius,
            transform: [
              { translateX: Animated.multiply(playerRadius, -1) },
              { translateY: Animated.multiply(playerRadius, -1) },
            ]
          }]} />
        </Animated.View>
      )}

      <View style={styles.ui}>
        <Text style={styles.score}>CORE: {score}</Text>
      </View>

      {gameState === 'START' && (
        <View style={styles.menu}>
          <Text style={styles.title}>COSMIC CRUSH</Text>
          <TouchableOpacity onPress={() => setGameState('PLAYING')} style={styles.btn}>
            <Text style={styles.btnText}>ENTER ABYSS</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020205' },
  star: { position: 'absolute' },
  player: {
    position: 'absolute',
    backgroundColor: '#FFF',
    borderWidth: 3,
    borderColor: '#00F2FF',
    shadowColor: '#00F2FF',
    shadowRadius: 15,
    shadowOpacity: 0.9,
  },
  ui: { position: 'absolute', top: 60, left: 30 },
  score: { color: '#00F2FF', fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  menu: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  title: { fontSize: 40, color: '#FFF', fontWeight: '900', marginBottom: 30 },
  btn: { padding: 20, backgroundColor: '#00F2FF', borderRadius: 5 },
  btnText: { fontWeight: 'bold', fontSize: 20 }
});

registerRootComponent(App);