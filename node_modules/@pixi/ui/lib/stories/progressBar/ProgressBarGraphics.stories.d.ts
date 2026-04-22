import { PixiStory } from '@pixi/storybook-renderer';
import type { StoryContext } from '@pixi/storybook-renderer';
declare const args: {
    fillColor: string;
    borderColor: string;
    backgroundColor: string;
    value: number;
    width: number;
    height: number;
    radius: number;
    border: number;
    animate: boolean;
    vertical: boolean;
};
type Args = typeof args;
export declare const UseGraphics: {
    render: (args: Args, ctx: StoryContext) => PixiStory<unknown>;
};
declare const _default: {
    title: string;
    argTypes: any;
    args: any;
};
export default _default;
//# sourceMappingURL=ProgressBarGraphics.stories.d.ts.map