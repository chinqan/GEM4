import { PixiStory } from '@pixi/storybook-renderer';
import type { StoryContext } from '@pixi/storybook-renderer';
declare const args: {
    fontColor: string;
    min: number;
    max: number;
    value1: number;
    value2: number;
    fontSize: number;
    showValue: boolean;
    width: number;
    height: number;
    onChange: import("@storybook/addon-actions").HandlerFunction;
};
type Args = typeof args;
export declare const Double: {
    render: (args: Args, ctx: StoryContext) => PixiStory<unknown>;
};
declare const _default: {
    title: string;
    argTypes: any;
    args: any;
};
export default _default;
//# sourceMappingURL=DoubleSliderNineSliceSprite.stories.d.ts.map