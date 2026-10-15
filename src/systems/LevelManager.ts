import Phaser from "phaser";

export default class LevelManager {
  getLevel(score: number): number {
    if (score >= 50) return 4;
    if (score >= 25) return 3;
    if (score >= 10) return 2;
    return 1;
  }

  getName(score: number): string {
    const names: Record<number, string> = {
      1: "MUDAH",
      2: "SEDANG",
      3: "SULIT",
      4: "MAKSIMUM",
    };
    return names[this.getLevel(score)] ?? "MUDAH";
  }

  getPlayerSpeed(score: number): number {
    const level = this.getLevel(score);
    // Bertambah perlahan dari 450, tidak melampaui batas maksimum.
    return Math.min(570, 450 + (level - 1) * 20 + score * 0.8);
  }

  getSpawnInterval(score: number): number {
    const level = this.getLevel(score);
    return Math.max(450, 900 - (level - 1) * 100 - Math.min(score, 50) * 3);
  }

  getFallSpeed(score: number, type: "coin" | "bomb"): number {
    const level = this.getLevel(score);
    const base = type === "coin"
      ? Phaser.Math.Between(130, 190)
      : Phaser.Math.Between(170, 230);
    const multiplier = 1 + (level - 1) * 0.12 + Math.min(score, 50) * 0.002;
    return Math.min(330, base * multiplier);
  }

  getBombChance(score: number): number {
    // Mulai 20%, naik perlahan sampai 26% pada level maksimum.
    return 20 + (this.getLevel(score) - 1) * 2;
  }
}
