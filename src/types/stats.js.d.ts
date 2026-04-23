// Type declaration for stats.js (no @types package available)
declare module 'stats.js' {
  class Stats {
    dom: HTMLDivElement;
    begin(): void;
    end(): void;
    update(): void;
    showPanel(id: number): void;
  }
  export default Stats;
}
