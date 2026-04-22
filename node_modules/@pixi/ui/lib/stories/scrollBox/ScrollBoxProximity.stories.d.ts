import { PixiStory } from '@pixi/storybook-renderer';
import type { StoryContext } from '@pixi/storybook-renderer';
declare const args: {
    proximityRange: number;
    proximityDebounce: number;
    width: number;
    height: number;
    radius: number;
    elementsMargin: number;
    elementsPadding: number;
    elementsWidth: number;
    elementsHeight: number;
    itemsAmount: number;
    type: ("vertical" | "horizontal" | "bidirectional" | null)[];
    fadeSpeed: number;
};
type Args = typeof args & {
    type: 'vertical' | 'horizontal' | 'bidirectional';
};
export declare const ProximityEvent: {
    render: (args: Args, ctx: StoryContext) => PixiStory<unknown>;
};
declare const _default: {
    title: string;
    argTypes: any;
    args: any;
};
export default _default;
//# sourceMappingURL=ScrollBoxProximity.stories.d.ts.map