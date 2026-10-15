import Phaser from "phaser";
import type { FallingObjectType } from "../types/game";

export default class FallingObject {
  readonly sprite: Phaser.GameObjects.Image;
  readonly type: FallingObjectType;
  readonly speed: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    type: FallingObjectType,
    speed: number,
  ) {
    this.type = type;
    this.speed = speed;
    this.sprite = scene.add.image(x, y, type);
    this.sprite.setDisplaySize(type === "coin" ? 24 : 28, type === "coin" ? 24 : 28);
    this.sprite.setDepth(1);
  }

  update(deltaSeconds: number): void {
    this.sprite.y += this.speed * deltaSeconds;
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
