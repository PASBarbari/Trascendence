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
import Ball from "./src/Ball.js";

const clock = new THREE.Clock();

export function animate() {
    const deltaTime = clock.getDelta();
    
    if (state.ball) {
        state.ball.update(deltaTime);
    }
    
    if (state.p1) {
        state.p1.move(state.p1_move_y);
    }
    
    if (state.p2) {
        state.p2.move(state.p2_move_y);
    }
    
    if (state.controls) {
        state.controls.update();
    }
    
    if (state.renderer && state.scene && state.camera) {
        state.renderer.render(state.scene, state.camera);
    }
    
    state.animationFrameId = requestAnimationFrame(animate);
}
