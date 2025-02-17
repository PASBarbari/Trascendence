import * as THREE from "three";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { Group, remove } from "three/addons/libs/tween.module.js";
import { state } from "./state.js";
import * as IA from "./ai.js";
import * as UTILS from "./utils.js";
import * as SETUP from "./setup.js";
import * as SETTINGS from "./settings.js";
import * as UP from "./powerups.js";
import { initializeWebSocket } from "./serverSide.js";

let previousTimestamp = 0;
const timeStep = 1000 / 60;

export const animate = (timestamp) => {
  state.stats.begin();
  requestAnimationFrame(animate);
  const deltaTime = timestamp - previousTimestamp;
  if (deltaTime >= timeStep) {
    previousTimestamp = timestamp;
    if (!state.isPaused) {
      if (UTILS.p1IsHit()) {
        state.hit_position = state.ball.position.y - state.p1.position.y;
        state.wallHitPosition = 0;
        state.angle =
          (state.hit_position / (state.player.y)) * -90;
        if (state.ball_speed < 5 * state.player.h) state.ball_speed += 0.10;
      } else if (UTILS.p2IsHit()) {
        state.hit_position = state.ball.position.y - state.p2.position.y;
        state.wallHitPosition = 0;
        state.angle =
          180 + (state.hit_position / (state.player.y)) * 90;
        if (state.ball_speed < 5 * state.player.h) state.ball_speed += 0.10;
      } else if (
        (state.wallHitPosition <= 0 &&
          state.ball.position.y + state.ball_radius + state.ball_speed >=
            state.ring.x / 2) ||
        (state.wallHitPosition >= 0 &&
          state.ball.position.y - state.ball_radius - state.ball_speed <=
            -state.ring.x / 2)
      ) {
        state.wallHitPosition = state.ball.position.y;
        state.angle *= -1;
      } else if (
        state.ball.position.x - state.ball_radius <
        state.r_left.position.x + state.ring.h
      ) {
        console.log("p2 ha segnato");
        state.p2_score += 1;
        UTILS.score();
      } else if (
        state.ball.position.x + state.ball_radius >
        state.r_right.position.x - state.ring.h
      ) {
        console.log("p1 ha segnato");
        state.p1_score += 1;
        UTILS.score();
      }
      state.ball.position.y +=
        state.ball_speed * -Math.sin((state.angle * Math.PI) / 180);
      state.ball.position.x +=
        state.ball_speed * Math.cos((state.angle * Math.PI) / 180);
      if (
        (state.p1_move_y > 0 &&
          state.p1.position.y + state.player.y / 2 <=
            state.ring.x / 2 - state.ring.h / 2) ||
        (state.p1_move_y < 0 &&
          state.p1.position.y - state.player.y / 2 >=
            -state.ring.x / 2 + state.ring.h / 2)
      )
        state.p1.position.y += state.p1_move_y;
      if (state.IAisActive) IA.moveIA();
      if (
        (state.p2_move_y > 0 &&
          state.p2.position.y + state.player.y / 2 <=
            state.ring.x / 2 - state.ring.h / 2) ||
        (state.p2_move_y < 0 &&
          state.p2.position.y - state.player.y / 2 >=
            -state.ring.x / 2 + state.ring.h / 2)
      )
        state.p2.position.y += state.p2_move_y;
      if (
        state.spawnPowerUpFlag &&
        timestamp - state.lastPowerUpSpawnTime > state.powerUpInterval &&
        state.powerUps.length < 10
      ) {
        UP.spawnPowerUp();
        state.lastPowerUpSpawnTime = timestamp;
      }

      // Handle power-up collisions
      UP.handlePowerUpCollision();
    }

    state.renderer.render(state.scene, state.camera);
    state.stats.end();
  }
};

initializeWebSocket();
