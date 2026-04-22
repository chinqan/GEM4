import { PixiStory } from '@pixi/storybook-renderer';
import type { StoryContext } from '@pixi/storybook-renderer';
declare const args: {
    backgroundColor: string;
    dropDownBackgroundColor: string;
    dropDownHoverColor: string;
    fontColor: string;
    fontSize: number;
    width: number;
    height: number;
    radius: number;
    itemsAmount: number;
    onSelect: import("@storybook/addon-actions").HandlerFunction;
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
//# sourceMappingURL=SelectGraphics.stories.d.ts.map