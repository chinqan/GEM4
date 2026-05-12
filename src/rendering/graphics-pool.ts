import { Container, Graphics } from 'pixi.js';

/**
 * Object pool for temporary Graphics objects used by visual effects.
 * Pre-allocates a fixed number of Graphics to avoid per-frame allocation.
 */
export class GraphicsPool {
  private readonly pool: Graphics[] = [];
  private readonly container: Container;
  private readonly capacity: number;

  constructor(parentContainer: Container, capacity = 16) {
    this.capacity = capacity;
    this.container = parentContainer;

    // Pre-allocate Graphics objects
    for (let i = 0; i < capacity; i++) {
      const g = new Graphics();
      g.visible = false;
      g.label = 'pooled-gfx';
      this.container.addChild(g);
      this.pool.push(g);
    }
  }

  /** Number of available Graphics in the pool */
  get available(): number {
    return this.pool.length;
  }

  /**
   * Acquire a cleared, visible Graphics from the pool.
   * If pool is exhausted, creates a non-pooled overflow Graphics.
   */
  acquire(): Graphics {
    let g = this.pool.pop();
    if (!g) {
      // Overflow: create non-pooled Graphics (caller must destroy on completion)
      g = new Graphics();
      g.label = 'overflow-gfx';
      this.container.addChild(g);
    }
    g.clear();
    g.visible = true;
    g.alpha = 1;
    return g;
  }

  /**
   * Return a Graphics to the pool.
   * Clears drawn content and hides it without destroying.
   * Overflow Graphics (not from pool) are destroyed instead.
   */
  release(g: Graphics): void {
    g.clear();
    g.visible = false;
    g.alpha = 1;

    if (this.pool.length < this.capacity) {
      this.pool.push(g);
    } else {
      // Overflow object — destroy it
      this.container.removeChild(g);
      g.destroy();
    }
  }

  /** Destroy all pooled Graphics and clean up */
  destroy(): void {
    for (const g of this.pool) {
      g.destroy();
    }
    this.pool.length = 0;
  }
}
