import { LineCap } from 'pixi.js';
import { PixiStory } from '@pixi/storybook-renderer';
import type { StoryContext } from '@pixi/storybook-renderer';
declare const args: {
    backgroundColor: string;
    fillColor: string;
    radius: number;
    lineWidth: number;
    value: number;
    backgroundAlpha: number;
    fillAlpha: number;
    animate: boolean;
    cap: string[];
};
type Args = typeof args & {
    cap: LineCap;
};
export declare const circular: {
    render: (args: Args, ctx: StoryContext) => PixiStory<unknown>;
};
declare const _default: {
    title: string;
    argTypes: any;
    args: any;
};
export default _default;
//# sourceMappingURL=ProgressBarCircular.stories.d.ts.map