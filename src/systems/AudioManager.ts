import Phaser from "phaser";

/** Audio sintetis supaya proyek langsung berjalan tanpa file audio eksternal. */
export default class AudioManager {
  private context: AudioContext | null = null;
  private timer?: Phaser.Time.TimerEvent;
  private step = 0;
  private muted = false;

  constructor(private readonly scene: Phaser.Scene) {}

  startMusic(): void {
    if (this.timer) return;
    try {
      this.context ??= new AudioContext();
      void this.context.resume();
      this.timer = this.scene.time.addEvent({
        delay: 220,
        loop: true,
        callback: () => this.playMusicStep(),
      });
    } catch (error) {
      console.warn("Audio tidak tersedia di browser ini.", error);
    }
  }

  stopMusic(): void {
    this.timer?.remove(false);
    this.timer = undefined;
  }

  playCoin(): void {
    this.tone(880, 0.08, 0.1);
    this.scene.time.delayedCall(65, () => this.tone(1320, 0.12, 0.08));
  }

  playBomb(): void {
    this.tone(110, 0.22, 0.16, "sawtooth");
    this.tone(65, 0.3, 0.12, "triangle");
  }

  playLifeLost(): void {
    this.tone(330, 0.12, 0.08);
    this.scene.time.delayedCall(100, () => this.tone(220, 0.2, 0.08));
  }

  playGameOver(): void {
    [392, 330, 262, 196].forEach((note, index) => {
      this.scene.time.delayedCall(index * 180, () => this.tone(note, 0.24, 0.1));
    });
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  destroy(): void {
    this.stopMusic();
    if (this.context) void this.context.close();
    this.context = null;
  }

  private playMusicStep(): void {
    const melody = [523, 659, 784, 659, 587, 698, 880, 698, 523, 659, 784, 1047, 880, 784, 659, 587];
    this.tone(melody[this.step % melody.length], 0.16, 0.025);
    if (this.step % 4 === 0) {
      const bass = [131, 147, 165, 147][Math.floor(this.step / 4) % 4];
      this.tone(bass, 0.28, 0.045, "triangle");
    }
    this.step += 1;
  }

  private tone(
    frequency: number,
    duration: number,
    volume: number,
    type: OscillatorType = "square",
  ): void {
    if (this.muted || !this.context || this.context.state !== "running") return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(volume, 0.0002), now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }
}
