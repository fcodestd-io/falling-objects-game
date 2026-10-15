import Phaser from "phaser";
import { GAME_CONFIG } from "../config/gameConfig";

export default class Player {
  readonly sprite: Phaser.GameObjects.Image;

  constructor(private readonly scene: Phaser.Scene) {
    this.sprite = scene.add.image(
      GAME_CONFIG.width / 2,
      380,
      "player",
    );
    this.sprite.setDisplaySize(72, 45);
    this.sprite.setDepth(2);
  }

  move(direction: number, speed: number, deltaSeconds: number): void {
    this.sprite.x += direction * speed * deltaSeconds;
    this.sprite.x = Phaser.Math.Clamp(
      this.sprite.x,
      GAME_CONFIG.arena.left + GAME_CONFIG.player.halfWidth,
      GAME_CONFIG.arena.right - GAME_CONFIG.player.halfWidth,
    );
  }

  get x(): number {
    return this.sprite.x;
  }

  get y(): number {
    return this.sprite.y;
  }
}
