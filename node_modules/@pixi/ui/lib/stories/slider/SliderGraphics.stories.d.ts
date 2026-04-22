import { PixiStory } from '@pixi/storybook-renderer';
import type { StoryContext } from '@pixi/storybook-renderer';
declare const args: {
    meshColor: string;
    fillColor: string;
    borderColor: string;
    backgroundColor: string;
    fontColor: string;
    min: number;
    max: number;
    step: number;
    value: number;
    width: number;
    height: number;
    radius: number;
    fontSize: number;
    border: number;
    handleBorder: number;
    showValue: boolean;
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
//# sourceMappingURL=SliderGraphics.stories.d.ts.map