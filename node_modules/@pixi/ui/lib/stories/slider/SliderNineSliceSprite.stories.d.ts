import { PixiStory } from '@pixi/storybook-renderer';
import type { StoryContext } from '@pixi/storybook-renderer';
declare const args: {
    fontColor: string;
    min: number;
    max: number;
    step: number;
    value: number;
    fontSize: number;
    showValue: boolean;
    width: number;
    height: number;
    onChange: import("@storybook/addon-actions").HandlerFunction;
};
type Args = typeof args;
export declare const Single: {
    render: (args: Args, ctx: StoryContext) => PixiStory<unknown>;
};
declare const _default: {
    title: string;
    argTypes: any;
    args: any;
};
export default _default;
//# sourceMappingURL=SliderNineSliceSprite.stories.d.ts.map