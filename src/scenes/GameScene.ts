import Phaser from "phaser";
import { GAME_CONFIG } from "../config/gameConfig";
import Player from "../entities/Player";
import FallingObject from "../entities/FallingObject";
import AudioManager from "../systems/AudioManager";
import LevelManager from "../systems/LevelManager";
import type { FallingObjectType } from "../types/game";

type PowerType = "double" | "magnet" | "shield" | "life";

export default class GameScene extends Phaser.Scene {
  private player!: Player;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { A: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private objects: FallingObject[] = [];
  private scoreText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private powerText!: Phaser.GameObjects.Text;
  private score = 0;
  private lives = 3;
  private spawnTimer = 0;
  private powerSpawnTimer = 0;
  private gameOver = false;
  private mobileDir = 0;
  private powerUiTimer = 0;
  private audio!: AudioManager;
  private levels = new LevelManager();
  private magnetCharges = 0;
  private shieldCharges = 0;
  private magnetUntil = 0;
  private shieldUntil = 0;
  private doubleUntil = 0;
  private hearts: Phaser.GameObjects.Image[] = [];
  private powerAura!: Phaser.GameObjects.Graphics;

  constructor() {
    super("GameScene");
  }
  preload(): void {
    this.load.image("player", "/assets/images/player.png");
    this.load.image("coin", "/assets/images/coin.png");
    this.load.image("bomb", "/assets/images/bomb.png");
    this.load.image("arena-background", "/assets/images/background-arena.png");
    this.load.image("heart", "/assets/images/heart.png");
    this.load.image("power-magnet", "/assets/images/power-magnet.png");
    this.load.image("power-shield", "/assets/images/power-shield.png");
    this.load.image("power-life", "/assets/images/power-life.png");
    this.load.image("power-double", "/assets/images/power-double.png");
  }
  create(): void {
    this.score = 0;
    this.lives = 3;
    this.spawnTimer = 0;
    this.powerSpawnTimer = 0;
    this.gameOver = false;
    this.mobileDir = 0;
    this.powerUiTimer = 0;
    this.objects = [];
    this.magnetCharges = 0;
    this.shieldCharges = 0;
    this.magnetUntil = 0;
    this.shieldUntil = 0;
    this.doubleUntil = 0;
    this.add
      .rectangle(400, 260, 548, 318, 0x07101f, 0.78)
      .setStrokeStyle(1, 0x8be9ff, 0.24)
      .setDepth(-3);
    this.add
      .image(400, 260, "arena-background")
      .setDisplaySize(520, 300)
      .setDepth(-2)
      .setAlpha(0.98);
    this.drawArena();
    this.createHud();
    this.setupKeyboard();
    this.player = new Player(this);
    this.powerAura = this.add.graphics().setDepth(1);
    this.audio = new AudioManager(this);
    this.input.once("pointerdown", () => this.audio.startMusic());
    this.input.keyboard?.once("keydown", () => this.audio.startMusic());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.audio.destroy());
    this.game.events.on("use-power", this.usePower, this);
    this.game.events.on("quit-game", this.quitGame, this);
    this.game.events.on("mobile-move", this.setMobileDir, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off("use-power", this.usePower, this);
      this.game.events.off("quit-game", this.quitGame, this);
      this.game.events.off("mobile-move", this.setMobileDir, this);
    });
    this.add
      .text(400, 432, "A / D atau ← / → bergerak · M magnet · I kebal", {
        fontFamily: "Arial",
        fontSize: "11px",
        color: "#ffffff",
        stroke: "#082044",
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.updatePowerCounts();
  }
  update(_time: number, delta: number): void {
    if (this.gameOver) return;
    const sec = delta / 1000;
    let dir = this.mobileDir;
    if (this.cursors.left.isDown || this.wasd.A.isDown) dir--;
    if (this.cursors.right.isDown || this.wasd.D.isDown) dir++;
    dir = Phaser.Math.Clamp(dir, -1, 1);
    this.player.move(dir, this.levels.getPlayerSpeed(this.score), sec);
    const now = this.time.now;
    this.drawPowerAura(now);
    if (this.magnetUntil > now) {
      for (const o of this.objects)
        if (o.type === "coin") {
          const dx = this.player.x - o.sprite.x,
            dy = this.player.y - o.sprite.y,
            dist = Math.hypot(dx, dy);
          if (dist < 240) {
            o.sprite.x += (dx / dist) * Math.min(520 * sec, dist);
            o.sprite.y += (dy / dist) * Math.min(520 * sec, dist);
          }
        }
    }
    this.spawnTimer += delta;
    if (this.spawnTimer >= this.levels.getSpawnInterval(this.score)) {
      this.spawnTimer -= this.levels.getSpawnInterval(this.score);
      this.spawnFallingObject();
    }
    this.powerSpawnTimer += delta;
    if (this.powerSpawnTimer > 6500) {
      this.powerSpawnTimer = 0;
      if (Phaser.Math.Between(1, 100) <= 72) this.spawnPower();
    }
    for (let i = this.objects.length - 1; i >= 0; i--) {
      const o = this.objects[i];
      o.update(sec);
      if (this.checkCollision(o)) {
        if (o.type === "coin") this.collectCoin(o);
        else if (now >= this.shieldUntil) this.hitBomb(o);
        o.destroy();
        this.objects.splice(i, 1);
        continue;
      }
      if (o.sprite.y > GAME_CONFIG.arena.bottom + 25) {
        o.destroy();
        this.objects.splice(i, 1);
        if (o.type === "coin" && now >= this.shieldUntil) this.loseLife();
      }
    }
    if (now > this.magnetUntil && this.magnetUntil !== 0) {
      this.magnetUntil = 0;
      this.updatePowerText();
    }
    if (now > this.shieldUntil && this.shieldUntil !== 0) {
      this.shieldUntil = 0;
      this.updatePowerText();
    }
    if (now > this.doubleUntil) this.doubleUntil = 0;
    this.powerUiTimer += delta;
    if (this.powerUiTimer >= 100) {
      this.powerUiTimer = 0;
      this.updatePowerText();
      this.emitPowerStatus();
    }
  }
  private drawArena(): void {
    const a = GAME_CONFIG.arena;
    this.add.rectangle(400, 68, 768, 2, 0x8be9ff, 0.8);
    this.add.rectangle(
      a.left,
      (a.top + a.bottom) / 2,
      3,
      a.bottom - a.top,
      0x7dd3fc,
      0.8,
    );
    this.add.rectangle(
      a.right,
      (a.top + a.bottom) / 2,
      3,
      a.bottom - a.top,
      0x7dd3fc,
      0.8,
    );
    this.add.rectangle(400, a.bottom, a.right - a.left, 3, 0x67e8f9);
  }
  private createHud(): void {
    this.scoreText = this.add.text(24, 44, "SKOR: 0", {
      fontFamily: "Arial",
      fontSize: "16px",
      color: "#fde047",
      fontStyle: "bold",
      stroke: "#082044",
      strokeThickness: 3,
    });
    this.livesText = this.add
      .text(776, 40, "", {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#f87171",
        fontStyle: "bold",
      })
      .setOrigin(1, 0);
    this.levelText = this.add
      .text(400, 46, "LEVEL: 1 - MUDAH", {
        fontFamily: "Arial",
        fontSize: "13px",
        color: "#ffffff",
        fontStyle: "bold",
        stroke: "#082044",
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0);
    this.powerText = this.add
      .text(400, 78, "", {
        fontFamily: "Arial",
        fontSize: "12px",
        color: "#ffffff",
        fontStyle: "bold",
        stroke: "#082044",
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0);
    this.drawHearts();
  }
  private drawHearts(): void {
    this.hearts.forEach((h) => h.destroy());
    this.hearts = [];
    for (let i = 0; i < this.lives; i++)
      this.hearts.push(
        this.add
          .image(30 + i * 27, 22, "heart")
          .setDisplaySize(22, 22)
          .setDepth(4),
      );
    this.livesText.setText(`× ${this.lives}`).setPosition(776, 20);
  }
  private setMobileDir = (dir: number): void => {
    this.mobileDir = dir;
  };
  private setupKeyboard(): void {
    if (!this.input.keyboard) throw new Error("Keyboard input tidak tersedia.");
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = {
      A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A, false),
      D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D, false),
    };
    this.input.keyboard
      .addKey(Phaser.Input.Keyboard.KeyCodes.M)
      .on("down", () => this.usePower("magnet"));
    this.input.keyboard
      .addKey(Phaser.Input.Keyboard.KeyCodes.I)
      .on("down", () => this.usePower("shield"));
  }
  private spawnFallingObject(): void {
    const type: FallingObjectType =
      Phaser.Math.Between(1, 100) <= this.levels.getBombChance(this.score)
        ? "bomb"
        : "coin";
    const x = Phaser.Math.Between(
      GAME_CONFIG.arena.left + 18,
      GAME_CONFIG.arena.right - 18,
    );
    this.objects.push(
      new FallingObject(
        this,
        x,
        GAME_CONFIG.arena.top + 18,
        type,
        this.levels.getFallSpeed(this.score, type),
      ),
    );
  }
  private spawnPower(): void {
    const roll = Phaser.Math.Between(1, 100);
    const type: PowerType =
      roll <= 16
        ? "life"
        : roll <= 44
          ? "double"
          : roll <= 72
            ? "magnet"
            : "shield";
    const texture: Record<PowerType, string> = {
      double: "power-double",
      magnet: "power-magnet",
      shield: "power-shield",
      life: "power-life",
    };
    const x = Phaser.Math.Between(
      GAME_CONFIG.arena.left + 24,
      GAME_CONFIG.arena.right - 24,
    );
    const icon = this.add
      .image(x, GAME_CONFIG.arena.top + 10, texture[type])
      .setDisplaySize(30, 30)
      .setDepth(3);
    const glow = this.add
      .circle(x, icon.y, 19, 0x7dd3fc, 0.16)
      .setStrokeStyle(2, 0xffffff, 0.8)
      .setDepth(2);
    const fall = this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        if (this.gameOver || !icon.active) {
          fall.remove();
          glow.destroy();
          return;
        }
        icon.y += 2;
        glow.y = icon.y;
        if (icon.y > GAME_CONFIG.arena.bottom + 20) {
          icon.destroy();
          glow.destroy();
          fall.remove();
          return;
        }
        if (
          Math.abs(x - this.player.x) < 39 &&
          Math.abs(icon.y - this.player.y) < 31
        ) {
          if (type === "life") {
            this.lives = Math.min(5, this.lives + 1);
            this.drawHearts();
          } else if (type === "double") this.doubleUntil = this.time.now + 8000;
          else if (type === "magnet") this.magnetCharges++;
          else this.shieldCharges++;
          this.showPickupEffect(x, icon.y, type);
          this.updatePowerCounts();
          icon.destroy();
          glow.destroy();
          fall.remove();
        }
      },
    });
  }
  private showPickupEffect(x: number, y: number, type: PowerType): void {
    const color: Record<PowerType, number> = {
      double: 0xfacc15,
      magnet: 0xf472b6,
      shield: 0x60a5fa,
      life: 0xfb7185,
    };
    const ring = this.add
      .circle(x, y, 10, color[type], 0.18)
      .setStrokeStyle(3, color[type], 1)
      .setDepth(8);
    this.tweens.add({
      targets: ring,
      radius: 42,
      alpha: 0,
      duration: 420,
      ease: "Cubic.Out",
      onComplete: () => ring.destroy(),
    });
    const title: Record<PowerType, string> = {
      double: "DOUBLE COIN",
      magnet: "MAGNET +1",
      shield: "KEBAL +1",
      life: "NYAWA +1",
    };
    const text = this.add
      .text(x, y - 12, title[type], {
        fontFamily: "Arial",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "#071329",
        strokeThickness: 4,
        backgroundColor: "#172554",
      })
      .setPadding(6, 3)
      .setOrigin(0.5)
      .setDepth(9);
    this.tweens.add({
      targets: text,
      y: y - 48,
      alpha: 0,
      duration: 850,
      ease: "Cubic.Out",
      onComplete: () => text.destroy(),
    });
  }
  private drawPowerAura(now: number): void {
    if (!this.powerAura || !this.player) return;
    this.powerAura.clear();
    if (now < this.magnetUntil) {
      this.powerAura.lineStyle(3, 0xf472b6, 0.8);
      this.powerAura.strokeCircle(this.player.x, this.player.y, 43);
      this.powerAura.lineStyle(1, 0xfbcfe8, 0.45);
      this.powerAura.strokeCircle(this.player.x, this.player.y, 52);
    }
    if (now < this.shieldUntil) {
      this.powerAura.lineStyle(3, 0x60a5fa, 0.9);
      this.powerAura.strokeCircle(this.player.x, this.player.y, 38);
      this.powerAura.lineStyle(2, 0xbfdbfe, 0.55);
      this.powerAura.strokeCircle(this.player.x, this.player.y, 47);
    }
  }
  private checkCollision(o: FallingObject): boolean {
    const dx = Math.abs(o.sprite.x - this.player.x),
      dy = o.sprite.y - this.player.y,
      r = o.type === "coin" ? 12 : 14,
      nx = Phaser.Math.Clamp(dx, 0, 36),
      ny = Phaser.Math.Clamp(dy, -18, 12),
      xx = dx - nx,
      yy = dy - ny;
    return xx * xx + yy * yy <= r * r;
  }
  private collectCoin(o: FallingObject): void {
    const points = this.time.now < this.doubleUntil ? 2 : 1;
    this.score += points;
    this.scoreText.setText(`SKOR: ${this.score}`);
    this.updateLevelText();
    this.audio.playCoin();
    const pop = this.add
      .text(o.sprite.x, o.sprite.y, `+${points}`, {
        fontSize: "18px",
        fontStyle: "bold",
        color: "#fde047",
        stroke: "#082044",
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: pop,
      y: pop.y - 30,
      alpha: 0,
      duration: 450,
      onComplete: () => pop.destroy(),
    });
  }
  private hitBomb(_o: FallingObject): void {
    if (this.time.now < this.shieldUntil) return;
    this.audio.playBomb();
    this.loseLife();
  }
  private loseLife(): void {
    if (this.gameOver) return;
    this.lives--;
    this.drawHearts();
    this.cameras.main.shake(150, 0.004);
    if (this.lives <= 0) this.endGame();
    else this.audio.playLifeLost();
  }
  private updateLevelText(): void {
    this.levelText.setText(
      `LEVEL: ${this.levels.getLevel(this.score)} - ${this.levels.getName(this.score)}`,
    );
  }
  private updatePowerCounts(): void {
    this.game.events.emit(
      "power-counts",
      this.magnetCharges,
      this.shieldCharges,
    );
    this.updatePowerText();
    this.emitPowerStatus();
  }
  private emitPowerStatus(): void {
    const now = this.time.now;
    this.game.events.emit("power-status", {
      magnetCharges: this.magnetCharges,
      shieldCharges: this.shieldCharges,
      magnetSeconds: Math.max(0, Math.ceil((this.magnetUntil - now) / 1000)),
      shieldSeconds: Math.max(0, Math.ceil((this.shieldUntil - now) / 1000)),
      doubleSeconds: Math.max(0, Math.ceil((this.doubleUntil - now) / 1000)),
    });
  }
  private updatePowerText(): void {
    const now = this.time.now;
    const active: string[] = [];
    if (now < this.magnetUntil)
      active.push(
        `MAGNET ${Math.max(1, Math.ceil((this.magnetUntil - now) / 1000))}s`,
      );
    if (now < this.shieldUntil)
      active.push(
        `KEBAL ${Math.max(1, Math.ceil((this.shieldUntil - now) / 1000))}s`,
      );
    if (now < this.doubleUntil)
      active.push(
        `DOUBLE COIN ${Math.max(1, Math.ceil((this.doubleUntil - now) / 1000))}s`,
      );
    this.powerText.setText(active.join("   |   ") || "Ambil spell yang jatuh");
  }
  private usePower = (which: string): void => {
    if (this.gameOver) return;
    if (
      which === "magnet" &&
      this.magnetCharges > 0 &&
      this.time.now >= this.magnetUntil
    ) {
      this.magnetCharges--;
      this.magnetUntil = this.time.now + 5000;
    } else if (
      which === "shield" &&
      this.shieldCharges > 0 &&
      this.time.now >= this.shieldUntil
    ) {
      this.shieldCharges--;
      this.shieldUntil = this.time.now + 5000;
    } else return;
    this.updatePowerCounts();
  };
  private quitGame = (): void => {
    if (!this.gameOver) this.endGame();
  };
  private endGame(): void {
    if (this.gameOver) return;
    this.gameOver = true;
    this.audio.stopMusic();
    this.audio.playGameOver();
    this.game.events.emit("game-over", this.score);
  }
}
